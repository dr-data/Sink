## 2024-05-16 - Avoid Inline Migrations in GET Requests
**Learning:** Performing inline database migrations (e.g., `KV.put`) within read operations (`GET` requests like `/api/link/search`) can lead to excessive write operations and severe performance degradation, especially in a serverless/KV environment where reads are cheap and fast but writes are more costly and slower.
**Action:** Always prefer out-of-band migrations. Use offline scripts or Nitro tasks (e.g., `server/tasks/`) to process historical data migrations instead of putting the migration overhead directly on user requests.
