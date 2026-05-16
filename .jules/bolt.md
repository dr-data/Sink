## 2024-05-16 - Inline KV Migrations within GET requests
**Learning:** Doing `KV.put` inside a read operation (`server/api/link/search.get.ts`) to backfill missing metadata causes massive numbers of write operations (e.g. 66k/month) if the backfill isn't complete and the endpoint is hit frequently.
**Action:** Remove inline data migration from GET requests. We should migrate the data once using a migration script/task or CLI tool, not during user-facing read operations.
