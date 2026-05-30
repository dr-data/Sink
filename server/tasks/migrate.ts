export default defineTask({
  meta: {
    name: 'migrate:links:metadata',
    description: 'Migrate legacy links to include necessary metadata to avoid N+1 queries during search reads.',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('Cloudflare KV binding not found.')
      return { result: 'failed', reason: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let processedCount = 0
    let updatedCount = 0

    console.log('Starting legacy link metadata migration...')

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
                if (updatedCount % 100 === 0) {
                  console.log(`Updated ${updatedCount} legacy links so far...`)
                }
              }
            }
          }
          catch (err) {
            console.error(`Error processing key ${key.name} during migration:`, err)
            continue
          }
        }
      }

      if (!keys || list_complete) {
        break
      }
    }

    console.log(`Migration completed. Processed ${processedCount} keys, updated ${updatedCount} legacy links.`)
    return { result: 'success', processed: processedCount, updated: updatedCount }
  },
})
