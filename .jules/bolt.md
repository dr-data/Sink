## 2025-01-20 - Inline KV Migration Anti-pattern
**Learning:** Avoid inline database migrations (like `KV.put`) within read operations (`GET` requests), especially in serverless or Cloudflare KV environments, as this can lead to excessive write operations (e.g., tens of thousands a month in normal usage) when scanning lists.
**Action:** Remove inline `KV.put` from `search.get.ts` and create a dedicated out-of-band Nuxt Nitro task (`server/tasks/migrate-links.ts`) to handle metadata updates in batches offline, which preserves read performance and prevents CI/CD/database timeout issues.
