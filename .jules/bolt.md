## 2024-05-24 - Native Cloudflare Bindings in NuxtHub Tasks
**Learning:** NuxtHub's `hubKV()` wrapper (powered by unstorage) does not expose native Cloudflare options like `.metadata`. Attempting to access `hubKV().KV` in a Nitro task will result in `undefined`, causing crashes if you try to use it as a native binding.
**Action:** When you need the native Cloudflare KV binding in Nitro context (e.g., to use `getWithMetadata`), use `const KV = process.env.KV || globalThis.__env__?.KV || globalThis.KV`.
