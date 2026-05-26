## 2024-05-26 - Inline Migrations on GET Requests cause KV Write Spikes
**Learning:** Performing inline `KV.put` migrations inside a search or list endpoint (GET request) leads to explosive write operations in Cloudflare KV when dealing with large datasets or frequent traffic.
**Action:** Always move KV data migrations to background Nitro Tasks (`server/tasks/`) to keep read operations pure and prevent performance degradation from excessive writes.
