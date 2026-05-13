## 2024-05-30 - Migrating KV metadata in Cloudflare via Nitro Tasks
**Learning:** Cloudflare KV environment variables are not globally accessible in a way standard node environments expose them when running locally or during migrations unless passed through nitro tasks properly. And inline database migrations in 'GET' endpoints to correct previous data causes excessive writes!
**Action:** Move data migrations to Nitro tasks rather than performing inline KV updates during list/GET requests to avoid high write usage for read requests.
