# Database Learning Roadmap (PostgreSQL + Raw SQL) — v2

Part of my backend learning journey — **Phase 1, Module 4: PostgreSQL + Raw SQL (no ORM)**.

Revised after cross-checking against established SQL/PostgreSQL curricula (roadmap.sh, postgresqltutorial.com, GeeksforGeeks, DataCamp) to catch gaps missed in v1. Changes from v1 are marked **[NEW]**.

## How I Learn Each Module

1. Concept explained in plain, simple words — before any code
2. Where the underlying need/problem actually comes from
3. What goes wrong in practice if it isn't used
4. Real, working code I can run and verify myself, with diagrams/tables where useful — not walls of text

## Stack

- TypeScript throughout (ESM, `"type": "module"`, `verbatimModuleSyntax`)
- Node running `.ts` files directly in dev, `tsc` for type-checking only
- PostgreSQL + `pg` driver (raw SQL, no ORM in this phase)
- Project: **BookEasy** — a booking app, raw SQL, JWT auth from scratch

---

## Stage A — Foundations (Mental Model, Minimal Code)

### Module 1 — Core Concepts (No Code)
- Tables, rows, columns, schema
- Primary keys
- **Foreign keys** — how one table points to another
- **All relationship shapes**: one-to-one, one-to-many (= many-to-one, same relationship viewed from either side), many-to-many (via join table) **[NEW: one-to-one and many-to-one explicitly called out]**
- **Types of keys** — primary, foreign, candidate, unique, composite, natural, surrogate **[NEW: full key vocabulary, not just primary/foreign]**

### Module 2 — Install, Connect, and the Two Ways to Talk to Postgres
- Getting Postgres installed and running
- `psql` (CLI) vs `pg` driver (from Express code) — both just clients on port 5432
- Env-based config, no passwords in code

### Module 2.5 — Normalization **[NEW MODULE]**
- What "redundant/duplicated data" actually costs you (update anomalies — change one thing, forget to change its copy elsewhere)
- 1NF, 2NF, 3NF explained practically, not academically — what each one actually fixes
- When to deliberately break normalization (denormalize) for performance — and why that's a Phase 2/3 decision, not a beginner one
- This sits right after Module 2 because it explains *why* we split into tables at all, before we design our first one in Module 3

---

## Stage B — Speaking SQL Against One Table

### Module 3 — Designing a Table (DDL) + Postgres Data Types
- `CREATE TABLE`
- Types: `SERIAL`/`IDENTITY`, `TEXT`, `INTEGER`, `BOOLEAN`, `TIMESTAMPTZ`, `UUID`, `JSONB`
- Constraints at creation: `NOT NULL`, `PRIMARY KEY`, `DEFAULT`
- **Deliverable:** design BookEasy's `users` table

### Module 4 — CRUD on a Single Table
- `INSERT`, `SELECT`, `UPDATE`, `DELETE`
- Parameterized queries (`$1, $2`) — SQL injection is the "what breaks" here
- **[NEW]** `UPSERT` (`INSERT ... ON CONFLICT`) — insert-or-update in one atomic statement, a real Postgres feature you'll actually use

### Module 5 — Querying: Filtering, Sorting, Limiting
- `WHERE` operators: `=`, `<`, `IN`, `LIKE`, `IS NULL`
- `ORDER BY`
- `LIMIT` / `OFFSET` — how backend pagination actually works

---

## Stage C — Relationships (The Heart of Relational Databases)

### Module 6 — Foreign Keys and JOINs
- Splitting data across tables and linking them (the practical, coded version of Module 1's theory)
- `INNER JOIN`, `LEFT JOIN`, and **[NEW]** a short mention of `RIGHT JOIN` / `FULL OUTER JOIN` / self-join / cross-join — so I recognize them even if I don't use them daily
- Modeling one-to-many, one-to-one, and many-to-many (join table) in real SQL

### Module 7 — Aggregation and Grouping
- `COUNT`, `SUM`, `AVG`
- `GROUP BY`, `HAVING`
- "Bookings per venue" without looping in Node

### Module 7.5 — Subqueries and CTEs **[NEW MODULE]**
- A query nested inside another query — where it's actually needed (e.g. "users who have never booked anything")
- Common Table Expressions (`WITH ... AS`) — same idea, written readably instead of nested and tangled
- Why this matters for BookEasy: multi-step logic (like checking availability) is often cleaner as a CTE than as application code doing multiple round trips

---

## Stage D — Correctness and Safety (Junior → Solid)

### Module 8 — Data Integrity Deep-Dive
- `UNIQUE`, `CHECK` constraints
- Foreign-key actions: `ON DELETE CASCADE` / `RESTRICT`
- Composite keys in practice (the join table's real primary key)

### Module 9 — Transactions
- `BEGIN` / `COMMIT` / `ROLLBACK`, atomicity
- **Highlight:** solving the double-booking race condition — the core correctness problem for a booking app

### Module 10 — Indexes and Performance
- What an index is, why lookups are slow without one
- Reading `EXPLAIN` output
- When to add one, and the cost of over-indexing

---

## Stage E — Real Application Structure

### Module 11 — Views **[NEW MODULE]**
- A saved, reusable query that behaves like a virtual table
- Where it earns its keep: hiding a complex JOIN behind a simple name, or restricting which columns a part of the app can see
- Kept intentionally light — full materialized views and refresh strategies are a Phase 2/3 performance topic

### Module 12 — Schema Evolution (Hand-Written Migrations)
- Changing a live schema safely with ordered SQL migration files
- Doing it by hand *before* Prisma, so its migrations aren't a black box later

### Module 13 — Structuring DB Code in a TypeScript/Express App
- Repository / data-access layer
- Managing the connection pool correctly
- Typing query results, centralizing DB error handling

### Module 14 — Capstone: BookEasy Data Layer, End to End
- Wire Modules 3–13 into one coherent backend: users, venues, bookings
- Real relationships, transactions on booking creation, proper structure
- The portfolio proof piece

---

## Deliberately Deferred to Phase 2 / 3

Each builds on this raw-SQL foundation — which is why raw SQL comes first.

- Prisma ORM
- Redis caching
- Connection pooling at scale (PgBouncer)
- Replication / backups
- Stored procedures, triggers, PL/pgSQL **[NEW: explicitly named as deferred, not silently dropped]**
- Window functions **[NEW: explicitly named as deferred]**
- `pgvector` / embeddings (AI phase)

---
