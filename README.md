# TaskFlow Pro

A dependency-aware Kanban board powered by a DAG scheduling engine with AI-assisted dependency suggestions

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React (Vite), TailwindCSS, Axios  |
| Backend    | Node.js, Express                  |
| Database   | PostgreSQL                        |
| AI         | Anthropic Claude API              |
| Package Mgr| npm                               |

---

## Setup Instructions

### Prerequisites
- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm >= 9.x

### 1. Clone & Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Copy the example env file in backend/
cp backend/.env.example backend/.env

# Edit backend/.env with your values:
# DATABASE_URL=postgresql://<user>:<password>@localhost:5432/taskflow
# ANTHROPIC_API_KEY=<your_key>
# PORT=3001
```

### 3. Create the Database

```bash
psql -U postgres -c "CREATE DATABASE taskflow;"
```

### 4. Run the Backend

```bash
cd backend
npm run dev
# Migrations and seed data run automatically on first start
```

### 5. Run the Frontend

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## Key Assumptions and Limitations

- **No weekend/holiday awareness in schedule propagation** — Date calculations treat all days equally; business-day logic is not implemented.
- **Single board, single team scope** — The application supports one global Kanban board with no workspace or project segmentation.
- **No real-time multi-user collaboration** — Changes made by one user are not pushed to other open sessions; a page refresh is required.
- **Authentication deferred** — There is no login or user management system in the current version; all users share the same board.

---

## AI Tool Declaration

> **Claude** (claude.ai) was used for boilerplate generation, code review, and prompt iteration. All DAG engine logic was written and reviewed by the developer.
