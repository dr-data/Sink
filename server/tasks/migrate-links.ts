export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrate links to include metadata for optimized querying',
  },
  async run() {
    console.log('Running migrate-links task...')

    // As per memories, we need to access KV from the global context in Nitro tasks
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found. Ensure the task is running in the correct environment.')
      return { result: 'failed', error: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let processed = 0
    let updated = 0

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
            processed++

            // If url is missing in metadata, we need to update it
            if (!key.metadata?.url) {
              const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
              if (link) {
                await KV.put(key.name, JSON.stringify(link), {
                  expiration: metadata?.expiration,
                  metadata: {
                    ...metadata,
                    id: link.id,
                    url: link.url,
                    comment: link.comment,
                    createdAt: link.createdAt,
                    updatedAt: link.updatedAt,
                    expiration: link.expiration,
                    title: link.title,
                    description: link.description,
                    image: link.image,
                  },
                })
                updated++
              }
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }

      console.log(`Task completed. Processed: ${processed}, Updated: ${updated}`)
      return { result: 'success', processed, updated }
    }
    catch (err) {
      console.error('Error during migration:', err)
      return { result: 'failed', error: String(err) }
    }
  },
})
