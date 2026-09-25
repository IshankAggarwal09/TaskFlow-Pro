require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./src/db/index');
const { runMigrations } = require('./src/db/migrations');
const { seedDatabase } = require('./src/db/seed');
const tasksRouter = require('./src/routes/tasks');
const dependenciesRouter = require('./src/routes/dependencies');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use('/tasks', tasksRouter);
app.use('/dependencies', dependenciesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Graceful startup: run migrations then conditionally seed
async function initialize() {
  try {
    await runMigrations();

    // Only seed if the tasks table is empty
    const result = await pool.query('SELECT COUNT(*) AS count FROM tasks');
    const taskCount = parseInt(result.rows[0].count, 10);

    if (taskCount === 0) {
      console.log('Tasks table is empty. Running seed...');
      await seedDatabase();
    } else {
      console.log(`Tasks table already has ${taskCount} row(s). Skipping seed.`);
    }

    app.listen(PORT, () => {
      console.log(`TaskFlow Pro backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

initialize();
