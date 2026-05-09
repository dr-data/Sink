## 2024-05-10 - Eliminate Excessive KV Writes on Search and Resolve N+1 on List

**Learning:** This application previously performed inline database migrations (using `KV.put`) inside `GET` endpoints (`server/api/link/search.get.ts`) as a means to add missing metadata. This causes write operations to explode drastically on read-heavy paths. Additionally, fetching lists without using the metadata directly included in `KV.list` responses caused an N+1 query problem, requiring `KV.getWithMetadata` to run for every single link item.

**Action:**
1. Always migrate Cloudflare KV databases out-of-band using Nitro tasks (`server/tasks/`) instead of inline on read endpoints to maintain performance and lower costs.
2. In list endpoints, check and utilize `key.metadata` directly from the `KV.list` response before falling back to individual `KV.getWithMetadata` calls to prevent N+1 queries.
