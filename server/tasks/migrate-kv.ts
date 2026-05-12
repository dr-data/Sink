export default defineTask({
  meta: {
    name: 'migrate-kv',
    description: 'Run out-of-band KV migrations to add metadata to links that do not have it',
  },
  async run() {
    console.log('Starting KV migration task...')

    // Access native Cloudflare KV binding directly to support metadata options
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found. Ensure task is run with proper bindings.')
      return { result: 'Failed - KV binding not found' }
    }

    let finalCursor: string | undefined
    let migratedCount = 0
    let skipCount = 0
    let failCount = 0

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
              if (key.metadata?.url) {
                // Link already has metadata, skip
                skipCount++
              }
              else {
                // Link does not have metadata, migrate it
                const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
                if (link) {
                  // We store the ENTIRE link object in the metadata up to the 1024-byte limit.
                  // For a typical link record, this will comfortably fit.
                  await KV.put(key.name, JSON.stringify(link), {
                    expiration: metadata?.expiration,
                    metadata: {
                      ...metadata,
                      ...link, // Store the full link object in metadata to avoid N+1 queries during reads
                    },
                  })
                  migratedCount++
                }
              }
            }
            catch (err) {
              console.error(`Error processing key ${key.name}:`, err)
              failCount++
              continue
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }

      console.log(`KV migration task completed. Migrated: ${migratedCount}, Skipped: ${skipCount}, Failed: ${failCount}`)
      return { result: `Completed - Migrated: ${migratedCount}, Skipped: ${skipCount}, Failed: ${failCount}` }
    }
    catch (err) {
      console.error('Error in KV migration task:', err)
      return { result: 'Failed - Error during migration' }
    }
  },
})
