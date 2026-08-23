# 04 — Designing Tables: DDL, Constraints, Data Types 
**Project:** BookEasy — PostgreSQL + raw SQL (Phase 1, Module 4 of backend roadmap)
**Approach:** Staged — practiced each concept on throwaway tables first, then applied everything to BookEasy's real schema

---

## Why This Module Was Staged

Originally tried to teach table design, all table commands, all constraints, and all data types together in one go — this caused confusion. Restarted with a clearer structure:

1. CREATE TABLE basics (one simple table)
2. All table-modification commands (ALTER/DROP/TRUNCATE) — practiced on a throwaway table
3. All constraints (NOT NULL, UNIQUE, CHECK, DEFAULT) — practiced one at a time
4. All data types — one table, one column per type
5. BookEasy's real tables — combining everything above

---

## Stage 1 — CREATE TABLE Basics

`CREATE TABLE` is **DDL (Data Definition Language)** — the category of SQL that defines structure, as opposed to DML (`INSERT`/`SELECT`/`UPDATE`/`DELETE`) which works with data inside that structure.

Basic syntax:
```sql
CREATE TABLE practice (
  id SERIAL PRIMARY KEY,
  note TEXT
);
```

Checked structure with:
```sql
\d practice
```

---

## Stage 2 — Table Modification Commands

Practiced live on the same `practice` table, one command at a time.

| Command | What it does |
|---|---|
| `ALTER TABLE t ADD COLUMN col TYPE` | Add a new column to an existing table |
| `ALTER TABLE t RENAME COLUMN old TO new` | Rename a column |
| `ALTER TABLE t ALTER COLUMN col TYPE newtype` | Change a column's data type (TYPE-only — cannot combine with NOT NULL/CHECK in the same clause) |
| `ALTER TABLE t DROP COLUMN col` | Remove a column |
| `ALTER TABLE t RENAME TO newname` | Rename the whole table |
| `TRUNCATE TABLE t` | Delete all rows, KEEP the table structure |
| `DROP TABLE t` | Delete the entire table, structure and all |
| `ALTER TABLE t ADD CONSTRAINT name CHECK (...)` | Add a constraint to an already-existing column |
| `ALTER TABLE t ALTER COLUMN col SET DEFAULT value` | Add/change a default on an existing column |

**Key distinction learned:** `TRUNCATE` empties a table but the table still exists (`\d` still shows it). `DROP` removes the table entirely (`\dt` no longer lists it).

---

## Stage 3 — Constraints

Practiced on a fresh `practice2` table:
```sql
CREATE TABLE practice2 (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE,
  age INTEGER CHECK (age >= 0),
  role TEXT DEFAULT 'member'
);
```

| Constraint | Job | Verified behavior |
|---|---|---|
| `NOT NULL` | Column can never be empty | Insert without `username` → rejected |
| `UNIQUE` | No two rows can share this value | Duplicate `email` → rejected |
| `CHECK (condition)` | Only accept values matching a custom rule | `age = -5` → rejected |
| `DEFAULT 'value'` | Auto-fill if no value given | Omitted `role` → auto-filled `'member'` |

**Q&A resolved during this stage:**
- Space before `(` in `VALUES (` — not mandatory, purely stylistic; SQL ignores extra whitespace.
- CAPS for SQL keywords (`CREATE TABLE` vs `create table`) — pure convention, SQL is case-insensitive for keywords. Caps used only so keywords are visually distinct from table/column names.
- Leaving fields empty on insert — allowed for any column without `NOT NULL`. `NULL` is a valid, intentional value meaning "no value given," not a broken row.
- Who fills in `DEFAULT` values — Postgres itself, automatically, at insert time. Not the app, not manual typing.

---

## Stage 4 — Data Types

Practiced on `practice3`, one column per type:
```sql
CREATE TABLE practice3 (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(5),
  full_text TEXT,
  price NUMERIC(10,2),
  rating REAL,
  is_available BOOLEAN,
  event_date DATE,
  event_time TIME,
  event_datetime TIMESTAMPTZ,
  unique_ref UUID,
  extra_data JSONB
);
```

| Type | Meaning | Notes |
|---|---|---|
| `VARCHAR(n)` | Text, max n characters | Enforced — exceeding it errors: `value too long for type character varying(n)` |
| `TEXT` | Text, no length limit | Default text choice |
| `NUMERIC(precision, scale)` | Exact decimal | `precision` = total digits allowed (before + after decimal combined); `scale` = digits after the decimal. Exceeding total digits → `numeric field overflow` error. Exceeding decimal places → silently rounds, does NOT error (e.g. `100.999` → stored as `101.00`) |
| `REAL` / `DOUBLE PRECISION` | Approximate decimal | Fine for ratings/measurements; NEVER use for money due to rounding drift (e.g. `0.1 + 0.2` may not equal exactly `0.3`) |
| `BOOLEAN` | true/false | |
| `DATE` | Calendar date only | |
| `TIME` | Clock time only | |
| `TIMESTAMPTZ` | Date + time + timezone | Preferred over plain `TIMESTAMP` for anything user-facing |
| `UUID` | Random unique identifier | Generated via `gen_random_uuid()` — rarely typed by hand |
| `JSONB` | Actual JSON stored in one column | Use sparingly — overuse undermines normalization |

**Rule of thumb (money vs. general decimals):** `NUMERIC` for money or anything needing exactness. `REAL`/`DOUBLE PRECISION` for ratings, measurements, or anywhere small rounding drift is harmless.

---

## Stage 5 — BookEasy's Real Schema

Final, combined schema applying everything above:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE venues (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  price_per_day NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  venue_id INTEGER NOT NULL REFERENCES venues(id),
  booking_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Design decisions:
- `venues.capacity` — `CHECK (capacity > 0)`, a venue can't have zero/negative capacity
- `venues.price_per_day` and `bookings.total_price` — both `NUMERIC(10,2)` for exact money storage
- `bookings.status` — defaults to `'pending'` automatically
- Foreign keys (`REFERENCES users(id)`, `REFERENCES venues(id)`) — basic inline form; named constraints and `ON DELETE` actions deliberately deferred to Module 8 (Data Integrity Deep-Dive)

---

## Foreign Key Syntax — Two Forms (Noted, Not Yet Applied)

Two valid ways to write a foreign key exist in PostgreSQL:

**Inline shorthand (what's used in BookEasy currently):**
```sql
user_id INTEGER NOT NULL REFERENCES users(id)
```
Postgres auto-generates the constraint's internal name (e.g. `bookings_user_id_fkey`).

**Explicit named form (seen in Neon docs, not yet applied to BookEasy):**
```sql
CONSTRAINT fk_user
  FOREIGN KEY (user_id)
  REFERENCES users(id)
```
Same enforcement, but the constraint gets a name you choose — useful later when referencing it directly (e.g. to drop or modify it).

Both are equally valid. Explicit naming and `ON DELETE` actions (`CASCADE`, `SET NULL`, `RESTRICT`, `NO ACTION`, `SET DEFAULT`) are real topics, formally covered in Module 8.

**Also noted:** `GENERATED ALWAYS AS IDENTITY` is an alternate, SQL-standard way to write an auto-incrementing primary key — functionally equivalent to `SERIAL`. Recognition only; BookEasy continues using `SERIAL`.

---

## Real Issues Encountered & Fixes (Genuine Learning Signal)

| Issue | Cause | Fix |
|---|---|---|
| `ALTER TABLE venues ADD COLUMN price_per_day NUMERIC(10,2) NOT NULL;` → `ERROR: column "price_per_day" of relation "venues" contains null values` | Table already had existing rows; a new `NOT NULL` column has nothing to fill them with | Either add `DEFAULT 0` so existing rows auto-fill, or `TRUNCATE TABLE venues CASCADE;` first (used this, since data was test-only) |
| `ALTER TABLE venues ALTER COLUMN capacity TYPE INTEGER NOT NULL CHECK (capacity > 0);` → `ERROR: syntax error at or near "NOT"` | `ALTER COLUMN ... TYPE` can only change the type — cannot attach `NOT NULL` or `CHECK` in the same clause | Split into separate statements; used `ALTER TABLE venues ADD CONSTRAINT capacity_positive CHECK (capacity > 0);` instead |
| `ALTER TABLE bookings ADD COLUMN status TYPE TEXT NOT NULL DEFAULT 'pending';` → `ERROR: syntax error at or near "TEXT"` | The word `TYPE` is only used with `ALTER COLUMN ... TYPE` (changing an existing column). When *adding* a new column, the type follows the column name directly, no `TYPE` keyword | `ALTER TABLE bookings ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';` |
| First `products` practice task — `created_at TIMESTAMPTZ` with no default | Declared the type but forgot `DEFAULT NOW()`, so the column stayed empty on insert | `ALTER TABLE products ALTER COLUMN created_at SET DEFAULT NOW();` |

---

## Self-Test: `products` Table Task

Task given: design a table combining PK, NOT NULL, UNIQUE, CHECK, DEFAULT, and multiple data types in one build.

Result (first attempt, one bug found and fixed):
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku VARCHAR(10) UNIQUE,
  price NUMERIC(8,2),
  stock_quantity INTEGER CHECK (stock_quantity >= 0),
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()  -- originally missing DEFAULT NOW(), fixed via ALTER
);
```
6 of 7 requirements correct on first attempt; the `created_at` default was the one miss, caught by testing an actual insert and noticing the column came back empty.

---

## Module 3 — Complete

All of the following built, tested, and verified with real error messages, by hand, in `psql`:
- `users`, `venues`, `bookings` — BookEasy's real schema
- All constraint types (NOT NULL, UNIQUE, CHECK, DEFAULT, basic FOREIGN KEY)
- Full data type range (TEXT, VARCHAR, NUMERIC, REAL, BOOLEAN, DATE, TIME, TIMESTAMPTZ, UUID, JSONB)
- Full ALTER TABLE family, TRUNCATE, DROP

---

## Next Up
**Module 4 — CRUD**: formal `SELECT`, `WHERE`, `UPDATE`, `DELETE`, and `INSERT ... ON CONFLICT` (UPSERT). Parameterized queries (`$1, $2`) and SQL injection — the "what breaks without it" for this module.