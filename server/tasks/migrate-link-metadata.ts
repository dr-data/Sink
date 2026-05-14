export default defineTask({
  meta: {
    name: 'migrate-link-metadata',
    description: 'Migrate links in KV to include metadata (url, comment) for faster listing',
  },
  async run() {
    console.log('Running KV metadata migration task...')

    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found')
      return { result: 'error', message: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let migratedCount = 0
    let skippedCount = 0
    let errorCount = 0

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
            try {
              if (key.metadata?.url) {
                skippedCount++
                continue
              }

              const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })

              if (link) {
                await KV.put(key.name, JSON.stringify(link), {
                  expiration: (metadata as any)?.expiration,
                  metadata: {
                    ...(metadata || {}),
                    url: (link as any).url,
                    comment: (link as any).comment,
                  },
                })
                migratedCount++
              }
              else {
                skippedCount++
              }
            }
            catch (err) {
              console.error(`Error migrating key ${key.name}:`, err)
              errorCount++
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }

      console.log(`Migration completed. Migrated: ${migratedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`)
      return { result: 'success', migrated: migratedCount, skipped: skippedCount, errors: errorCount }
    }
    catch (err) {
      console.error('Migration failed:', err)
      return { result: 'error', message: 'Migration failed', error: String(err) }
    }
  },
})
