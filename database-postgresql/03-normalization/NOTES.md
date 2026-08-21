# 03 — Normalization
**Project:** BookEasy — PostgreSQL + raw SQL (Phase 1, Module 4 of backend roadmap)
**Type:** Concepts only — no installation, no app code

---

## Definition of Normalization

**Simple words:**
Normalization is the process of organizing database tables so that every piece of information is stored in exactly one place, with no unnecessary duplication.

**Technical / interview-ready definition:**
Normalization is a systematic process of decomposing database tables to eliminate data redundancy and prevent update, insertion, and deletion anomalies, by ensuring that every non-key column depends on the whole primary key — and nothing but the primary key. It is applied progressively through a series of rules called **normal forms** (1NF, 2NF, 3NF, and beyond), each stricter than the one before.

**Combined, one-line version to remember:**
Normalization means splitting data so every fact lives in exactly one home, so that no update can ever contradict itself and no fact accidentally depends on the existence of unrelated data.

---

## What Goes Wrong Without Normalization

Starting point — one flat, unnormalized table crammed with everything:

| id | user_name | user_email | venue_name | venue_city | booking_date |
|---|---|---|---|---|---|
| 1 | Ali Khan | ali@x.com | Sunset Hall | Lahore | 2026-09-01 |
| 2 | Ali Khan | ali@x.com | Sunset Hall | Lahore | 2026-09-15 |
| 3 | Sara Ahmed | sara@x.com | Grand Ballroom | Karachi | 2026-09-20 |

| Problem | What happens | Why it's dangerous |
|---|---|---|
| **Update anomaly** | Ali changes his email; only one row gets updated, not both | Same person now has two different emails in the same database — no way to know which is correct |
| **Insertion anomaly** | Want to add a new venue before anyone books it | Impossible — a venue only exists if attached to a booking row |
| **Deletion anomaly** | Sara cancels her only booking, so the row is deleted | The venue "Grand Ballroom, Karachi" is accidentally erased entirely, as a side effect |
| **Redundancy (root cause)** | Same name/email/venue data typed out repeatedly across rows | Wasted storage, and every duplicate is a chance for copies to disagree |

All four problems trace back to one design mistake: **the table stores multiple unrelated kinds of things (a user, a venue, a booking) squashed into one, so user/venue facts repeat on every row that touches them.**

---

## The Normal Forms — Definitions, Tests, and a Full Worked Example

Practice table used throughout (`enrollments`) — intentionally broken in all three ways:

| student_id | course_id | student_email | course_name | instructor_name | instructor_office | topics_covered |
|---|---|---|---|---|---|---|
| S1 | C1 | ali@x.com | Databases | Dr. Farooq | Room 204 | SQL, Normalization |
| S1 | C2 | ali@x.com | Networks | Dr. Bilal | Room 310 | TCP/IP |
| S2 | C1 | sara@x.com | Databases | Dr. Farooq | Room 204 | SQL, Normalization |

Composite primary key (as designed): `(student_id, course_id)`

---

### 1NF — First Normal Form

**Definition:** Every column must hold a single, atomic value — never a list or multiple values crammed into one field.

**Test:** does any column contain more than one value at once?

**Violation found:** `topics_covered` holds `"SQL, Normalization"` — two values in one cell.

**Fix:** split into one row per value.

| student_id | course_id | student_email | course_name | instructor_name | instructor_office | topic |
|---|---|---|---|---|---|---|
| S1 | C1 | ali@x.com | Databases | Dr. Farooq | Room 204 | SQL |
| S1 | C1 | ali@x.com | Databases | Dr. Farooq | Room 204 | Normalization |
| S1 | C2 | ali@x.com | Networks | Dr. Bilal | Room 310 | TCP/IP |
| S2 | C1 | sara@x.com | Databases | Dr. Farooq | Room 204 | SQL |
| S2 | C1 | sara@x.com | Databases | Dr. Farooq | Room 204 | Normalization |

**Important side effect:** splitting `topics_covered` made the original key `(student_id, course_id)` repeat (e.g. `S1, C1` now appears twice). The key must expand to stay unique: **new composite key = `(student_id, course_id, topic)`.**
Rule of thumb: whenever splitting a multi-valued column for 1NF causes the old key to repeat, the key must grow to include the new column.

**1NF achieved.** Note: 1NF does not fix redundancy — it usually makes duplication worse. That's expected; redundancy is fixed in the next two steps.

---

### 2NF — Second Normal Form

**Definition:** The table must already be in 1NF, AND — this rule only applies when the primary key is composite (made of 2+ columns) — every non-key column must depend on the **entire** key, not just part of it. A column depending on only part of a composite key is called a **partial dependency**.

**Test:** for each non-key column, ask — "do I need ALL parts of the key to determine this value, or does just ONE part already tell me?"

**Applying it** (key is now `student_id + course_id + topic`):

| Column | Needs all 3 key parts? | Verdict |
|---|---|---|
| `student_email` | No — `student_id` alone determines it | Partial dependency on `student_id` |
| `course_name` | No — `course_id` alone determines it | Partial dependency on `course_id` |
| `instructor_name` | No — `course_id` alone determines it | Partial dependency on `course_id` |
| `instructor_office` | No — `course_id` alone determines it | Partial dependency on `course_id` |

**Fix:** split off everything that depends on only part of the key, into its own table keyed on that part.

**students**
| student_id (PK) | student_email |
|---|---|
| S1 | ali@x.com |
| S2 | sara@x.com |

**courses**
| course_id (PK) | course_name | instructor_name | instructor_office |
|---|---|---|---|
| C1 | Databases | Dr. Farooq | Room 204 |
| C2 | Networks | Dr. Bilal | Room 310 |

**enrollment_topics** (only what genuinely needs all 3 original key parts)
| student_id | course_id | topic |
|---|---|---|
| S1 | C1 | SQL |
| S1 | C1 | Normalization |
| S1 | C2 | TCP/IP |
| S2 | C1 | SQL |
| S2 | C1 | Normalization |

**2NF achieved.** Every column left in each table now genuinely needs its table's full key.

---

### 3NF — Third Normal Form

**Definition:** The table must already be in 2NF, AND every non-key column must depend **only on the primary key** — not on some *other* non-key column in the same table. A column depending on another non-key column (which itself depends on the key) is called a **transitive dependency** — an indirect chain (key → column A → column B) instead of a direct link (key → column B).

**Test:** for each non-key column, ask — "does this depend on the primary key directly, or does it actually depend on some other regular column in this same table?"

**Applying it to `courses`:**
`instructor_office` — does it depend on `course_id` (the key), or on `instructor_name` (a different non-key column)? It depends on the instructor — whoever teaches the course, their office follows. Chain: `course_id → instructor_name → instructor_office`. **This is a transitive dependency — 3NF violation.**

**Fix:** pull the transitively-dependent data into its own table.

**instructors**
| instructor_id (PK) | instructor_name | instructor_office |
|---|---|---|
| I1 | Dr. Farooq | Room 204 |
| I2 | Dr. Bilal | Room 310 |

**courses** (now references instructor by id instead of repeating their details)
| course_id (PK) | course_name | instructor_id (FK) |
|---|---|---|
| C1 | Databases | I1 |
| C2 | Networks | I2 |

**3NF achieved.**

---

## Final Result — All Four Tables After 1NF + 2NF + 3NF

**students**
| student_id (PK) | student_email |
|---|---|
| S1 | ali@x.com |
| S2 | sara@x.com |

**instructors**
| instructor_id (PK) | instructor_name | instructor_office |
|---|---|---|
| I1 | Dr. Farooq | Room 204 |
| I2 | Dr. Bilal | Room 310 |

**courses**
| course_id (PK) | course_name | instructor_id (FK → instructors.instructor_id) |
|---|---|---|
| C1 | Databases | I1 |
| C2 | Networks | I2 |

**enrollment_topics**
| student_id (FK) | course_id (FK) | topic |
|---|---|---|
| S1 | C1 | SQL |
| S1 | C1 | Normalization |
| S1 | C2 | TCP/IP |
| S2 | C1 | SQL |
| S2 | C1 | Normalization |

*(composite primary key: `student_id + course_id + topic`)*

---

## Quick Reference — 2NF vs 3NF

| | 2NF violation — Partial Dependency | 3NF violation — Transitive Dependency |
|---|---|---|
| Only happens when | Table has a **composite** primary key | Can happen with ANY primary key |
| The problem | A column depends on only **part** of the key | A column depends on **another non-key column**, not the key directly |
| Fix | Move the column to a table keyed on just that part | Move the column to a table keyed on the column it actually depends on |

---

## Payoff — Why This All Matters

With the final structure above: update Dr. Farooq's office once, in `instructors` — every course he teaches reflects it automatically, with zero risk of two different offices existing for the same person. That's the entire point of normalization — every fact has exactly one home.

---

## Deliberate Exception (Not for Beginners)

Sometimes engineers intentionally **denormalize** — reintroduce a small amount of duplication on purpose — to avoid extra `JOIN`s for performance reasons, accepting the update-risk as a tradeoff. This is a valid, real technique, but it is a deliberate, informed choice made *after* understanding normalization — not a beginner shortcut. Deferred to Phase 2/3, after joins (Module 6) and performance/indexing (Module 10) are covered.

---

## Next Up
**Module 3 (roadmap numbering) — Designing a Table (DDL) + Postgres Data Types**
This is where these same concepts turn into real `CREATE TABLE` SQL statements, applied to BookEasy's actual `users` table.