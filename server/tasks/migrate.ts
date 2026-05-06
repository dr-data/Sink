export default defineTask({
  meta: {
    name: 'migrate',
    description: 'Migrate legacy links to include metadata in Cloudflare KV',
  },
  async run() {
    console.log('Starting KV migration for legacy links...')

    // Access KV globally through NuxtHub binding
    const KV = hubKV() as unknown as any
    let finalCursor: string | undefined
    let migratedCount = 0

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
              if (!key.metadata?.url) {
                // Link is legacy, fetch it and migrate
                const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
                if (link) {
                  await KV.put(key.name, JSON.stringify(link), {
                    expiration: metadata?.expiration,
                    metadata: {
                      ...metadata,
                      url: link.url,
                      comment: link.comment,
                    },
                  })
                  migratedCount++
                  console.log(`Migrated key: ${key.name}`)
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

      console.log(`KV migration completed. Total legacy links migrated: ${migratedCount}`)
      return { result: 'success', migratedCount }
    }
    catch (err) {
      console.error('Error during KV migration:', err)
      return { result: 'error', message: err instanceof Error ? err.message : String(err) }
    }
  },
})
