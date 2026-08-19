# Database Learning Roadmap (PostgreSQL + Raw SQL)

Part of my backend learning journey — **Phase 1, Module 4: PostgreSQL + Raw SQL (no ORM)**.

This roadmap takes me from zero database knowledge to building a complete data layer in raw SQL, and sets up the later Prisma / Redis / pgvector phases without needing to relearn fundamentals.

## How I Learn Each Module

For every module, the teaching order is:

1. Concept explained in plain, simple words — before any code
2. Where the underlying need/problem actually comes from
3. What goes wrong in practice if it isn't used
4. Real, working code I can run and verify myself

## Stack

- TypeScript throughout (ESM, `"type": "module"`, `verbatimModuleSyntax`)
- Node running `.ts` files directly in dev, `tsc` for type-checking only
- PostgreSQL + `pg` driver (raw SQL, no ORM in this phase)
- Project: **BookEasy** — a booking app, raw SQL, JWT auth from scratch

---

## Stage A — Foundations (Mental Model, Minimal Code)

### Module 1 — Core Concepts (No Code)
- Tables, rows, columns, schema
- Primary keys (uniquely identifying one row)
- Foreign keys (how one table points to another — the meaning of "relational")
- Relationship shapes: one-to-many, many-to-many
- **Goal:** make SQL feel like expressing ideas I already understand, not memorizing magic

### Module 2 — Install, Connect, and the Two Ways to Talk to Postgres
- Getting Postgres installed and running
- `psql` (CLI, for poking at the DB by hand)
- `pg` driver (for the Express app to talk to it in code)
- Understanding both are just clients connecting to the same server on port 5432
- Env-based config so no passwords sit in code

---

## Stage B — Speaking SQL Against One Table

### Module 3 — Designing a Table (DDL) + Postgres Data Types
- `CREATE TABLE`
- Choosing types deliberately: `SERIAL` / `IDENTITY`, `TEXT`, `INTEGER`, `BOOLEAN`, `TIMESTAMPTZ`, `UUID`, `JSONB`
- Declaring constraints at creation: `NOT NULL`, `PRIMARY KEY`, `DEFAULT`
- **Deliverable:** design BookEasy's first real table — `users`

### Module 4 — CRUD on a Single Table
- `INSERT`, `SELECT`, `UPDATE`, `DELETE`
- Parameterized queries (`$1, $2`) and *why*
- **What breaks without it:** SQL injection (not optional knowledge)

### Module 5 — Querying: Filtering, Sorting, Limiting
- `WHERE` operators: `=`, `<`, `IN`, `LIKE`, `IS NULL`
- `ORDER BY`
- `LIMIT` / `OFFSET` (how backend pagination actually works)

---

## Stage C — Relationships (The Heart of Relational Databases)

### Module 6 — Foreign Keys and JOINs
- Splitting data across tables and linking them
- `INNER JOIN` vs `LEFT JOIN` and when each matters
- Modeling one-to-many (a user has many bookings)
- Modeling many-to-many (via a join table)
- **Goal:** actually understand "relational"

### Module 7 — Aggregation and Grouping
- `COUNT`, `SUM`, `AVG`
- `GROUP BY`, `HAVING`
- Answering questions like "bookings per venue" without looping in Node

---

## Stage D — Correctness and Safety (Junior → Solid)

### Module 8 — Data Integrity Deep-Dive
- `UNIQUE`, `CHECK` constraints
- Foreign-key actions: `ON DELETE CASCADE` / `RESTRICT`
- Letting the database enforce rules so bad data literally cannot get in

### Module 9 — Transactions
- `BEGIN` / `COMMIT` / `ROLLBACK`
- Atomicity
- **Highlight:** solve the double-booking race condition — the core problem a booking app must get right

### Module 10 — Indexes and Performance
- What an index really is
- Why lookups are slow without one
- Reading `EXPLAIN` output
- When to add an index (and the cost of over-indexing)

---

## Stage E — Real Application Structure

### Module 11 — Schema Evolution (Hand-Written Migrations)
- Changing a live schema safely with plain, ordered SQL migration files
- Doing it by hand *before* Prisma, so Prisma's migrations aren't a black box later

### Module 12 — Structuring DB Code in a TypeScript/Express App
- Where queries live (repository / data-access layer)
- Managing the connection pool correctly
- Typing query results
- Centralizing DB error handling

### Module 13 — Capstone: BookEasy Data Layer, End to End
- Wire Modules 3–12 into one coherent backend
- Users, venues, bookings with real relationships
- Transactions on booking creation
- Proper structure — the portfolio proof piece

---

## Deferred to Phase 2 / 3

Deliberately postponed to avoid overload now. Each builds on the raw-SQL foundation above, which is exactly why raw SQL comes first.

- Prisma ORM
- Redis caching
- Connection pooling at scale (PgBouncer)
- Replication / backups
- `pgvector` / embeddings (for the AI phase)

---

## Pace

- Roughly **2–4 modules per week**, ~4–5 weeks total
- Progress is driven by understanding, not the calendar
- Each module's working code + a `NOTES.md` summary lives in a dated folder