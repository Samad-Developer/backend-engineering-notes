# 02 — Install, Connect, and psql Basics
**Project:** BookEasy — PostgreSQL + raw SQL (Phase 1, Module 4 of backend roadmap)
**OS:** Windows (PowerShell)

---

## The Two Client Tools

| Tool | What it is | Who uses it |
|---|---|---|
| `psql` | Command-line program — type SQL directly, see results instantly | You, by hand, while learning/debugging (through Module 11) |
| `pg` (npm package) | Driver — lets Node/Express code run SQL programmatically | The app itself, starting Module 13 |

Both are just clients — different "doors" into the same running Postgres server. Postgres itself is a server process, same conceptual role as an Express app: it listens on a port (default `5432`) and responds to requests.

## Installation (Windows)
1. Downloaded installer from postgresql.org/download/windows (EDB-hosted, official).
2. Ran installer — kept all default components, default data directory, port `5432`.
3. Set a superuser password for the `postgres` user during setup (must be remembered — used every connection).
4. Skipped Stack Builder at the end (not needed).
5. Verified the Windows service is running:
   ```powershell
   Get-Service -Name postgresql*
   ```

## Fixing `psql` Not Recognized (PATH issue)
- `psql` wasn't found initially because its folder wasn't in Windows PATH.
- Fix: added `C:\Program Files\PostgreSQL\18\bin` to **System variables → Path** (via Environment Variables settings — System variables section, not User variables).
- Required closing and reopening PowerShell for the change to take effect.
- Verified with:
  ```powershell
  psql --version
  ```

## Connecting with psql

```powershell
psql -U postgres -h localhost
```
- `-U postgres` → connect as database user `postgres` (a DB user, not the Windows user)
- `-h localhost` → connect to Postgres running on this same machine
- No `-p` needed → defaults to port `5432`
- No database specified → defaults to connecting to a database with the same name as the user (`postgres`)
- Prompts for the password set during install

Prompt `postgres=#` = connected and ready. Prompt `postgres-#` = Postgres is still waiting for a statement to be terminated (missing semicolon) — send `;` alone to close it out.

## Key Commands Learned

| Command | What it does |
|---|---|
| `SELECT version();` | SQL — confirms the exact running Postgres version |
| `CREATE DATABASE bookeasy;` | SQL — creates a new isolated database container |
| `DROP DATABASE bookesy;` | SQL — permanently deletes a database (no undo — used to clean up a typo'd database) |
| `\l` | psql-only shortcut (not SQL) — lists all databases on the server |
| `\c bookeasy` | psql-only shortcut — switches the current connection to a different database |

**Important:** every SQL statement must end with `;` — Postgres doesn't execute it otherwise, it just keeps waiting for more input. `\`-prefixed commands are `psql`-specific shortcuts, not SQL, and Postgres itself doesn't understand them.

## Reconnecting Later (Daily Routine)
Postgres runs as a background Windows service — it keeps running even after closing the terminal or restarting the PC. Nothing is lost between sessions. To resume work:
```powershell
psql -U postgres -h localhost -d bookeasy
```
`-d bookeasy` connects directly into the `bookeasy` database in one step (skips the separate `\c` command).

---

## Mistakes Made & Lessons (kept intentionally — real learning signal)
- Forgot a semicolon on the first `CREATE DATABASE` → statement hung, prompt turned to `postgres-#`. Fixed by sending `;` alone.
- Typo'd database name (`bookesy` instead of `bookeasy`) — it still got created because SQL doesn't know intent, only exact text. Cleaned up with `DROP DATABASE bookesy;`.
- Tried `clear` inside `psql` — not a recognized SQL or psql command, correctly errored.
- Typo'd `CREAT DATABASE` — correctly rejected; Postgres never guesses meaning.

---

## Still To Come (Next: 03-normalization)
- Why splitting into tables prevents data duplication and update anomalies (1NF/2NF/3NF, practically explained)