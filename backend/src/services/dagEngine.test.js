const pool = require('../db/index');
const {
  validateAndAddDependency,
  recomputeStatus,
  propagateSchedule,
  recomputeOnRollback
} = require('./dagEngine');

// Mock pool query
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
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: '1' }, { id: '2' }] }) // tasks check
        .mockResolvedValueOnce({ rows: [] }) // existing edge check
        .mockResolvedValueOnce({ rows: [] }) // cycle check
        .mockResolvedValueOnce({ rows: [{ predecessor_id: '1', successor_id: '2' }] }) // insert
        .mockResolvedValueOnce({ rows: [] }) // recomputeStatus - predsRes
        .mockResolvedValueOnce({ rows: [] }) // recomputeStatus - UPDATE
        .mockResolvedValueOnce({ rows: [] }); // recomputeStatus - succsRes

      const res = await validateAndAddDependency('1', '2');
      expect(res).toEqual({ predecessor_id: '1', successor_id: '2' });
    });
  });

  describe('recomputeStatus', () => {
    it('should update status based on predecessors', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'Done' }] }) // predsRes
        .mockResolvedValueOnce({ rows: [] }) // update
        .mockResolvedValueOnce({ rows: [] }); // succsRes

      await recomputeStatus('1');
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE tasks SET column_name = $1 WHERE id = $2',
        ['Ready', '1']
      );
    });

    it('should mark as Blocked if not all predecessors are Done', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'Done' }, { column_name: 'In Progress' }] }) // predsRes
        .mockResolvedValueOnce({ rows: [] }) // update
        .mockResolvedValueOnce({ rows: [] }); // succsRes

      await recomputeStatus('1');
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE tasks SET column_name = $1 WHERE id = $2',
        ['Blocked', '1']
      );
    });
  });

  describe('propagateSchedule', () => {
    it('should handle diamond pattern scheduling', async () => {
      // Setup a diamond: A -> B, A -> C, B -> D, C -> D
      pool.query
        .mockResolvedValueOnce({ rows: [
          { predecessor_id: 'A', successor_id: 'B' },
          { predecessor_id: 'A', successor_id: 'C' },
          { predecessor_id: 'B', successor_id: 'D' },
          { predecessor_id: 'C', successor_id: 'D' }
        ] })
        .mockResolvedValueOnce({ rows: [
          { id: 'A', start_date: '2023-01-01', end_date: '2023-01-05' },
          { id: 'B', start_date: '2023-01-06', end_date: '2023-01-10' },
          { id: 'C', start_date: '2023-01-06', end_date: '2023-01-15' },
          { id: 'D', start_date: '2023-01-16', end_date: '2023-01-20' }
        ] }); // dates
      
      pool.query.mockResolvedValue({ rows: [] }); // default for any other queries

      await propagateSchedule('A', '2023-01-07');
      
      // Updates should happen for B, C, and D based on topological sort (Kahn's)
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE tasks SET start_date = $1, end_date = $2 WHERE id = $3',
        expect.any(Array)
      );
    });
  });

  describe('recomputeOnRollback', () => {
    it('should process rollbacks via BFS', async () => {
      pool.query
        // For recomputeStatus('1')
        .mockResolvedValueOnce({ rows: [] }) // predsRes
        .mockResolvedValueOnce({ rows: [] }) // update
        .mockResolvedValueOnce({ rows: [] }) // succsRes
        // For edges query
        .mockResolvedValueOnce({ rows: [
          { predecessor_id: '1', successor_id: '2' },
          { predecessor_id: '2', successor_id: '3' }
        ] })
        // For recomputeStatus('2')
        .mockResolvedValueOnce({ rows: [] }) // predsRes
        .mockResolvedValueOnce({ rows: [] }) // update
        .mockResolvedValueOnce({ rows: [] }) // succsRes
        // For recomputeStatus('3')
        .mockResolvedValueOnce({ rows: [] }) // predsRes
        .mockResolvedValueOnce({ rows: [] }) // update
        .mockResolvedValueOnce({ rows: [] }); // succsRes

      await recomputeOnRollback('1');
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE tasks SET column_name = $1 WHERE id = $2',
        ['Ready', '1']
      );
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE tasks SET column_name = $1 WHERE id = $2',
        ['Ready', '2']
      );
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE tasks SET column_name = $1 WHERE id = $2',
        ['Ready', '3']
      );
    });
  });
});
