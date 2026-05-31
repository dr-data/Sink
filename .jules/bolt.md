## 2024-05-24 - Cloudflare KV Inline Write Anti-Pattern
**Learning:** Performing inline KV writes (e.g., lazy metadata migration) during GET request list iteration can cause a massive explosion in write operations and degrade serverless performance.
**Action:** Always perform data migrations using offline standalone scripts (e.g., Nitro tasks) rather than inline during read operations.
