const express = require('express');
const pool = require('../db/index');
const router = express.Router();

router.get('/board', async (req, res, next) => {
  try {
    const tasksRes = await pool.query('SELECT * FROM tasks ORDER BY column_name, position ASC');
    const dependenciesRes = await pool.query('SELECT * FROM task_dependencies');
    res.json({
      tasks: tasksRes.rows,
      dependencies: dependenciesRes.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
