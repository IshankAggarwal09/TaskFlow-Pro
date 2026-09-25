const request = require('supertest');
const app = require('../../server'); 
const pool = require('../db/index');

jest.mock('../db/index', () => ({
  query: jest.fn()
}));

describe('Tasks & Dependencies Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/tasks', () => {
    it('creates a task and returns 201 with id, title, status Ready', async () => {
      pool.query.mockImplementation((sql) => {
        if (sql.includes('SELECT COALESCE(MAX(position), 0)')) return Promise.resolve({ rows: [{ next_pos: 1 }] });
        if (sql.includes('INSERT INTO tasks')) return Promise.resolve({ rows: [{ id: 't1', title: 'Test Task', status: 'Ready' }] });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task' });
        
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 't1', title: 'Test Task', status: 'Ready' });
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('changing column_name to Done triggers recomputeStatus on successors', async () => {
      pool.query.mockImplementation((sql) => {
        if (sql.includes('SELECT * FROM tasks WHERE id = $1')) return Promise.resolve({ rows: [{ id: 't1', column_name: 'In Progress' }] });
        if (sql.includes('UPDATE tasks SET')) return Promise.resolve({ rows: [{ id: 't1', column_name: 'Done' }] });
        if (sql.includes('SELECT 1 FROM tasks WHERE id = $1')) return Promise.resolve({ rows: [{ id: 't1' }] });
        if (sql.includes('SELECT t.column_name')) return Promise.resolve({ rows: [] });
        if (sql.includes('UPDATE tasks SET column_name')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT successor_id FROM task_dependencies WHERE predecessor_id = $1')) return Promise.resolve({ rows: [{ successor_id: 't2' }] });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .patch('/api/tasks/t1')
        .send({ column_name: 'Done' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 't1', column_name: 'Done' });
    });
  });

  describe('POST /api/tasks/:id/dependencies', () => {
    it('adding a valid dependency returns 201', async () => {
      pool.query.mockImplementation((sql) => {
        if (sql.includes('SELECT id FROM tasks WHERE id = ANY')) return Promise.resolve({ rows: [{ id: 'p1' }, { id: 's1' }] });
        if (sql.includes('SELECT 1 FROM task_dependencies')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT predecessor_id, successor_id FROM task_dependencies')) return Promise.resolve({ rows: [] });
        if (sql.includes('INSERT INTO task_dependencies')) return Promise.resolve({ rows: [{ id: 'd1', predecessor_id: 'p1', successor_id: 's1' }] });
        if (sql.includes('SELECT 1 FROM tasks WHERE id = $1')) return Promise.resolve({ rows: [{ id: 's1' }] });
        if (sql.includes('SELECT t.column_name')) return Promise.resolve({ rows: [] });
        if (sql.includes('UPDATE tasks SET column_name')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT successor_id FROM task_dependencies')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/tasks/s1/dependencies')
        .send({ predecessorId: 'p1' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 'd1', predecessor_id: 'p1', successor_id: 's1' });
    });

    it('adding a dependency that creates a cycle returns 400 with error message containing circular', async () => {
      pool.query.mockImplementation((sql) => {
        if (sql.includes('SELECT id FROM tasks WHERE id = ANY')) return Promise.resolve({ rows: [{ id: 'p1' }, { id: 's1' }] });
        if (sql.includes('SELECT 1 FROM task_dependencies')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT predecessor_id, successor_id FROM task_dependencies')) return Promise.resolve({ rows: [{ predecessor_id: 's1', successor_id: 'p1' }] });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/tasks/s1/dependencies')
        .send({ predecessorId: 'p1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('circular');
    });

    it('adding a self-dependency returns 400', async () => {
      const res = await request(app)
        .post('/api/tasks/t1/dependencies')
        .send({ predecessorId: 't1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A task cannot depend on itself');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes task and returns 204', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).delete('/api/tasks/t1');
      expect(res.status).toBe(204);
    });
  });

  describe('GET /api/board', () => {
    it('returns object with tasks array and dependencies array', async () => {
      pool.query.mockImplementation((sql) => {
        if (sql.includes('SELECT * FROM tasks')) return Promise.resolve({ rows: [{ id: 't1' }] });
        if (sql.includes('SELECT * FROM task_dependencies')) return Promise.resolve({ rows: [{ id: 'd1' }] });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app).get('/api/board');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ tasks: [{ id: 't1' }], dependencies: [{ id: 'd1' }] });
    });
  });
});
