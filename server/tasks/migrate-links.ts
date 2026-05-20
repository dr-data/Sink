export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrate legacy link objects into KV metadata to prevent N+1 queries',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found. Please ensure KV is bound.')
      return { result: 'error', message: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let migratedCount = 0

    console.log('Starting legacy link metadata migration...')

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
            // Check if metadata already contains URL
            if (!key.metadata?.url) {
              try {
                const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
                if (link) {
                  // Re-save with proper metadata
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
              catch (err) {
                console.error(`Error migrating key ${key.name}:`, err)
              }
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }

      console.log(`Migration complete. Migrated ${migratedCount} links.`)
      return { result: 'success', migratedCount }
    }
    catch (err) {
      console.error('Error during migration:', err)
      return { result: 'error', message: 'Migration failed', error: err }
    }
  },
})
