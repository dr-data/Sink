export default defineTask({
  meta: {
    name: 'migrate-metadata',
    description: 'Backfill metadata for links to prevent N+1 query performance issues and inline migrations during GET requests.',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      return { result: 'Error: KV binding not found.' }
    }

    let count = 0
    let finalCursor: string | undefined

    console.log('Starting metadata migration...')

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
            // Only migrate if metadata is missing the required fields
            if (!key.metadata?.url) {
              try {
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
                  count++
                  console.log(`Migrated metadata for ${key.name}`)
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

      console.log(`Migration complete. Updated ${count} links.`)
      return { result: `Migration complete. Updated ${count} links.` }
    }
    catch (err) {
      console.error('Error during migration:', err)
      return { result: 'Error during migration.' }
    }
  },
})
