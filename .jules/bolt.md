## 2024-05-21 - Remove inline KV migrations from read operations
**Learning:** Performing inline database migrations (like `KV.put`) within read operations (`GET` requests) can cause excessive write operations and severe performance degradation, especially in a serverless/KV environment like NuxtHub/Cloudflare.
**Action:** Avoid inline database migrations within read operations. Instead, execute data migrations for Cloudflare KV using Nitro tasks (e.g., `server/tasks/`) or standalone offline scripts executed out-of-band (e.g., via CI/CD) to keep the read endpoint fast and scalable.
