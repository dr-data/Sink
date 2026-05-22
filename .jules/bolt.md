## 2024-05-24 - Inline KV migrations cause massive write spikes
**Learning:** Performing inline database migrations (like `KV.put` during a `GET` request) to forward-fill missing metadata causes massive unnecessary write spikes when the endpoints are hit frequently by searches or list retrievals.
**Action:** Always move data migrations to out-of-band Nitro tasks (e.g., `server/tasks/`) to ensure smooth CI/CD and avoid hurting read performance and KV write quotas.
