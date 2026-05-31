export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrate links to include metadata for optimized listing',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found')
      return { result: 'Error: KV binding not found' }
    }

    let finalCursor: string | undefined
    let processedCount = 0
    let updatedCount = 0

    console.log('Starting link migration task...')

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
          if (!key.metadata?.url) {
            try {
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

    console.log(`Link migration complete. Processed ${processedCount} links, updated ${updatedCount} links.`)
    return { result: `Processed ${processedCount} links, updated ${updatedCount} links.` }
  },
})
