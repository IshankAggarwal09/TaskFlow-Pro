import React, { useState, useEffect } from 'react';
import KanbanBoard from './components/KanbanBoard';
import CreateTaskButton from './components/CreateTaskButton';
import { getBoard } from './services/api';

function App() {
  const [tasks, setTasks] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [criticalPathView, setCriticalPathView] = useState(false);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBoard();
      setTasks(data.tasks);
      setDependencies(data.dependencies);
    } catch (err) {
      setError('Failed to load board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const handleTaskUpdate = () => {
    fetchBoard();
  };

  const handleTaskCreate = () => {
    fetchBoard();
  };

  const handleTaskDelete = () => {
    fetchBoard();
  };

  const handleDependencyAdd = () => {
    fetchBoard();
  };

  const handleDependencyRemove = () => {
    fetchBoard();
  };

  // Critical path computation
  const computeCriticalPath = () => {
    if (tasks.length === 0) return [];
    
    const adj = {};
    const inDegree = {};
    const taskMap = {};
    
    tasks.forEach(t => {
      adj[t.id] = [];
      inDegree[t.id] = 0;
      taskMap[t.id] = t;
    });

    dependencies.forEach(dep => {
      if (adj[dep.predecessor_id]) {
        adj[dep.predecessor_id].push(dep.successor_id);
        if (inDegree[dep.successor_id] !== undefined) {
          inDegree[dep.successor_id]++;
        }
      }
    });

    const queue = [];
    const topo = [];
    Object.keys(inDegree).forEach(id => {
      if (inDegree[id] === 0) queue.push(id);
    });

    while (queue.length > 0) {
      const current = queue.shift();
      topo.push(current);
      if (adj[current]) {
        adj[current].forEach(succ => {
          inDegree[succ]--;
          if (inDegree[succ] === 0) queue.push(succ);
        });
      }
    }

    if (topo.length !== tasks.length) {
      return [];
    }

    const longest = {};
    const backtrack = {};
    
    topo.forEach(id => {
      const t = taskMap[id];
      const start = t.start_date ? new Date(t.start_date) : new Date();
      const end = t.end_date ? new Date(t.end_date) : start;
      const duration = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      longest[id] = duration;
      backtrack[id] = null;
    });

    topo.forEach(id => {
      if (adj[id]) {
        adj[id].forEach(succ => {
          const succT = taskMap[succ];
          const start = succT.start_date ? new Date(succT.start_date) : new Date();
          const end = succT.end_date ? new Date(succT.end_date) : start;
          const succDuration = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
            
          if (longest[id] + succDuration > longest[succ]) {
            longest[succ] = longest[id] + succDuration;
            backtrack[succ] = id;
          }
        });
      }
    });

    let maxLen = -1;
    let endNode = null;
    Object.keys(longest).forEach(id => {
      if (longest[id] > maxLen) {
        maxLen = longest[id];
        endNode = id;
      }
    });

    const cp = [];
    let curr = endNode;
    while (curr) {
      cp.push(curr);
      curr = backtrack[curr];
    }
    
    return cp.reverse();
  };

  const criticalPath = criticalPathView ? computeCriticalPath() : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <p className="text-xl mb-4">{error}</p>
        <button onClick={fetchBoard} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center z-10">
        <h1 className="text-2xl font-bold tracking-tight">TaskFlow Pro</h1>
        <button 
          onClick={() => setCriticalPathView(!criticalPathView)}
          className={`px-4 py-2 rounded font-medium transition-colors ${criticalPathView ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          Critical Path View {criticalPathView ? 'ON' : 'OFF'}
        </button>
      </header>

      <main className="flex-1 overflow-x-auto p-6">
        <KanbanBoard 
          tasks={tasks}
          dependencies={dependencies}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onDependencyAdd={handleDependencyAdd}
          onDependencyRemove={handleDependencyRemove}
          criticalPath={criticalPath}
        />
      </main>

      <CreateTaskButton onTaskCreate={handleTaskCreate} />
    </div>
  );
}

export default App;
