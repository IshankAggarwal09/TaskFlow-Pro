const express = require('express');
const pool = require('../db/index');
const dagEngine = require('../services/dagEngine');
const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { title, description, column_name, start_date, end_date } = req.body;
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const colName = column_name || 'To Do';

    const posRes = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM tasks WHERE column_name = $1',
      [colName]
    );
    const position = posRes.rows[0].next_pos;

    const insertRes = await pool.query(
      `INSERT INTO tasks (title, description, column_name, status, position, start_date, end_date)
       VALUES ($1, $2, $3, 'Ready', $4, $5, $6) RETURNING *`,
      [title, description || null, colName, position, start_date || null, end_date || null]
    );
    
    res.status(201).json(insertRes.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const currentTask = taskRes.rows[0];

    const hasColChange = 'column_name' in updates && updates.column_name !== currentTask.column_name;
    const hasDateChange = ('start_date' in updates && updates.start_date !== currentTask.start_date) || 
                          ('end_date' in updates && updates.end_date !== currentTask.end_date);
    
    const updateFields = [];
    const values = [];
    let i = 1;
    for (const [key, val] of Object.entries(updates)) {
      if (['title', 'description', 'column_name', 'position', 'start_date', 'end_date'].includes(key)) {
        updateFields.push(`${key} = $${i}`);
        values.push(val);
        i++;
      }
    }

    if (updateFields.length === 0) {
      return res.json(currentTask);
    }
    
    values.push(id);
    const updatedTaskRes = await pool.query(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    const updatedTask = updatedTaskRes.rows[0];

    if (hasColChange) {
      await dagEngine.recomputeStatus(id);
      
      if (updates.column_name === 'Done') {
        const succs = await pool.query('SELECT successor_id FROM task_dependencies WHERE predecessor_id = $1', [id]);
        for (const row of succs.rows) {
          await dagEngine.recomputeStatus(row.successor_id);
        }
      } else if (currentTask.column_name === 'Done') {
        await dagEngine.recomputeOnRollback(id);
      }
      
      if ('end_date' in updates) {
        await dagEngine.propagateSchedule(id, updates.end_date);
      }
    } else if (hasDateChange) {
      if ('end_date' in updates) {
        await dagEngine.propagateSchedule(id, updates.end_date);
      }
    }

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
