TaskFlow Pro Submission Checklist

Functional Correctness
- Cycle detection rejects invalid dependencies with clear error message
- Diamond pattern A to B, A to C, B to D, C to D: D shifts by upstream amount not doubled
- Rollback from Done re-blocks all downstream dependents
- Board state persists across browser refresh
- Drag and drop updates persist to database

Code Quality
- DAG engine is an isolated service module
- All SQL uses parameterized queries
- Error handling in all async routes
- No hardcoded secrets

AI Usage
- Claude API integrated for dependency suggestions
- Suggestions require human approval before graph write
- AI-suggested deps labeled with purple badge in UI
- Graceful fallback when API unavailable
- AI Tool Declaration in README

Security
- API key in environment variable only
- Security headers on all responses
- No .env committed to git
- SQL injection prevented via parameterized queries

Documentation
- README with setup instructions complete
- Architecture section explains DAG engine
- Key Assumptions and Limitations documented
- AI Tool Declaration present

Testing
- DAG engine unit tests for cycle detection and diamond propagation
- API integration tests for core endpoints
- Error cases tested (cycle, self-dep, not found)
