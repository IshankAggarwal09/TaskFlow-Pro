# Architecture, Data Model, and Known Limitations

## Architecture Overview

TaskFlow Pro is a three-layer full-stack application. The frontend is a React single-page application built with Vite, TailwindCSS, dnd-kit for drag and drop, and Axios for API calls. The backend is a Node.js and Express REST API that owns all business logic through an isolated DAG engine service module. The database is PostgreSQL persisting all task state, dependency edges, dates, and board positions.

## DAG Engine

The DAG engine lives in backend/src/services/dagEngine.js and is the core of the application. It exposes four functions. validateAndAddDependency adds a directed edge after running cycle detection via depth-first search from the proposed target node. recomputeStatus marks a task as Blocked if any predecessor is not in Done and Ready otherwise, running recursively for all downstream tasks. propagateSchedule uses Kahns algorithm to produce a topological ordering of the affected subgraph and processes each node exactly once, computing its new start date as the maximum end date across all immediate predecessors plus one day, which prevents double-counting on convergent diamond paths. recomputeOnRollback re-evaluates all downstream tasks when a completed task moves back to an earlier column.

## Data Model

The tasks table stores id as UUID primary key, title, description, status as Ready or Blocked, column_name as Backlog or In Progress or Review or Done, position as integer, start_date, end_date, and created_at timestamp.

The task_dependencies table stores id as UUID primary key, predecessor_id as foreign key referencing tasks with cascade delete, successor_id as foreign key referencing tasks with cascade delete, ai_suggested as boolean, and a unique constraint on predecessor_id and successor_id to prevent duplicate edges. Indexes exist on both predecessor_id and successor_id for fast graph traversal in both directions.

## API Endpoints

GET /api/board returns all tasks and dependency edges in a single query. POST /api/tasks creates a new task. PATCH /api/tasks/:id updates column, dates, or title and triggers DAG recomputation. DELETE /api/tasks/:id removes a task with cascading dependency cleanup. POST /api/tasks/:id/dependencies adds a dependency edge with cycle detection. DELETE /api/tasks/:id/dependencies/:depId removes an edge and recomputes status. POST /api/tasks/:id/ai-suggestions calls the Groq API to suggest likely dependencies.

## AI Integration

The AI feature calls the Groq API with the llama-3.3-70b-versatile model. The prompt grounds the model in a closed list of actual tasks on the board, restricting it from inventing tasks that do not exist. The model returns a JSON array of suggested dependencies with rationale for each. All suggestions are presented to the user for explicit approval or rejection before any edge is written to the database. Approved suggestions pass through the same cycle detection and validation as manually added dependencies. AI-suggested dependencies are labeled with a purple badge in the UI for full transparency.

## Known Limitations

Schedule propagation assumes contiguous working days with no weekend or holiday awareness. The application supports a single board and single team context. Real-time collaborative editing by multiple simultaneous users is not supported. Authentication and multi-tenancy are intentionally deferred. The AI suggestion quality depends on the clarity of task titles and descriptions.
