export default defineTask({
  meta: {
    name: 'migrate',
    description: 'Migrates KV entries to include url and comment in metadata for optimized list performance',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found')
      return { result: 'error', message: 'KV binding not found' }
    }

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
              if (!key.metadata?.url) {
                const { metadata, value: linkStr } = await KV.getWithMetadata(key.name, { type: 'text' })
                if (linkStr) {
                  const link = JSON.parse(linkStr)
                  await KV.put(key.name, linkStr, {
                    expiration: metadata?.expiration,
                    metadata: {
                      ...metadata,
                      url: link.url,
                      comment: link.comment,
                    },
                  })
                  migratedCount++
                  console.log(`Migrated ${key.name}`)
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

      console.log(`Migration complete. Migrated ${migratedCount} links.`)
      return { result: 'success', migratedCount }
    }
    catch (err) {
      console.error('Error during migration:', err)
      return { result: 'error', message: 'Failed to complete migration', error: err }
    }
  },
})
