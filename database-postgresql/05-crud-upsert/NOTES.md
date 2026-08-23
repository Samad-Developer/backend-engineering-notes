# 05 — CRUD: Create, Read, Update, Delete, Upsert
**Project:** BookEasy — PostgreSQL + raw SQL (Phase 1, Module 4 of backend roadmap)
**Approach:** Staged — one operation at a time, practiced on real BookEasy tables (`users`, `venues`, `bookings`)

---

## Stage 1 — Create (INSERT)

Already knew single-row INSERT from Module 3. New this module: **multi-row insert** — comma-separate multiple value sets in one statement instead of running INSERT repeatedly.

```sql
INSERT INTO users (full_name, email, password_hash) VALUES
('Sara Ahmed', 'sara@x.com', 'hash2'),
('Bilal Raza', 'bilal@x.com', 'hash3')
RETURNING *;
```

One round-trip to the database instead of several — useful for seeding test data.

**Also used:** `TRUNCATE TABLE ... RESTART IDENTITY CASCADE;` to reset test data and auto-increment IDs back to 1 before starting fresh practice.

---

## Stage 2 — Read (SELECT)

| Concept | SQL | Notes |
|---|---|---|
| Select everything | `SELECT * FROM users;` | |
| Select specific columns | `SELECT full_name, email FROM users;` | Better practice than `*` in real apps — only pull what's needed |
| Filter — exact match | `SELECT * FROM venues WHERE city = 'Lahore';` | |
| Filter — comparison | `SELECT * FROM venues WHERE capacity > 150;` | `>`, `<`, `>=`, `<=`, `!=` all work |
| Sort | `SELECT * FROM venues ORDER BY price_per_day DESC;` | `DESC` = highest first, `ASC` = lowest first (default) |
| Cap row count | `SELECT * FROM venues ORDER BY price_per_day DESC LIMIT 2;` | Backend half of pagination. Asking for more rows than exist is NOT an error — just returns what's available. Empty `LIMIT` with no number IS a syntax error. |

**Real mistakes made & resolved:**
- `WHERE FULL_NAME = "SAMAD"` → `ERROR: column "SAMAD" does not exist`. Cause: double quotes are for identifiers (table/column names) in SQL, not string values. Fixed with single quotes: `WHERE full_name = 'samad'`.
- `SELECT * FROM USES WHERE...` → `relation "uses" does not exist` — simple typo (`USES` instead of `USERS`), correctly rejected since the table name is exact.
- `SELECT * FROM venues LIMIT 3 ORDER BY DESC;` → syntax error — `ORDER BY` must come *before* `LIMIT`, not after, and `ORDER BY` needs a column name, not just `DESC` alone.
- **Key discovery:** SQL string matching in `WHERE` is case-sensitive by default — `'sunset hall'` matched 0 rows while `'Sunset Hall'` matched correctly.

---

## Stage 3 — Update (UPDATE)

| Concept | SQL |
|---|---|
| Update one column | `UPDATE venues SET price_per_day = 55000 WHERE name = 'Sunset Hall' RETURNING *;` |
| Update multiple columns at once | `UPDATE venues SET capacity = 220, is_active = false WHERE name = 'Sunset Hall' RETURNING *;` (comma-separated) |

**Critical danger, personally verified:** running `UPDATE venues SET is_active = false;` with **no `WHERE`** silently updated **every row in the table** (`UPDATE 3`), no confirmation, no undo. This is the single most dangerous mistake possible in SQL — always double-check the `WHERE` clause before running an UPDATE, especially on real (non-test) data.

**Real mistakes made & resolved:**
- `UPDATE venues SET is_active fasle;` and `SET is_active false;` → syntax errors. `SET column = value` always requires the `=` sign — no shortcut exists.

---

## Stage 4 — Delete (DELETE)

| Concept | SQL |
|---|---|
| Safe, targeted delete | `DELETE FROM venues WHERE name = 'Garden View' RETURNING *;` |

**Foreign key protection, personally verified:** attempted to delete a venue that still had a booking referencing it:
```sql
DELETE FROM venues WHERE id = 1;
```
Result:
```
ERROR:  update or delete on table "venues" violates foreign key constraint "bookings_venue_id_fkey" on table "bookings"
DETAIL:  Key (id)=(1) is still referenced from table "bookings".
```
This is the real-world proof of Module 1's foreign key theory and Module 3's `ON DELETE` discussion — the database physically refuses to let a deletion orphan or destroy related data, protecting against the deletion anomaly normalization was designed to prevent.

**Workaround used (with `NO ACTION`, the default):** delete the child row first (`DELETE FROM bookings WHERE id = 1;`), then the parent (`DELETE FROM venues WHERE id = 1;`) — both succeed once the reference is gone.

---

## Deep Dive — ON DELETE CASCADE (triggered by hitting the FK block above)

**Definition:** `ON DELETE CASCADE` tells Postgres — if the parent row is deleted, automatically delete all child rows referencing it too, instead of blocking the deletion.

**Where it goes:** on the foreign key column, in the CHILD table — never on the parent's `id`. The child holds the pointer, so the child declares what happens to it if what it's pointing at disappears.

**Cannot edit a constraint directly** — must `DROP CONSTRAINT` then `ADD CONSTRAINT` with the new behavior (constraints are separate rule-objects with their own name, unlike a column's type/name which CAN be edited directly via `ALTER COLUMN`/`RENAME COLUMN`).

```sql
ALTER TABLE bookings DROP CONSTRAINT bookings_venue_id_fkey;

ALTER TABLE bookings ADD CONSTRAINT bookings_venue_id_fkey
  FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;
```

**Verified working:** inserted a booking for venue `2`, then ran `DELETE FROM venues WHERE id = 2;` — succeeded (`DELETE 1`, no error), and the booking referencing venue `2` was automatically deleted too, confirmed via `SELECT * FROM bookings;` showing it gone.

**Confirmed understanding (self-summarized correctly):**
- `ON DELETE CASCADE` goes on the foreign key in the child table.
- Deleting the parent → cascades and deletes all referencing child rows.
- `NO ACTION` (default) → deleting the parent is blocked while child rows still reference it.
- Deleting a CHILD row directly is **never** blocked, with or without CASCADE — CASCADE/NO ACTION only affects what happens when the PARENT is deleted.

**Design judgment (deferred to Module 8):** whether to CASCADE or use NO ACTION is a real decision — for BookEasy, `NO ACTION` (blocking deletion until bookings are handled) is likely safer for preserving booking history than silently cascading deletes.

---

## Stage 5 — Upsert (INSERT ... ON CONFLICT)

**The problem it solves:** a normal `INSERT` on a duplicate `UNIQUE` value just errors and stops:
```sql
INSERT INTO users (full_name, email, password_hash) VALUES ('Ali Khan Updated', 'ali@x.com', 'newhash');
-- ERROR: duplicate key value violates unique constraint "users_email_key"
```

**The upsert version — insert, or update if it already exists:**
```sql
INSERT INTO users (full_name, email, password_hash)
VALUES ('Ali Khan Updated', 'ali@x.com', 'newhash')
ON CONFLICT (email)
DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash
RETURNING *;
```

**How the match is found (no WHERE needed):** `ON CONFLICT (email)` itself IS the matching condition — it targets the column that already has a `UNIQUE`/`PRIMARY KEY` constraint on it. Postgres checks incoming data against that constraint to find the conflicting row. If a table has multiple separately-unique columns, you must explicitly pick ONE as the conflict target per statement (e.g. `ON CONFLICT (email)` vs `ON CONFLICT (username)`) — Postgres never guesses which one you mean.

**What `EXCLUDED` means:** `EXCLUDED` refers to the row that was *attempted but rejected* — literally the values from your own `VALUES (...)` clause that Postgres tried and failed to insert as a new row due to the conflict. Verified with a real example: ran an upsert with `SET full_name = EXCLUDED.full_name` only (deliberately omitting `password_hash` from the SET clause) — result: `full_name` updated to the new attempted value, but `password_hash` stayed at its OLD value, proving that only columns explicitly listed in `SET` get updated from `EXCLUDED`; anything omitted keeps its prior value untouched.

**The other common variant — DO NOTHING:**
```sql
INSERT INTO users (full_name, email, password_hash)
VALUES ('Someone Else', 'ali@x.com', 'irrelevant')
ON CONFLICT (email) DO NOTHING
RETURNING *;
```
Verified: returned `0 rows`, `INSERT 0 0` — silently skipped the insert, no error, no change to the existing row. Useful when duplicates should just be ignored rather than updated or errored.

---

## Module 4 — Complete

All of the following built and personally verified with real output, in `psql`, against actual BookEasy tables:
- Single and multi-row `INSERT`
- `SELECT` with `WHERE`, comparison operators, `ORDER BY`, `LIMIT`
- `UPDATE` — single column, multiple columns, and the no-WHERE danger case
- `DELETE` — safe targeted delete, foreign-key-blocked delete, and `ON DELETE CASCADE` (both configured live and tested)
- `INSERT ... ON CONFLICT` — both `DO UPDATE` (with `EXCLUDED`) and `DO NOTHING`

---

## Next Up
**Module 5 — Auth from Scratch** (bcrypt, JWT, cookies) — OR continuing the database roadmap toward **Module 6 — Foreign Keys and JOINs** (querying across multiple related tables), depending on chosen path. Confirm which comes next before proceeding.