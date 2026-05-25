export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrates KV link entries to include url and comment in metadata for optimized reads.',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found.')
      return { result: 'error', message: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let migratedCount = 0
    let totalCount = 0

    try {
      while (true) {
        const { keys, list_complete, cursor } = await KV.list({
          prefix: `link:`,
          limit: 1000,
          cursor: finalCursor,
        })

        finalCursor = cursor

        if (Array.isArray(keys)) {
          totalCount += keys.length

          for (const key of keys) {
            try {
              if (!key.metadata?.url) {
                const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' }) as { metadata: any, value: { url: string, comment?: string } | null }

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
              console.error(`Error migrating key ${key.name}:`, err)
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }

      console.log(`Migration complete. Processed ${totalCount} links, migrated ${migratedCount}.`)
      return { result: 'success', migrated: migratedCount, total: totalCount }
    }
    catch (err) {
      console.error('Error during migration:', err)
      return { result: 'error', message: 'Migration failed', error: String(err) }
    }
  },
})
