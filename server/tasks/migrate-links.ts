export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrates KV links missing metadata',
  },
  async run() {
    console.log('Starting migrate-links task...')
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found!')
      return { result: 'error', message: 'KV binding not found' }
    }

    let count = 0
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
                  count++
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
      console.log(`migrate-links task completed. Migrated ${count} links.`)
      return { result: 'success', migrated: count }
    }
    catch (err) {
      console.error('Error fetching link list during migration:', err)
      return { result: 'error', message: 'Failed to fetch link list during migration' }
    }
  },
})
