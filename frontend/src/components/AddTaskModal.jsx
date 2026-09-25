import React, { useState } from 'react';
import { createTask } from '../services/api';

const COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done'];

export default function AddTaskModal({ defaultColumn, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'Ready',
    column_name: defaultColumn || 'Backlog',
    start_date: '',
    end_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await createTask(form);
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Add new task"
    >
      <div className="relative w-full max-w-lg bg-[#161b2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white/90">New Task</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg p-1.5 transition-all" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
          )}

          <div>
            <label htmlFor="new-task-title" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Title *</label>
            <input
              id="new-task-title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              autoFocus
              placeholder="What needs to be done?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          <div>
            <label htmlFor="new-task-description" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Description</label>
            <textarea
              id="new-task-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Optional description..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-task-column" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Column</label>
              <select
                id="new-task-column"
                name="column_name"
                value={form.column_name}
                onChange={handleChange}
                className="w-full bg-[#1e2538] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
              >
                {COLUMNS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="new-task-status" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Status</label>
              <select
                id="new-task-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full bg-[#1e2538] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
              >
                <option value="Ready">Ready</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-task-start" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Start Date</label>
              <input id="new-task-start" name="start_date" type="date" value={form.start_date} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all" />
            </div>
            <div>
              <label htmlFor="new-task-end" className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">End Date</label>
              <input id="new-task-end" name="end_date" type="date" value={form.end_date} onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="text-sm text-white/50 hover:text-white/80 px-4 py-2 rounded-lg hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving} id="create-task-submit"
              className="text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white px-5 py-2 rounded-lg transition-all">
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
