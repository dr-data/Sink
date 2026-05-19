## 2025-01-24 - [Remove KV migration from GET requests]
**Learning:** Performing inline KV migrations (`KV.put`) within read-heavy operations like `server/api/link/search.get.ts` causes massive spikes in KV write operations (~66.62k/month), inflating costs and hitting serverless limits.
**Action:** When schema updates are necessary, extract data migrations into dedicated out-of-band Nitro tasks (e.g., `server/tasks/`) and ensure runtime API endpoints strictly adhere to read-only semantics to maintain optimal performance and reduce billing overhead.
