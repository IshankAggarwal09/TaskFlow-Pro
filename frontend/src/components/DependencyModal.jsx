import React, { useState } from 'react';
import { getAiSuggestions, addDependency, removeDependency } from '../services/api';

const DependencyModal = ({ task, allTasks, dependencies, onAddDependency, onRemoveDependency, onClose }) => {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [manualError, setManualError] = useState(null);

  const myDeps = dependencies.filter(d => d.successor_id === task.id);
  const myDepIds = myDeps.map(d => d.predecessor_id);

  const availableTasks = allTasks.filter(t => t.id !== task.id && !myDepIds.includes(t.id));

  const handleGetSuggestions = async () => {
    setLoadingAi(true);
    setAiError(null);
    try {
      const data = await getAiSuggestions(task.id);
      if (data.error) {
        setAiError(data.error);
      } else {
        setAiSuggestions(data.suggestions || []);
      }
    } catch (err) {
      setAiError('AI suggestions temporarily unavailable');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAddAiSuggestion = async (suggestion) => {
    try {
      await addDependency(task.id, suggestion.taskId, true);
      setAiSuggestions(prev => prev.filter(s => s.taskId !== suggestion.taskId));
      if (onAddDependency) onAddDependency();
    } catch (err) {
      setAiError(err.response?.data?.error || 'Failed to add AI suggestion');
    }
  };

  const handleDismissSuggestion = (taskId) => {
    setAiSuggestions(prev => prev.filter(s => s.taskId !== taskId));
  };

  const handleManualAdd = async () => {
    if (!selectedTaskId) return;
    setManualError(null);
    try {
      await addDependency(task.id, selectedTaskId, false);
      setSelectedTaskId('');
      if (onAddDependency) onAddDependency();
    } catch (err) {
      setManualError(err.response?.data?.error || 'Failed to add dependency');
    }
  };

  const handleRemove = async (depId) => {
    try {
      await removeDependency(task.id, depId);
      if (onRemoveDependency) onRemoveDependency();
    } catch (err) {
      console.error('Failed to remove dependency', err);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="bg-gray-800 text-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Dependencies for: {task.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2">Current Dependencies</h3>
          {myDeps.length === 0 ? (
            <p className="text-gray-400 italic">No dependencies</p>
          ) : (
            <ul className="space-y-2">
              {myDeps.map(dep => {
                const preTask = allTasks.find(t => t.id === dep.predecessor_id);
                if (!preTask) return null;
                return (
                  <li key={dep.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{preTask.title}</span>
                      <span className="text-xs bg-gray-600 px-2 py-1 rounded">{preTask.column_name}</span>
                      {dep.ai_suggested && <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">AI Suggested</span>}
                    </div>
                    <button 
                      onClick={() => handleRemove(dep.id)}
                      className="text-red-400 hover:text-red-300 px-2 py-1"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2">Add Manually</h3>
          {manualError && <div className="bg-red-500/20 text-red-400 p-2 rounded mb-3 text-sm">{manualError}</div>}
          <div className="flex gap-2">
            <select 
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value="">-- Select a task --</option>
              {availableTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title} ({t.column_name})</option>
              ))}
            </select>
            <button 
              onClick={handleManualAdd}
              disabled={!selectedTaskId}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded transition-colors"
            >
              Add Selected as Prerequisite
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2 flex items-center justify-between">
            AI Suggestions
            <button 
              onClick={handleGetSuggestions}
              disabled={loadingAi}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm px-3 py-1 rounded transition-colors flex items-center gap-2"
            >
              {loadingAi ? 'Loading...' : 'Get AI Suggestions'}
            </button>
          </h3>
          
          {aiError && <div className="bg-red-500/20 text-red-400 p-2 rounded mb-3 text-sm">{aiError}</div>}
          
          {aiSuggestions !== null && (
            aiSuggestions.length === 0 ? (
              <p className="text-gray-400 italic">No suggestions found</p>
            ) : (
              <div className="space-y-3">
                {aiSuggestions.map((s, idx) => {
                  const sTask = allTasks.find(t => t.id === s.taskId);
                  if (!sTask) return null;
                  return (
                    <div key={idx} className="bg-gray-700 p-4 rounded border border-gray-600">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold flex items-center gap-2">
                          {sTask.title}
                          <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">AI Suggested</span>
                        </h4>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAddAiSuggestion(s)}
                            className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1 rounded"
                          >
                            Add
                          </button>
                          <button 
                            onClick={() => handleDismissSuggestion(s.taskId)}
                            className="bg-gray-600 hover:bg-gray-500 text-xs px-3 py-1 rounded"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300">{s.rationale}</p>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
};

export default DependencyModal;
