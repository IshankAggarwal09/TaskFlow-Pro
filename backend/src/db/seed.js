const pool = require('./index');

const TASKS = [
  {
    id: 'a1b2c3d4-0001-0001-0001-000000000001',
    title: 'Design Database Schema',
    description: 'Design the complete relational schema for the application including all tables, indexes, and constraints',
    column_name: 'Done',
    status: 'Ready',
    position: 0,
    start_date: '2025-01-01',
    end_date: '2025-01-03',
  },
  {
    id: 'a1b2c3d4-0002-0002-0002-000000000002',
    title: 'Setup PostgreSQL Instance',
    description: 'Provision and configure the PostgreSQL database instance with proper user roles and permissions',
    column_name: 'Done',
    status: 'Ready',
    position: 1,
    start_date: '2025-01-01',
    end_date: '2025-01-02',
  },
  {
    id: 'a1b2c3d4-0003-0003-0003-000000000003',
    title: 'Build Backend API',
    description: 'Implement all REST API endpoints using Express including authentication middleware and error handling',
    column_name: 'In Progress',
    status: 'Ready',
    position: 0,
    start_date: '2025-01-04',
    end_date: '2025-01-08',
  },
  {
    id: 'a1b2c3d4-0004-0004-0004-000000000004',
    title: 'Implement Auth Module',
    description: 'Build JWT-based authentication with login, logout, and token refresh endpoints',
    column_name: 'Backlog',
    status: 'Blocked',
    position: 0,
    start_date: '2025-01-04',
    end_date: '2025-01-06',
  },
  {
    id: 'a1b2c3d4-0005-0005-0005-000000000005',
    title: 'Write Unit Tests for API',
    description: 'Write comprehensive unit tests for all API endpoints using Jest and Supertest',
    column_name: 'Backlog',
    status: 'Blocked',
    position: 1,
    start_date: '2025-01-09',
    end_date: '2025-01-11',
  },
  {
    id: 'a1b2c3d4-0006-0006-0006-000000000006',
    title: 'Build React Frontend',
    description: 'Implement the React frontend with all UI components, state management, and API integration',
    column_name: 'Backlog',
    status: 'Blocked',
    position: 2,
    start_date: '2025-01-09',
    end_date: '2025-01-13',
  },
  {
    id: 'a1b2c3d4-0007-0007-0007-000000000007',
    title: 'Integration Testing',
    description: 'Run end-to-end integration tests covering all user flows and dependency scenarios',
    column_name: 'Backlog',
    status: 'Blocked',
    position: 3,
    start_date: '2025-01-14',
    end_date: '2025-01-16',
  },
  {
    id: 'a1b2c3d4-0008-0008-0008-000000000008',
    title: 'Setup CI/CD Pipeline',
    description: 'Configure GitHub Actions for automated testing and deployment on every push to main',
    column_name: 'Backlog',
    status: 'Blocked',
    position: 4,
    start_date: '2025-01-14',
    end_date: '2025-01-15',
  },
  {
    id: 'a1b2c3d4-0009-0009-0009-000000000009',
    title: 'Performance Optimization',
    description: 'Profile and optimize slow queries, add caching layer, and improve frontend bundle size',
    column_name: 'Backlog',
    status: 'Blocked',
    position: 5,
    start_date: '2025-01-17',
    end_date: '2025-01-19',
  },
  {
    id: 'a1b2c3d4-0010-0010-0010-000000000010',
    title: 'Production Deployment',
    description: 'Deploy backend to Railway and frontend to Vercel with environment variables and domain configuration',
    column_name: 'Backlog',
    status: 'Blocked',
    position: 6,
    start_date: '2025-01-20',
    end_date: '2025-01-21',
  },
];

const DEPENDENCIES = [
  { predecessor_id: 'a1b2c3d4-0001-0001-0001-000000000001', successor_id: 'a1b2c3d4-0003-0003-0003-000000000003' },
  { predecessor_id: 'a1b2c3d4-0002-0002-0002-000000000002', successor_id: 'a1b2c3d4-0003-0003-0003-000000000003' },
  { predecessor_id: 'a1b2c3d4-0001-0001-0001-000000000001', successor_id: 'a1b2c3d4-0004-0004-0004-000000000004' },
  { predecessor_id: 'a1b2c3d4-0003-0003-0003-000000000003', successor_id: 'a1b2c3d4-0005-0005-0005-000000000005' },
  { predecessor_id: 'a1b2c3d4-0004-0004-0004-000000000004', successor_id: 'a1b2c3d4-0005-0005-0005-000000000005' },
  { predecessor_id: 'a1b2c3d4-0003-0003-0003-000000000003', successor_id: 'a1b2c3d4-0006-0006-0006-000000000006' },
  { predecessor_id: 'a1b2c3d4-0005-0005-0005-000000000005', successor_id: 'a1b2c3d4-0007-0007-0007-000000000007' },
  { predecessor_id: 'a1b2c3d4-0006-0006-0006-000000000006', successor_id: 'a1b2c3d4-0007-0007-0007-000000000007' },
  { predecessor_id: 'a1b2c3d4-0007-0007-0007-000000000007', successor_id: 'a1b2c3d4-0008-0008-0008-000000000008' },
  { predecessor_id: 'a1b2c3d4-0007-0007-0007-000000000007', successor_id: 'a1b2c3d4-0009-0009-0009-000000000009' },
  { predecessor_id: 'a1b2c3d4-0008-0008-0008-000000000008', successor_id: 'a1b2c3d4-0010-0010-0010-000000000010' },
  { predecessor_id: 'a1b2c3d4-0009-0009-0009-000000000009', successor_id: 'a1b2c3d4-0010-0010-0010-000000000010' },
];

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    await client.query('BEGIN');

    // Clear existing data in the correct order to respect foreign keys
    await client.query('DELETE FROM task_dependencies');
    await client.query('DELETE FROM tasks');

    // Insert tasks using parameterized queries
    for (const task of TASKS) {
      await client.query(
        `INSERT INTO tasks (id, title, description, status, column_name, position, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          task.id,
          task.title,
          task.description,
          task.status,
          task.column_name,
          task.position,
          task.start_date,
          task.end_date,
        ]
      );
    }

    // Insert dependencies using parameterized queries
    for (const dep of DEPENDENCIES) {
      await client.query(
        `INSERT INTO task_dependencies (predecessor_id, successor_id, ai_suggested)
         VALUES ($1, $2, $3)`,
        [dep.predecessor_id, dep.successor_id, false]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${TASKS.length} tasks and ${DEPENDENCIES.length} dependencies successfully.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed, transaction rolled back:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seedDatabase };
