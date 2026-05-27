export default defineTask({
  meta: {
    name: 'migrate-metadata',
    description: 'Migrates KV entries to include metadata for links',
  },
  async run() {
    console.log('Starting migrate-metadata task')
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found')
      return { result: 'error', message: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let processedCount = 0
    let updatedCount = 0

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
                  updatedCount++
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
      console.log(`Task completed. Processed ${processedCount} keys, updated ${updatedCount} keys.`)
      return { result: 'success', processedCount, updatedCount }
    }
    catch (err) {
      console.error('Error fetching link list:', err)
      return { result: 'error', message: 'Failed to run migration' }
    }
  },
})
