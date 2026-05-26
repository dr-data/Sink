export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrates links to include metadata for optimized list fetching',
  },
  async run() {
    // Access native Cloudflare KV binding directly to avoid TypeScript errors and missing features
    // from the unstorage wrapper provided by hubKV()
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found. Ensure it is configured correctly.')
      return { result: 'error', message: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let migratedCount = 0
    let processedCount = 0

    try {
      while (true) {
        const { keys, list_complete, cursor } = await KV.list({
          prefix: 'link:',
          limit: 1000,
          cursor: finalCursor,
        })

        finalCursor = cursor

        if (Array.isArray(keys)) {
          for (const key of keys) {
            processedCount++
            try {
              // If metadata URL is missing, we need to migrate it
              if (!key.metadata?.url) {
                const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
                if (link && link.url) {
                  await KV.put(key.name, JSON.stringify(link), {
                    expiration: metadata?.expiration,
                    metadata: {
                      ...metadata,
                      url: link.url,
                      comment: link.comment,
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

      console.log(`Migration complete. Processed ${processedCount} links, migrated ${migratedCount} links.`)
      return { result: 'success', processed: processedCount, migrated: migratedCount }
    }
    catch (err) {
      console.error('Error during link migration:', err)
      return { result: 'error', message: 'Migration failed' }
    }
  },
})
