const express = require('express');
const router = express.Router();
const pool = require('../db/index');

// GET /tasks — list all tasks
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY column_name, position, created_at'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// GET /tasks/:id — get a single task
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch task.' });
  }
});

// POST /tasks — create a new task
router.post('/', async (req, res) => {
  const { title, description = '', status = 'Ready', column_name = 'Backlog', position = 0, start_date, end_date } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  const validStatuses = ['Ready', 'Blocked'];
  const validColumns = ['Backlog', 'In Progress', 'Review', 'Done'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  if (!validColumns.includes(column_name)) return res.status(400).json({ error: `Column must be one of: ${validColumns.join(', ')}` });

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, column_name, position, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title.trim(), description, status, column_name, position, start_date || null, end_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /tasks error:', err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// PATCH /tasks/:id — update a task's fields
router.patch('/:id', async (req, res) => {
  const { title, description, status, column_name, position, start_date, end_date } = req.body;

  const validStatuses = ['Ready', 'Blocked'];
  const validColumns = ['Backlog', 'In Progress', 'Review', 'Done'];

  if (status && !validStatuses.includes(status)) return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  if (column_name && !validColumns.includes(column_name)) return res.status(400).json({ error: `Column must be one of: ${validColumns.join(', ')}` });
  if (title !== undefined && (!title || !title.trim())) return res.status(400).json({ error: 'Title cannot be empty.' });

  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });

    const current = existing.rows[0];
    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, column_name = $4, position = $5, start_date = $6, end_date = $7
       WHERE id = $8
       RETURNING *`,
      [
        title?.trim() ?? current.title,
        description ?? current.description,
        status ?? current.status,
        column_name ?? current.column_name,
        position ?? current.position,
        start_date !== undefined ? (start_date || null) : current.start_date,
        end_date !== undefined ? (end_date || null) : current.end_date,
        req.params.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// PATCH /tasks/:id/move — move a task to a different column
router.patch('/:id/move', async (req, res) => {
  const { column_name, position = 0 } = req.body;
  const validColumns = ['Backlog', 'In Progress', 'Review', 'Done'];
  if (!column_name || !validColumns.includes(column_name)) {
    return res.status(400).json({ error: `Column must be one of: ${validColumns.join(', ')}` });
  }

  try {
    const result = await pool.query(
      'UPDATE tasks SET column_name = $1, position = $2 WHERE id = $3 RETURNING *',
      [column_name, position, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /tasks/:id/move error:', err);
    res.status(500).json({ error: 'Failed to move task.' });
  }
});

// DELETE /tasks/:id — delete a task (cascades dependencies)
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });
    res.json({ deleted: result.rows[0].id });
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

module.exports = router;
