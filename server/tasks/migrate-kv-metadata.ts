export default defineTask({
  meta: {
    name: 'migrate-kv-metadata',
    description: 'Migrates KV entries to include metadata for links without it.',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found.')
      return { result: 'Error: KV binding not found' }
    }

    let finalCursor: string | undefined
    let migratedCount = 0
    let skippedCount = 0
    let errorCount = 0

    console.log('Starting KV metadata migration...')

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
                  if (migratedCount % 100 === 0) {
                    console.log(`Migrated ${migratedCount} links...`)
                  }
                }
                else {
                  skippedCount++
                }
              }
              else {
                skippedCount++
              }
            }
            catch (err) {
              console.error(`Error processing key ${key.name}:`, err)
              errorCount++
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }
      console.log(`Migration complete. Migrated: ${migratedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`)
      return { result: `success. Migrated: ${migratedCount}` }
    }
    catch (err) {
      console.error('Error during migration:', err)
      return { result: 'error', error: err }
    }
  },
})
