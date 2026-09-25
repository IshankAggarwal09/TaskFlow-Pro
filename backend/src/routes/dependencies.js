const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const dagService = require('../services/dagService');

// GET /dependencies — list all dependency edges
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT td.*, 
              p.title AS predecessor_title,
              s.title AS successor_title
       FROM task_dependencies td
       JOIN tasks p ON p.id = td.predecessor_id
       JOIN tasks s ON s.id = td.successor_id
       ORDER BY p.title`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /dependencies error:', err);
    res.status(500).json({ error: 'Failed to fetch dependencies.' });
  }
});

// POST /dependencies — add a new dependency edge
router.post('/', async (req, res) => {
  const { predecessor_id, successor_id, ai_suggested = false } = req.body;

  if (!predecessor_id || !successor_id) {
    return res.status(400).json({ error: 'predecessor_id and successor_id are required.' });
  }
  if (predecessor_id === successor_id) {
    return res.status(400).json({ error: 'A task cannot depend on itself.' });
  }

  try {
    // Verify both tasks exist
    const tasksCheck = await pool.query(
      'SELECT id FROM tasks WHERE id = ANY($1::uuid[])',
      [[predecessor_id, successor_id]]
    );
    if (tasksCheck.rows.length < 2) {
      return res.status(404).json({ error: 'One or both tasks not found.' });
    }

    // Cycle detection via DAG service
    const allDeps = (await pool.query('SELECT predecessor_id, successor_id FROM task_dependencies')).rows;
    const wouldCreateCycle = dagService.detectsCycle(allDeps, predecessor_id, successor_id);
    if (wouldCreateCycle) {
      return res.status(409).json({ error: 'Adding this dependency would create a cycle in the DAG.' });
    }

    const result = await pool.query(
      `INSERT INTO task_dependencies (predecessor_id, successor_id, ai_suggested)
       VALUES ($1, $2, $3)
       ON CONFLICT (predecessor_id, successor_id) DO NOTHING
       RETURNING *`,
      [predecessor_id, successor_id, ai_suggested]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'This dependency already exists.' });
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /dependencies error:', err);
    res.status(500).json({ error: 'Failed to create dependency.' });
  }
});

// DELETE /dependencies/:predecessorId/:successorId — remove a dependency edge
router.delete('/:predecessorId/:successorId', async (req, res) => {
  const { predecessorId, successorId } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM task_dependencies WHERE predecessor_id = $1 AND successor_id = $2 RETURNING *',
      [predecessorId, successorId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dependency not found.' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /dependencies error:', err);
    res.status(500).json({ error: 'Failed to delete dependency.' });
  }
});

module.exports = router;
