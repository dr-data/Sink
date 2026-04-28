# Database Migration

If you are upgrading from an older version where links did not have `metadata` stored alongside the key, you should run the migration script to populate the metadata. This is required for optimal performance of the `/api/link/search` endpoint.

## Run locally

1. Ensure you have the `KV_NAMESPACE_ID` of your production KV database. You can find this in the Cloudflare dashboard under Workers & Pages -> KV.
2. Run the migration script using `node` and `npx wrangler`:

```bash
KV_NAMESPACE_ID=your_namespace_id node scripts/migrate-kv.js
```

The script will iterate over all keys with the prefix `link:` and add the necessary metadata (`url`, `comment`) to keys that are missing it.
