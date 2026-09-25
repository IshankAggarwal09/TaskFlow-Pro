const pool = require('../db/index');
const {
  validateAndAddDependency,
  recomputeStatus,
  propagateSchedule,
  recomputeOnRollback
} = require('./dagEngine');

jest.mock('../db/index', () => ({
  query: jest.fn()
}));

describe('dagEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndAddDependency', () => {
    it('should reject a self-dependency', async () => {
      await expect(validateAndAddDependency('1', '1')).rejects.toThrow('A task cannot depend on itself');
    });

    it('should reject if tasks are not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
      await expect(validateAndAddDependency('1', '2')).rejects.toThrow('One or both tasks not found');
    });

    it('should reject if dependency exists', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: '1' }, { id: '2' }] }) // tasks check
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }); // existing edge
      await expect(validateAndAddDependency('1', '2')).rejects.toThrow('This dependency already exists');
    });

    it('should reject a circular dependency (indirect)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: '1' }, { id: '3' }] }) // tasks check
        .mockResolvedValueOnce({ rows: [] }) // existing edge check
        .mockResolvedValueOnce({ rows: [
          { predecessor_id: '3', successor_id: '2' },
          { predecessor_id: '2', successor_id: '1' }
        ] }); // cycle check

      await expect(validateAndAddDependency('1', '3')).rejects.toThrow('This dependency would create a circular relationship and has been rejected');
    });

    it('should add dependency if valid', async () => {
      pool.query.mockImplementation((sql) => {
        if (sql.includes('SELECT id FROM tasks WHERE id = ANY')) return Promise.resolve({ rows: [{ id: '1' }, { id: '2' }] });
        if (sql.includes('SELECT 1 FROM task_dependencies')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT predecessor_id, successor_id FROM task_dependencies')) return Promise.resolve({ rows: [] });
        if (sql.includes('INSERT INTO task_dependencies')) return Promise.resolve({ rows: [{ predecessor_id: '1', successor_id: '2' }] });
        if (sql.includes('SELECT 1 FROM tasks WHERE id = $1')) return Promise.resolve({ rows: [{ id: '2' }] });
        if (sql.includes('SELECT t.column_name')) return Promise.resolve({ rows: [] });
        if (sql.includes('UPDATE tasks SET')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT successor_id FROM task_dependencies')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      const res = await validateAndAddDependency('1', '2');
      expect(res).toEqual({ predecessor_id: '1', successor_id: '2' });
    });
  });

  describe('recomputeStatus', () => {
    it('should update status based on predecessors', async () => {
      pool.query.mockImplementation((sql) => {
        if (sql.includes('SELECT 1 FROM tasks WHERE id = $1')) return Promise.resolve({ rows: [{ id: '1' }] });
        if (sql.includes('SELECT t.column_name')) return Promise.resolve({ rows: [{ column_name: 'Done' }] });
        if (sql.includes('UPDATE tasks SET column_name')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT successor_id FROM task_dependencies')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      await recomputeStatus('1');
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE tasks SET column_name = $1 WHERE id = $2',
        ['Ready', '1']
      );
    });

    it('should mark as Blocked if not all predecessors are Done', async () => {
      pool.query.mockImplementation((sql) => {
        if (sql.includes('SELECT 1 FROM tasks WHERE id = $1')) return Promise.resolve({ rows: [{ id: '1' }] });
        if (sql.includes('SELECT t.column_name')) return Promise.resolve({ rows: [{ column_name: 'Done' }, { column_name: 'In Progress' }] });
        if (sql.includes('UPDATE tasks SET column_name')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT successor_id FROM task_dependencies')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      await recomputeStatus('1');
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE tasks SET column_name = $1 WHERE id = $2',
        ['Blocked', '1']
      );
    });
  });

  describe('propagateSchedule', () => {
    it('should handle diamond pattern scheduling', async () => {
      pool.query.mockImplementation((sql) => {
        if (sql.includes('SELECT predecessor_id, successor_id FROM task_dependencies')) return Promise.resolve({ rows: [
          { predecessor_id: 'A', successor_id: 'B' },
          { predecessor_id: 'A', successor_id: 'C' },
          { predecessor_id: 'B', successor_id: 'D' },
          { predecessor_id: 'C', successor_id: 'D' }
        ] });
        if (sql.includes('SELECT id, start_date, end_date FROM tasks WHERE id = ANY')) return Promise.resolve({ rows: [
          { id: 'A', start_date: '2023-01-01', end_date: '2023-01-05' },
          { id: 'B', start_date: '2023-01-06', end_date: '2023-01-10' },
          { id: 'C', start_date: '2023-01-06', end_date: '2023-01-15' },
          { id: 'D', start_date: '2023-01-16', end_date: '2023-01-20' }
        ] });
        if (sql.includes('SELECT id, end_date FROM tasks WHERE id = ANY')) return Promise.resolve({ rows: [] });
        if (sql.includes('UPDATE tasks SET start_date')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      await propagateSchedule('A', '2023-01-07');
      
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE tasks SET start_date = $1, end_date = $2 WHERE id = $3',
        expect.any(Array)
      );
    });
  });

  describe('recomputeOnRollback', () => {
    it('should process rollbacks via BFS', async () => {
      pool.query.mockImplementation((sql) => {
        if (sql.includes('SELECT 1 FROM tasks WHERE id = $1')) return Promise.resolve({ rows: [{ id: '1' }] });
        if (sql.includes('SELECT t.column_name')) return Promise.resolve({ rows: [] });
        if (sql.includes('UPDATE tasks SET column_name')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT successor_id FROM task_dependencies')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT predecessor_id, successor_id FROM task_dependencies')) return Promise.resolve({ rows: [
          { predecessor_id: '1', successor_id: '2' },
          { predecessor_id: '2', successor_id: '3' }
        ] });
        return Promise.resolve({ rows: [] });
      });

      await recomputeOnRollback('1');
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE tasks SET column_name = $1 WHERE id = $2',
        ['Ready', '1']
      );
    });
  });
});
