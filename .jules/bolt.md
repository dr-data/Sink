## 2024-05-24 - Avoid Inline KV Migrations in Serverless Environments

**Learning:** Running inline database migrations (like `KV.put`) within read operations (like `KV.list` mapping) in serverless/Cloudflare Workers environments can trigger excessive write operations (e.g. 66k+ writes in a month), causing unexpected costs and performance degradation.
**Action:** Always prefer off-band/offline migrations (e.g. using Nitro tasks or out-of-band CI scripts) rather than mutating state during a GET request.
