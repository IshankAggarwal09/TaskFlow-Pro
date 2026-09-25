import React from 'react';

const COLUMN_COLORS = {
  Backlog: 'from-slate-500/20 to-slate-600/10 border-slate-500/30',
  'In Progress': 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  Review: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  Done: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
};

const COLUMN_ACCENT = {
  Backlog: 'bg-slate-500',
  'In Progress': 'bg-blue-500',
  Review: 'bg-amber-500',
  Done: 'bg-emerald-500',
};

const COLUMN_TEXT = {
  Backlog: 'text-slate-300',
  'In Progress': 'text-blue-300',
  Review: 'text-amber-300',
  Done: 'text-emerald-300',
};

export default function KanbanColumn({ column, tasks, onTaskClick, onAddTask, dragOver, onDragOver, onDragLeave, onDrop }) {
  return (
    <div
      className={`flex flex-col rounded-2xl border bg-gradient-to-b ${COLUMN_COLORS[column]} backdrop-blur-sm min-w-[300px] w-[300px] flex-shrink-0 transition-all duration-200 ${dragOver ? 'ring-2 ring-white/20 scale-[1.01]' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${COLUMN_ACCENT[column]}`} />
          <h2 className={`font-semibold text-sm tracking-wide ${COLUMN_TEXT[column]}`}>{column}</h2>
          <span className="ml-1 text-xs bg-white/10 text-white/60 rounded-full px-2 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column)}
          className="text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg p-1 transition-all duration-150"
          title={`Add task to ${column}`}
          aria-label={`Add task to ${column}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Task Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[120px]">
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-white/20 text-xs gap-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Drop tasks here</span>
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, onClick }) {
  const isBlocked = task.status === 'Blocked';

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className={`group relative rounded-xl border p-3.5 cursor-pointer transition-all duration-200 select-none
        ${isBlocked
          ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10'
          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/8'
        }
        hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Task: ${task.title}`}
    >
      {/* Status Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider
          ${isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
          {isBlocked ? (
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {task.status}
        </span>
        {task.dependency_count > 0 && (
          <span className="text-[10px] text-white/30 flex items-center gap-0.5" title={`${task.dependency_count} dependencies`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {task.dependency_count}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-white/90 leading-snug mb-1.5 group-hover:text-white transition-colors">
        {task.title}
      </h3>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-white/40 line-clamp-2 leading-relaxed mb-2">
          {task.description}
        </p>
      )}

      {/* Date range */}
      {(task.start_date || task.end_date) && (
        <div className="flex items-center gap-1 text-[11px] text-white/30 mt-2">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {formatDate(task.start_date)}
            {task.start_date && task.end_date && ' → '}
            {formatDate(task.end_date)}
          </span>
        </div>
      )}

      {/* Drag handle indicator */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity">
        <svg className="w-3 h-5" fill="currentColor" viewBox="0 0 6 20">
          <circle cx="1" cy="3" r="1"/><circle cx="5" cy="3" r="1"/>
          <circle cx="1" cy="10" r="1"/><circle cx="5" cy="10" r="1"/>
          <circle cx="1" cy="17" r="1"/><circle cx="5" cy="17" r="1"/>
        </svg>
      </div>
    </div>
  );
}
