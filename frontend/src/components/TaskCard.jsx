import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskModal from './TaskModal';
import DependencyModal from './DependencyModal';
import { deleteTask } from '../services/api';

const TaskCard = ({ task, dependencies, onTaskUpdate, onTaskDelete, onDependencyAdd, onDependencyRemove, isCritical, allTasks }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDepModalOpen, setIsDepModalOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 200ms ease',
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const myDepsCount = dependencies?.filter(d => d.successor_id === task.id)?.length || 0;

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(task.id);
        if (onTaskDelete) onTaskDelete(task.id);
      } catch (err) {
        console.error('Failed to delete task', err);
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div 
        ref={setNodeRef} 
        style={style} 
        {...attributes} 
        {...listeners}
        className={`bg-gray-800 p-4 rounded-lg shadow-md cursor-grab active:cursor-grabbing border ${isCritical ? 'ring-2 ring-yellow-400 border-yellow-400 border-l-4' : 'border-gray-700'} hover:border-gray-500 transition-colors group relative`}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-gray-100 pr-6">{task.title}</h3>
          <div className="flex flex-col gap-1 items-end shrink-0">
            {task.status === 'Ready' ? (
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Ready</span>
            ) : (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Blocked</span>
            )}
          </div>
        </div>
        
        {task.description && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">{task.description}</p>
        )}
        
        <div className="flex flex-wrap items-center justify-between mt-4 text-xs text-gray-400 gap-2">
          <div className="flex items-center gap-2">
            {(task.start_date || task.end_date) && (
              <div className="flex items-center bg-gray-700 px-2 py-1 rounded">
                <span>{formatDate(task.start_date) || '?'} - {formatDate(task.end_date) || '?'}</span>
              </div>
            )}
            {myDepsCount > 0 && (
              <span className="bg-gray-700 px-2 py-1 rounded text-gray-300">
                {myDepsCount} dep{myDepsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onPointerDown={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1"
            >
              Edit
            </button>
            <button 
              onClick={() => setIsDepModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded px-2 py-1"
            >
              Deps
            </button>
            <button 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1"
              title="Delete Task"
            >
              &#128465;
            </button>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <TaskModal 
          task={task} 
          onClose={() => setIsEditModalOpen(false)} 
          onSave={onTaskUpdate} 
        />
      )}

      {isDepModalOpen && (
        <DependencyModal 
          task={task} 
          allTasks={allTasks}
          dependencies={dependencies}
          onClose={() => setIsDepModalOpen(false)}
          onAddDependency={onDependencyAdd}
          onRemoveDependency={onDependencyRemove}
        />
      )}
    </>
  );
};

export default TaskCard;
