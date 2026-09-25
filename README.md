# TaskFlow Pro

A dependency-aware Kanban board powered by a DAG scheduling engine.

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend Setup
1. `cd backend`
2. `npm install`
3. `cp .env.example .env`
4. Fill in `DATABASE_URL` with your PostgreSQL connection string
5. Fill in `ANTHROPIC_API_KEY` with your Anthropic API key
6. `npm run dev`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Running Tests
`cd backend && npm test`

The app seeds 10 realistic tasks with dependencies automatically on first run. The board will be pre-populated when you open http://localhost:5173.
