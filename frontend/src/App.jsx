import React, { useState, useEffect, useCallback } from 'react';
import KanbanColumn from './components/KanbanColumn';
import TaskModal from './components/TaskModal';
import AddTaskModal from './components/AddTaskModal';
import DagViewer from './components/DagViewer';
import { getTasks, getDependencies, moveTask } from './services/api';

const COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done'];

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [addingToColumn, setAddingToColumn] = useState(null);
  const [view, setView] = useState('board'); // 'board' | 'dag'
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [tasksRes, depsRes] = await Promise.all([getTasks(), getDependencies()]);
      setTasks(tasksRes.data);
      setDependencies(depsRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to connect to the backend. Make sure the server is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Group tasks by column, sorted by position
  const tasksByColumn = COLUMNS.reduce((acc, col) => {
    acc[col] = tasks
      .filter((t) => t.column_name === col)
      .filter((t) => {
        if (!searchQuery) return true;
        return (
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  // Augment tasks with dependency_count for display
  const tasksWithDepCount = tasks.map((task) => ({
    ...task,
    dependency_count: dependencies.filter(
      (d) => d.predecessor_id === task.id || d.successor_id === task.id
    ).length,
  }));

  const tasksByColumnWithDepCount = COLUMNS.reduce((acc, col) => {
    acc[col] = tasksWithDepCount
      .filter((t) => t.column_name === col)
      .filter((t) => {
        if (!searchQuery) return true;
        return (
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  // Drag & drop handlers
  const handleDragOver = (e, column) => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.column_name === targetColumn) return;

    // Optimistically update UI
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, column_name: targetColumn } : t))
    );

    try {
      const newPosition = tasksByColumn[targetColumn].length;
      await moveTask(taskId, { column_name: targetColumn, position: newPosition });
      await fetchAll();
    } catch (err) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, column_name: task.column_name } : t))
      );
      setError('Failed to move task. Please try again.');
    }
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleTaskDeleted = (deletedId) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
    setDependencies((prev) =>
      prev.filter((d) => d.predecessor_id !== deletedId && d.successor_id !== deletedId)
    );
  };

  const handleTaskCreated = (newTask) => {
    setTasks((prev) => [...prev, newTask]);
  };

  // Stats
  const totalTasks = tasks.length;
  const blockedCount = tasks.filter((t) => t.status === 'Blocked').length;
  const doneCount = tasks.filter((t) => t.column_name === 'Done').length;
  const progressPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0f1117]/95 backdrop-blur-xl">
        <div className="px-6 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">TaskFlow Pro</h1>
              <p className="text-[10px] text-white/30 leading-none mt-0.5">DAG-Powered Kanban</p>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <StatPill label="Total" value={totalTasks} color="text-white/60" />
            <StatPill label="Blocked" value={blockedCount} color="text-red-400" />
            <StatPill label="Done" value={doneCount} color="text-emerald-400" />
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5">
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-white/50">{progressPct}%</span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="task-search"
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all w-48"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              id="view-board"
              onClick={() => setView('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'board' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Board
            </button>
            <button
              id="view-dag"
              onClick={() => setView('dag')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === 'dag' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              DAG
            </button>
          </div>

          {/* Add Task */}
          <button
            id="add-task-button"
            onClick={() => setAddingToColumn('Backlog')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-white/40 text-sm">Loading TaskFlow Pro…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 px-6">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-red-400 font-medium text-sm mb-1">Connection Error</p>
              <p className="text-white/40 text-xs max-w-md">{error}</p>
            </div>
            <button
              onClick={fetchAll}
              className="text-sm bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-lg transition-all border border-white/10"
            >
              Retry
            </button>
          </div>
        ) : view === 'board' ? (
          <div className="flex gap-5 p-6 overflow-x-auto h-full">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col}
                column={col}
                tasks={tasksByColumnWithDepCount[col]}
                onTaskClick={(task) => setSelectedTask(task)}
                onAddTask={(column) => setAddingToColumn(column)}
                dragOver={dragOverColumn === col}
                onDragOver={(e) => handleDragOver(e, col)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-white/80">Dependency Graph</h2>
              <p className="text-xs text-white/35 mt-0.5">Click a node to open the task. Arrows represent dependencies — predecessor must complete before successor can start.</p>
            </div>
            <DagViewer
              tasks={tasksWithDepCount}
              dependencies={dependencies}
              onTaskClick={(task) => setSelectedTask(task)}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          allTasks={tasks}
          dependencies={dependencies}
          onClose={() => setSelectedTask(null)}
          onUpdated={(updated) => {
            handleTaskUpdated(updated);
            setSelectedTask(null);
            fetchAll();
          }}
          onDeleted={(id) => {
            handleTaskDeleted(id);
            setSelectedTask(null);
          }}
        />
      )}
      {addingToColumn && (
        <AddTaskModal
          defaultColumn={addingToColumn}
          onClose={() => setAddingToColumn(null)}
          onCreated={(task) => {
            handleTaskCreated(task);
            setAddingToColumn(null);
          }}
        />
      )}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1.5">
      <span className={`font-bold ${color}`}>{value}</span>
      <span className="text-white/35">{label}</span>
    </div>
  );
}
