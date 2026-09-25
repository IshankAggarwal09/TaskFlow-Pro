import React, { useState, useEffect } from 'react';
import { updateTask, deleteTask } from '../services/api';

const COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done'];
const STATUSES = ['Ready', 'Blocked'];

export default function TaskModal({ task, allTasks, dependencies, onClose, onUpdated, onDeleted }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'Ready',
    column_name: task?.column_name || 'Backlog',
    start_date: task?.start_date ? task.start_date.split('T')[0] : '',
    end_date: task?.end_date ? task.end_date.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Predecessors and successors for this task
  const predecessors = dependencies
    .filter((d) => d.successor_id === task?.id)
    .map((d) => allTasks.find((t) => t.id === d.predecessor_id))
    .filter(Boolean);

  const successors = dependencies
    .filter((d) => d.predecessor_id === task?.id)
    .map((d) => allTasks.find((t) => t.id === d.successor_id))
    .filter(Boolean);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await updateTask(task.id, form);
      onUpdated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onDeleted(task.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete task.');
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Task details"
    >
      <div className="relative w-full max-w-2xl bg-[#161b2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/3">
          <h2 className="text-base font-semibold text-white/90">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg p-1.5 transition-all"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="task-title" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
              Title *
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Task title..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="task-description" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <textarea
              id="task-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Task description..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
            />
          </div>

          {/* Status & Column */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-status" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                Status
              </label>
              <select
                id="task-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full bg-[#1e2538] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-column" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                Column
              </label>
              <select
                id="task-column"
                name="column_name"
                value={form.column_name}
                onChange={handleChange}
                className="w-full bg-[#1e2538] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
              >
                {COLUMNS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-start-date" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                Start Date
              </label>
              <input
                id="task-start-date"
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <div>
              <label htmlFor="task-end-date" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                End Date
              </label>
              <input
                id="task-end-date"
                name="end_date"
                type="date"
                value={form.end_date}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
          </div>

          {/* Dependencies */}
          {(predecessors.length > 0 || successors.length > 0) && (
            <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Dependencies
              </h3>
              {predecessors.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Blocked by</p>
                  <div className="flex flex-wrap gap-2">
                    {predecessors.map((t) => (
                      <span key={t.id} className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1 rounded-lg">
                        {t.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {successors.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Unblocks</p>
                  <div className="flex flex-wrap gap-2">
                    {successors.map((t) => (
                      <span key={t.id} className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg">
                        {t.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task ID */}
          {task?.id && (
            <div className="text-[11px] text-white/20 font-mono">
              ID: {task.id}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleting ? 'Deleting…' : 'Delete Task'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="text-sm text-white/50 hover:text-white/80 px-4 py-2 rounded-lg hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              id="save-task-button"
              className="text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white px-5 py-2 rounded-lg transition-all"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
