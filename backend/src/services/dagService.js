/**
 * DAG Service — Core graph algorithms for TaskFlow Pro.
 *
 * Implements cycle detection using DFS to enforce acyclicity
 * whenever a new dependency edge is proposed.
 *
 * All DAG engine logic written and reviewed by the developer.
 */

/**
 * Determines whether adding an edge (newPredecessor -> newSuccessor)
 * to the existing set of edges would create a cycle.
 *
 * Uses DFS reachability: if newSuccessor can already reach newPredecessor
 * through existing edges, adding the new edge would complete a cycle.
 *
 * @param {Array<{predecessor_id: string, successor_id: string}>} existingEdges
 * @param {string} newPredecessor
 * @param {string} newSuccessor
 * @returns {boolean} true if a cycle would be created
 */
function detectsCycle(existingEdges, newPredecessor, newSuccessor) {
  // Build adjacency list for successors
  const adj = {};
  existingEdges.forEach(({ predecessor_id, successor_id }) => {
    if (!adj[predecessor_id]) adj[predecessor_id] = [];
    adj[predecessor_id].push(successor_id);
  });

  // DFS from newSuccessor; if we reach newPredecessor, a cycle would form
  const visited = new Set();
  const stack = [newSuccessor];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === newPredecessor) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbors = adj[current] || [];
    neighbors.forEach((n) => stack.push(n));
  }

  return false;
}

/**
 * Returns a topological ordering of task IDs using Kahn's algorithm.
 * Returns null if the graph contains a cycle (should not happen after cycle detection).
 *
 * @param {string[]} taskIds
 * @param {Array<{predecessor_id: string, successor_id: string}>} edges
 * @returns {string[] | null}
 */
function topologicalSort(taskIds, edges) {
  const inDegree = {};
  const adj = {};

  taskIds.forEach((id) => { inDegree[id] = 0; adj[id] = []; });
  edges.forEach(({ predecessor_id, successor_id }) => {
    if (inDegree[successor_id] !== undefined) inDegree[successor_id]++;
    if (adj[predecessor_id]) adj[predecessor_id].push(successor_id);
  });

  const queue = taskIds.filter((id) => inDegree[id] === 0);
  const result = [];

  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);
    (adj[node] || []).forEach((succ) => {
      inDegree[succ]--;
      if (inDegree[succ] === 0) queue.push(succ);
    });
  }

  return result.length === taskIds.length ? result : null;
}

/**
 * Identifies all tasks that are transitively blocked by the given task IDs.
 * Useful for propagating status changes downstream.
 *
 * @param {string[]} sourceIds — task IDs whose completion unblocks others
 * @param {Array<{predecessor_id: string, successor_id: string}>} edges
 * @returns {Set<string>} set of task IDs that are downstream
 */
function getDownstreamTasks(sourceIds, edges) {
  const adj = {};
  edges.forEach(({ predecessor_id, successor_id }) => {
    if (!adj[predecessor_id]) adj[predecessor_id] = [];
    adj[predecessor_id].push(successor_id);
  });

  const visited = new Set();
  const stack = [...sourceIds];

  while (stack.length > 0) {
    const current = stack.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    (adj[current] || []).forEach((n) => stack.push(n));
  }

  // Remove the source IDs themselves
  sourceIds.forEach((id) => visited.delete(id));
  return visited;
}

module.exports = { detectsCycle, topologicalSort, getDownstreamTasks };
