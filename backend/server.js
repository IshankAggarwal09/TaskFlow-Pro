require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./src/db/index');
const { runMigrations } = require('./src/db/migrations');
const { seedDatabase } = require('./src/db/seed');

const boardRouter = require('./src/routes/board');
const tasksRouter = require('./src/routes/tasks');
const dependenciesRouter = require('./src/routes/dependencies');
const aiRouter = require('./src/routes/ai');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
app.use(cors({ origin: allowedOrigins }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
app.use(express.json());

// Request validation middleware
app.use((req, res, next) => {
  if (['POST', 'PATCH'].includes(req.method)) {
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', boardRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/tasks', dependenciesRouter);
app.use('/api/tasks', aiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error.' });
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

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  initialize();
}

module.exports = app;
