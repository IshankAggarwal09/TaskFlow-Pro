const express = require('express');
const pool = require('../db/index');
const dagEngine = require('../services/dagEngine');
const router = express.Router();

router.post('/:id/dependencies', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { predecessorId, aiSuggested } = req.body;

    let dependency = await dagEngine.validateAndAddDependency(predecessorId, id);
    
    if (aiSuggested) {
      const updateRes = await pool.query(
        'UPDATE task_dependencies SET ai_suggested = true WHERE id = $1 RETURNING *',
        [dependency.id]
      );
      dependency = updateRes.rows[0];
    }
    
    res.status(201).json(dependency);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id/dependencies/:depId', async (req, res, next) => {
  try {
    const { id, depId } = req.params;
    
    const delRes = await pool.query('DELETE FROM task_dependencies WHERE id = $1 RETURNING *', [depId]);
    if (delRes.rows.length > 0) {
      await dagEngine.recomputeStatus(id);
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
