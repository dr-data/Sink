## 2024-05-18 - Avoid Inline KV Migrations on Read
**Learning:** Performing `KV.put` inline inside a read operation like `search.get.ts` to migrate legacy entries without metadata leads to extremely high write operations (e.g. 66k+ a month), degrading performance for list queries and potentially hitting serverless timeout limits.
**Action:** Remove inline data migrations from read operations. Implement data migrations via Nitro tasks (e.g. `server/tasks/`) to be run completely out of band, keeping read endpoints fast and isolated.
