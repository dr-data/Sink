export default defineTask({
  meta: {
    name: 'migrate-metadata',
    description: 'Migrate Cloudflare KV links to include full metadata to prevent N+1 query problems in lists.',
  },
  async run() {
    // Access native Cloudflare KV directly rather than using hubKV() which doesn't expose native binding methods well
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('No KV binding found.')
      return { result: 'error', message: 'No KV binding found.' }
    }

    console.log('Starting metadata migration task...')
    let migratedCount = 0
    let finalCursor: string | undefined

    try {
      while (true) {
        const { keys, list_complete, cursor } = await KV.list({
          prefix: `link:`,
          limit: 1000,
          cursor: finalCursor,
        })

        finalCursor = cursor

        if (Array.isArray(keys)) {
          for (const key of keys) {
            try {
              // Ensure we aren't repeatedly writing if we already have complete data
              // We'll consider it incomplete if it doesn't have an `url` in metadata
              if (!key.metadata?.url) {
                const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
                if (link) {
                  await KV.put(key.name, JSON.stringify(link), {
                    expiration: metadata?.expiration,
                    metadata: {
                      ...(metadata || {}),
                      ...link, // Store entire link object to avoid N+1 queries in future list fetch
                    },
                  })
                  migratedCount++
                }
              }
            }
            catch (err) {
              console.error(`Error migrating key ${key.name}:`, err)
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }
      console.log(`Metadata migration complete. Migrated ${migratedCount} entries.`)
      return { result: 'success', migratedCount }
    }
    catch (err) {
      console.error('Error during metadata migration:', err)
      return { result: 'error', message: 'Migration failed', error: String(err) }
    }
  },
})
