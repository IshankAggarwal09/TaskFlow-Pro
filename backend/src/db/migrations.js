const pool = require('./index');

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Running database migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Ready' CHECK (status IN ('Ready', 'Blocked')),
        column_name TEXT NOT NULL DEFAULT 'Backlog' CHECK (column_name IN ('Backlog', 'In Progress', 'Review', 'Done')),
        position INTEGER NOT NULL DEFAULT 0,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        predecessor_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        successor_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        ai_suggested BOOLEAN DEFAULT FALSE,
        UNIQUE(predecessor_id, successor_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dep_predecessor ON task_dependencies(predecessor_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dep_successor ON task_dependencies(successor_id);
    `);

    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
