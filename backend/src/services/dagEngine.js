const pool = require('../db/index');

async function validateAndAddDependency(predecessorId, successorId) {
  if (predecessorId === successorId) {
    throw new Error('A task cannot depend on itself');
  }

  // 1. Verify both task IDs exist in the tasks table.
  const tasksCheck = await pool.query(
    'SELECT id FROM tasks WHERE id = ANY($1::uuid[])',
    [[predecessorId, successorId]]
  );
  if (tasksCheck.rows.length < 2) {
    throw new Error('One or both tasks not found');
  }

  // 3. Check if this exact edge already exists.
  const existingEdge = await pool.query(
    'SELECT 1 FROM task_dependencies WHERE predecessor_id = $1 AND successor_id = $2',
    [predecessorId, successorId]
  );
  if (existingEdge.rows.length > 0) {
    throw new Error('This dependency already exists');
  }

  // 4. Run cycle detection: perform a depth-first search starting from successorId
  const allEdgesRes = await pool.query('SELECT predecessor_id, successor_id FROM task_dependencies');
  const allEdges = allEdgesRes.rows;
  
  const adj = {};
  for (const edge of allEdges) {
    if (!adj[edge.predecessor_id]) adj[edge.predecessor_id] = [];
    adj[edge.predecessor_id].push(edge.successor_id);
  }

  const visited = new Set();
  const stack = [successorId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === predecessorId) {
      throw new Error('This dependency would create a circular relationship and has been rejected');
    }
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbors = adj[current] || [];
    for (const n of neighbors) {
      stack.push(n);
    }
  }

  // 5. If all checks pass, insert the new edge
  const insertRes = await pool.query(
    'INSERT INTO task_dependencies (predecessor_id, successor_id, ai_suggested) VALUES ($1, $2, false) RETURNING *',
    [predecessorId, successorId]
  );

  // 6. call recomputeStatus(successorId)
  await recomputeStatus(successorId);

  // 7. Return the newly created dependency row.
  return insertRes.rows[0];
}

async function recomputeStatus(taskId, visited = new Set()) {
  if (visited.has(taskId)) return;
  visited.add(taskId);

  // Fetch all predecessor task IDs for this task
  const predsRes = await pool.query(
    `SELECT t.column_name 
     FROM tasks t 
     JOIN task_dependencies td ON t.id = td.predecessor_id 
     WHERE td.successor_id = $1`,
    [taskId]
  );
  
  let newStatus = 'Ready';
  if (predsRes.rows.length > 0) {
    const allDone = predsRes.rows.every(row => row.column_name === 'Done');
    if (!allDone) {
      newStatus = 'Blocked';
    }
  }

  await pool.query(
    'UPDATE tasks SET column_name = $1 WHERE id = $2',
    [newStatus, taskId]
  );

  const succsRes = await pool.query(
    'SELECT successor_id FROM task_dependencies WHERE predecessor_id = $1',
    [taskId]
  );

  for (const row of succsRes.rows) {
    await recomputeStatus(row.successor_id, visited);
  }
}

async function propagateSchedule(taskId, newEndDate) {
  // 1. Build the full downstream subgraph starting from taskId.
  const edgesRes = await pool.query('SELECT predecessor_id, successor_id FROM task_dependencies');
  const allEdges = edgesRes.rows;

  const adj = {};
  for (const edge of allEdges) {
    if (!adj[edge.predecessor_id]) adj[edge.predecessor_id] = [];
    adj[edge.predecessor_id].push(edge.successor_id);
  }

  const downstreamSet = new Set();
  const stack = [];
  if (adj[taskId]) {
    for (const succ of adj[taskId]) {
      stack.push(succ);
    }
  }

  while (stack.length > 0) {
    const current = stack.pop();
    if (downstreamSet.has(current)) continue;
    downstreamSet.add(current);
    if (adj[current]) {
      for (const n of adj[current]) {
        stack.push(n);
      }
    }
  }

  if (downstreamSet.size === 0) return;

  const subgraphIds = Array.from(downstreamSet);
  subgraphIds.push(taskId);

  // Fetch their current dates from the database
  const tasksRes = await pool.query(
    'SELECT id, start_date, end_date FROM tasks WHERE id = ANY($1::uuid[])',
    [subgraphIds]
  );
  const taskDates = {};
  for (const row of tasksRes.rows) {
    taskDates[row.id] = {
      start_date: row.start_date,
      end_date: row.end_date
    };
  }

  // 2. Run Kahn's algorithm on this subgraph
  const inDegree = {};
  for (const id of subgraphIds) {
    inDegree[id] = 0;
  }

  const subEdges = allEdges.filter(e => subgraphIds.includes(e.predecessor_id) && subgraphIds.includes(e.successor_id));
  const subAdj = {};
  for (const id of subgraphIds) {
    subAdj[id] = [];
  }
  for (const edge of subEdges) {
    inDegree[edge.successor_id]++;
    subAdj[edge.predecessor_id].push(edge.successor_id);
  }

  const queue = [];
  for (const id of subgraphIds) {
    if (inDegree[id] === 0) {
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();

    if (current !== taskId) {
      const currentPreds = allEdges.filter(e => e.successor_id === current).map(e => e.predecessor_id);
      let maxPredEndDate = null;
      
      const outsidePreds = currentPreds.filter(p => !subgraphIds.includes(p));
      if (outsidePreds.length > 0) {
        const outRes = await pool.query('SELECT id, end_date FROM tasks WHERE id = ANY($1::uuid[])', [outsidePreds]);
        for (const row of outRes.rows) {
          if (row.end_date) {
            const d = new Date(row.end_date);
            if (!maxPredEndDate || d > maxPredEndDate) {
              maxPredEndDate = d;
            }
          }
        }
      }

      const insidePreds = currentPreds.filter(p => subgraphIds.includes(p));
      for (const p of insidePreds) {
        let endDateStr = taskDates[p]?.end_date;
        if (p === taskId && newEndDate) {
          endDateStr = newEndDate;
        }
        if (endDateStr) {
          const d = new Date(endDateStr);
          if (!maxPredEndDate || d > maxPredEndDate) {
            maxPredEndDate = d;
          }
        }
      }

      if (maxPredEndDate && taskDates[current].start_date && taskDates[current].end_date) {
        const origStart = new Date(taskDates[current].start_date);
        const origEnd = new Date(taskDates[current].end_date);
        
        const durationDays = Math.round((origEnd - origStart) / (1000 * 60 * 60 * 24));

        const newStart = new Date(maxPredEndDate.getTime());
        newStart.setUTCDate(newStart.getUTCDate() + 1);

        const newEnd = new Date(newStart.getTime());
        newEnd.setUTCDate(newEnd.getUTCDate() + durationDays);

        taskDates[current].start_date = newStart.toISOString().split('T')[0];
        taskDates[current].end_date = newEnd.toISOString().split('T')[0];

        await pool.query(
          'UPDATE tasks SET start_date = $1, end_date = $2 WHERE id = $3',
          [taskDates[current].start_date, taskDates[current].end_date, current]
        );
      }
    }

    for (const succ of subAdj[current]) {
      inDegree[succ]--;
      if (inDegree[succ] === 0) {
        queue.push(succ);
      }
    }
  }
}

async function recomputeOnRollback(taskId) {
  // 1. Call recomputeStatus(taskId) first
  await recomputeStatus(taskId);

  // 2. BFS forward from taskId through the dependency graph
  const edgesRes = await pool.query('SELECT predecessor_id, successor_id FROM task_dependencies');
  const allEdges = edgesRes.rows;

  const adj = {};
  for (const edge of allEdges) {
    if (!adj[edge.predecessor_id]) adj[edge.predecessor_id] = [];
    adj[edge.predecessor_id].push(edge.successor_id);
  }

  const visited = new Set();
  const queue = [];
  
  if (adj[taskId]) {
    for (const succ of adj[taskId]) {
      queue.push(succ);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    
    // 3. For each downstream task in BFS order, call recomputeStatus
    await recomputeStatus(current);

    if (adj[current]) {
      for (const n of adj[current]) {
        queue.push(n);
      }
    }
  }
}

module.exports = {
  validateAndAddDependency,
  recomputeStatus,
  propagateSchedule,
  recomputeOnRollback
};
