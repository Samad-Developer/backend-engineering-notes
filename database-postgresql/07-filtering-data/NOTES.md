# 06 — Querying: Filtering, Sorting, Limiting (Module 5)
**Project:** BookEasy — PostgreSQL + raw SQL (Phase 1, Module 4 of backend roadmap)
**Note:** Basic `WHERE =`, `WHERE >`, `ORDER BY`, `LIMIT` were first touched during Module 4 (CRUD). This module completes the full filtering/sorting toolkit with everything that was still missing: `IN`, `LIKE`, `IS NULL`, `BETWEEN`, `OFFSET`.

---

## IN — matching against a list of values

**The problem it solves:** without `IN`, matching several possible values means chaining multiple `OR` conditions:
```sql
WHERE city = 'Lahore' OR city = 'Karachi'
```
`IN` does the same thing, more cleanly:
```sql
SELECT * FROM venues WHERE city IN ('Lahore', 'Karachi');
```
Real output:
```
 id |    name     |  city  | capacity | price_per_day | is_active |          created_at
----+-------------+--------+----------+---------------+-----------+-------------------------------
  1 | Sunset Hall | Lahore |      220 |      55000.00 | t         | 2026-08-23 11:46:52.313464+00
```
Any row whose `city` matches ANY value in the list gets returned. Scales much better than `OR` once the list grows past 2–3 items.

---

## LIKE — text pattern matching

**The problem it solves:** `=` only matches an exact, complete string. `LIKE` lets you match text that follows a *pattern*, using `%` as a wildcard meaning "any characters, any length (including zero)."

```sql
SELECT * FROM users WHERE full_name LIKE 'S%';
```
Real output:
```
 id | full_name  |   email    | password_hash | is_active |          created_at
----+------------+------------+---------------+-----------+-------------------------------
  2 | Sara Ahmed | sara@x.com | hash2         | t         | 2026-08-23 10:53:49.734654+00
```
`'S%'` reads as "starts with S, then anything after." Matched "Sara Ahmed," correctly skipped "Ali Khan" and "Bilal Raza."

Other patterns you can build the same way:
- `'%hmed'` → ends with "hmed"
- `'%ar%'` → contains "ar" anywhere in the string

**Important limit:** `LIKE` only works on **text/string columns**. It's a string pattern-matching tool — it has no meaning against numbers, dates, or booleans. If you needed to pattern-match a number, you'd have to cast it to text first (rare, not needed for BookEasy right now).

---

## IS NULL / IS NOT NULL — checking for missing values

**Why this needs its own operator instead of `=`:** in SQL, `NULL` doesn't mean "empty string" or "zero" — it means "unknown / no value was given." Because of that, comparing anything to `NULL` using `=` doesn't work the way you'd expect — `WHERE column = NULL` will never match, even on rows where that column genuinely has no value. This is a real SQL quirk worth remembering. `IS NULL` / `IS NOT NULL` are the only correct way to check.

```sql
SELECT * FROM venues WHERE price_per_day IS NULL;
```
Real output: `(0 rows)` — none of the venues had a missing price (correctly, since `price_per_day` is `NOT NULL` in the schema).

```sql
SELECT * FROM venues WHERE price_per_day IS NOT NULL;
```
Real output: returned both venues — confirming the flip side works too.

---

## BETWEEN — filtering within a range

**The problem it solves:** shorthand for two comparisons combined with `AND`.

```sql
SELECT * FROM venues WHERE price_per_day BETWEEN 3000 AND 40000;
```
Real output:
```
 id |    name     |   city    | capacity | price_per_day | is_active |          created_at
----+-------------+-----------+----------+---------------+-----------+-------------------------------
 34 | Garden View | Islamabad |      100 |      30000.00 | t         | 2026-08-23 14:25:11.414268+00
```

Verified this is exactly equivalent to writing it out manually:
```sql
SELECT * FROM venues WHERE price_per_day >= 3000 AND price_per_day <= 40000;
```
Same identical result — confirmed by running both side by side.

**Important detail:** `BETWEEN` is **inclusive on both ends** — a value of exactly `3000` or exactly `40000` would still match, not be excluded.

**`BETWEEN` is not just for numbers** — it works on any type that has a natural ordering (i.e., a meaningful "greater than / less than"):
- Numbers (shown above)
- Dates: `WHERE booking_date BETWEEN '2026-09-01' AND '2026-09-30'` — will be genuinely useful later for BookEasy availability queries
- Even text, compared alphabetically: `WHERE full_name BETWEEN 'A' AND 'M'`

Meanwhile `LIKE` is the opposite case — it ONLY works on text, since pattern wildcards have no meaning for numbers or dates.

---

## ORDER BY and LIMIT/OFFSET

```sql
SELECT * FROM venues ORDER BY price_per_day DESC LIMIT 1 OFFSET 1;
```

- `ORDER BY column DESC` sorts highest to lowest; `ASC` (the default if you omit it) sorts lowest to highest.
- `LIMIT n` caps how many rows come back. Asking for more rows than actually exist is NOT an error — it just returns whatever is available (tested: `LIMIT 5` on a 3-row table returned all 3, no error).
- `OFFSET n` skips the first `n` rows **entirely** — they're excluded from the result — and `LIMIT` starts counting fresh from the row right after that. Tested directly: `OFFSET 1` skipped the first venue and returned the second, confirming the skipped row is excluded, not included.

### Does row order depend on primary key or insertion order?

This came up as a real point of confusion worth documenting properly, because the honest answer has two layers.

**What was observed, for real:** a `venues` table that had only ever had rows inserted into it (no deletes) displayed rows in what looked exactly like insertion order, every time, with no `ORDER BY` applied. This is a genuine, accurate observation — not imagined.

**Why it's still not something to rely on:** Postgres does not *guarantee* this order as part of SQL's rules. What's actually happening is that rows are physically stored on disk in whatever order Postgres finds efficient at the time, and for a table that's only ever grown by insertion (nothing deleted, nothing updated in a way that moves rows), that storage order *happens* to line up with insertion order. The moment a row is deleted and a new row is inserted later, Postgres may reuse that now-empty space instead of appending to the end — silently breaking the pattern that looked so reliable moments before. Official Postgres documentation is explicit: row order is undefined without `ORDER BY`.

**The practical rule that follows:** always pair `LIMIT`/`OFFSET` with an explicit `ORDER BY` for anything that needs a reliable, repeatable order — pagination, "most recent first," anything a real user will depend on. Never assume storage order or insertion order will hold.

### A deeper, real-world weakness of OFFSET — pagination drift

This surfaced from thinking through what could go wrong with OFFSET even *with* `ORDER BY` properly set.

The scenario: a user is browsing paginated results. They load page 1 (`ORDER BY id LIMIT 10 OFFSET 0`). In the time before they load page 2, someone else deletes one of the rows that was on page 1. When the user then requests page 2 (`OFFSET 10 LIMIT 10`), every row's *position* has shifted up by one, because `OFFSET` counts positions in the result set, not fixed identities. The practical effect: one row that the user hadn't seen yet gets silently skipped entirely, without any error or warning.

This is a well-known, real limitation of offset-based pagination in production systems — not a flaw in understanding, a genuine tradeoff. The common fix, used in real backend systems, is **cursor-based pagination**: instead of "skip N rows," you query "give me rows with `id > 47`, limit 10" — anchored to an actual value from the last row you saw, rather than a position count that can shift underneath you. This avoids the drift problem entirely, since it doesn't matter if rows before that cursor point get added or removed. Cursor pagination is a Phase 2/3-level refinement — noted here for awareness, not needed for BookEasy's current stage.

---

## Module 5 — Complete

Every filtering and sorting operator on the roadmap tested with real BookEasy data, in `psql`, with actual output verified:
`=`, comparison operators (`>`, `<`, `>=`, `<=`, `!=`), `IN`, `LIKE`, `IS NULL`/`IS NOT NULL`, `BETWEEN`, `ORDER BY`, `LIMIT`, `OFFSET` — plus a real understanding of why row order is never guaranteed without `ORDER BY`, and the pagination-drift weakness of `OFFSET` in production systems.

---

## Next Up
**Module 6 — Foreign Keys and JOINs**: `INNER JOIN` and `LEFT JOIN` already previewed with real proof (a user with no bookings appeared in a `LEFT JOIN` result but was completely absent from an `INNER JOIN` result on the same data). Still to cover: `RIGHT JOIN`, `FULL OUTER JOIN`, self-join, cross-join (recognition level per the roadmap), and modeling one-to-one/many-to-many relationships in real SQL.