export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrates Cloudflare KV links to include URL and comment in their metadata for faster list fetches.',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found.')
      return { result: 'error', message: 'KV binding not found' }
    }

    console.log('Starting migration of links...')
    let migratedCount = 0
    let processedCount = 0
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
            processedCount++
            try {
              if (!key.metadata?.url) {
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
                }
              }
            }
            catch (err) {
              console.error(`Error processing key ${key.name}:`, err)
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }

      console.log(`Migration complete. Processed ${processedCount} keys. Migrated ${migratedCount} keys.`)
      return { result: 'success', migratedCount, processedCount }
    }
    catch (err) {
      console.error('Error during migration:', err)
      return { result: 'error', message: 'Failed during migration' }
    }
  },
})
