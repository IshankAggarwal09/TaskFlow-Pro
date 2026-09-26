# TaskFlow Pro

A dependency-aware Kanban board powered by a DAG scheduling engine with AI-assisted dependency suggestions.

## Live Demo

[Open TaskFlow Pro](https://task-flow-pro-azure-theta.vercel.app)

## Features

- Four-column Kanban board (Backlog, In Progress, Review, Done)
- DAG-based dependency engine with cycle detection
- Automatic schedule propagation using topological sort (no double-counting on diamond paths)
- Rollback re-blocking when completed tasks regress
- AI-powered dependency suggestions with human-in-the-loop validation
- Critical Path highlighting
- Fully responsive — works on mobile, tablet, and desktop
- Persistent state via PostgreSQL

## Tech Stack

- Frontend: React (Vite), TailwindCSS, dnd-kit, Axios
- Backend: Node.js, Express
- Database: PostgreSQL
- AI: Groq API (llama-3.3-70b-versatile)
- Deployment: Vercel (frontend), Railway (backend and database)

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Backend Setup

1. cd backend
2. npm install
3. cp .env.example .env
4. Fill in DATABASE_URL with your PostgreSQL connection string
5. Fill in GROQ_API_KEY with your Groq API key from console.groq.com
6. npm run dev

### Frontend Setup

1. cd frontend
2. npm install
3. npm run dev

### Running Tests

cd backend && npm test

The app seeds 10 realistic tasks with dependencies automatically on first run. The board will be pre-populated when you open http://localhost:5173.

## Architecture

The DAG engine is the core of this application. It lives in backend/src/services/dagEngine.js and exposes four functions:

- validateAndAddDependency: adds edges after cycle detection via depth-first search
- recomputeStatus: marks tasks Ready or Blocked based on predecessor states
- propagateSchedule: updates downstream dates using Kahn topological sort to prevent double-counting on convergent paths
- recomputeOnRollback: re-blocks downstream tasks when a completed task regresses

## Seed Data

The app automatically seeds 10 realistic tasks representing a software project lifecycle with a rich dependency graph including diamond patterns to demonstrate correct schedule propagation.

## AI Tool Declaration

Claude (claude.ai) was used for debugging assistance and code review during development. All DAG engine logic, graph algorithms, API design, and core business rules were independently designed and implemented by the developer. Groq API (llama-3.3-70b-versatile) is used within the application for AI-powered dependency suggestions as a product feature. AI-suggested dependencies are clearly labeled in the UI with a purple badge and require explicit human approval before being added to the dependency graph.

## Key Assumptions and Limitations

- Schedule propagation assumes contiguous working days with no weekend or holiday awareness
- Single board, single team context in the current build
- No real-time collaborative editing for simultaneous users
- Authentication and multi-tenancy are intentionally deferred
- AI suggestions require a valid GROQ_API_KEY in the backend environment
