# 01 — Core Concepts: Tables, Keys, Relationships
**Project:** BookEasy — PostgreSQL + raw SQL (Phase 1, Module 4 of backend roadmap)
**Type:** Concepts only — no code, no installation

---

## Table, Row, Column, Schema

| Concept | What it is | Example (users table) |
|---|---|---|
| Table | One kind of thing | `users` |
| Column | One attribute, fixed type | `id`, `name`, `email` |
| Row | One actual item | `(1, "Ali Khan", "ali@x.com")` |
| Schema (as concept) | The declared blueprint — enforced by the DB on every row | "every user MUST have id, name, email" |

Key difference from JSON files: a JSON file enforces nothing — objects can have different shapes with nothing stopping it. A relational database declares the schema once and **refuses** any row that breaks it.

## Primary Key
- A column guaranteed unique per row, never empty (usually `id`).
- It's the permanent handle other tables use to point at this exact row.
- Solves the problem of two rows having identical human-readable data (e.g. two users both named "Ali Khan") — the id can never collide, the name can.

## Foreign Key
- A column that stores another table's **primary key**, to link rows across tables instead of duplicating data.
- Example: `bookings.user_id` stores the `id` of the user that booking belongs to — not the user's name/email copied in.
- Why this matters: if you copied user details into every booking instead, an email update would leave old bookings with stale, incorrect data. Storing just the id keeps one single source of truth.
- The database enforces the relationship: it will refuse to insert a booking whose `user_id` doesn't match a real, existing user.

## Relationship Types (all three)

| Relationship | Real example | How it's built |
|---|---|---|
| One-to-one | One user has exactly one profile | Foreign key on the "child" table, marked `UNIQUE` |
| One-to-many (= many-to-one, same relationship viewed from the other side) | One user has many bookings | Plain foreign key on the "many" side (`bookings.user_id`) |
| Many-to-many | Many users can like many interests | Requires a third **join table** in the middle, holding two foreign keys |

The join table's primary key is often a **composite key** — the *pair* of both foreign keys together (e.g. `(user_id, interest_id)`), since neither column alone is unique, but the pair must never repeat.

## Types of Keys — Full Vocabulary

| Key type | Meaning | Example |
|---|---|---|
| Primary key | Column(s) chosen to uniquely identify each row | `id` |
| Foreign key | Column storing another table's primary key, to link rows | `bookings.user_id` |
| Candidate key | Any column(s) that *could* have been the primary key (unique) — one gets chosen, others remain candidates | `id` and `email` both unique on `users`; `id` chosen |
| Unique key | A candidate key not chosen as primary, but still enforced unique | `email` |
| Composite key | A primary key made of more than one column together | `(user_id, interest_id)` in a join table |
| Natural key | A real-world value used as the key | `email`, national ID number |
| Surrogate key | A meaningless, DB-generated value used purely for identity | auto-incrementing `id` |

## Database / Schema Hierarchy (the container structure)

```
Postgres Server (one running process, port 5432)
  └── Database (e.g. "bookeasy") — an isolated container
        └── Schema (default: "public") — a namespace inside that database
              └── Tables (users, bookings, venues...)
```

- One running Postgres server can host multiple, fully isolated databases at once.
- "Schema" is used two ways: (1) the general *design/blueprint* concept covered above, and (2) a literal Postgres object (a namespace inside a database, default `public`) that tables live in. Beginners rarely touch (2) directly, but it explains why `public.users` shows up in output.

---

## Still To Come (Next: 03-normalization)
- Why splitting into tables prevents data duplication and update anomalies (1NF/2NF/3NF, practically explained)