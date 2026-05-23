## 2024-05-18 - Cloudflare KV Migration Anti-pattern
**Learning:** Performing inline database migrations (`KV.put`) within a read operation (`GET` request) causes massive write operation spikes in Cloudflare KV due to its eventual consistency, especially on heavily trafficked endpoints like search lists.
**Action:** Always decouple KV schema migrations from read endpoints. Implement migrations as out-of-band jobs (e.g., Nuxt Nitro tasks) that can be triggered explicitly via CI/CD pipelines.
