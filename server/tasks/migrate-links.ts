export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrates KV links to include url and comment in their metadata for faster read performance.',
  },
  async run() {
    console.log('Running migrate-links task...')
    const kv = hubKV()
    let migratedCount = 0

    const keys = await kv.getKeys('link:')

    if (Array.isArray(keys)) {
      for (const key of keys) {
        try {
          const linkStr = await kv.getItemRaw(key)
          if (linkStr) {
            const link = typeof linkStr === 'string' ? JSON.parse(linkStr) : linkStr
            if (!link.url)
              continue // Not a valid link

            // The underlying KV metadata might be uninitialized for older links
            const meta = await kv.getMeta(key)

            if (!meta?.url) {
              // Re-set the item with the correct metadata to speed up search.get.ts reads
              await kv.setItem(key, linkStr, {
                metadata: {
                  ...meta,
                  url: link.url,
                  comment: link.comment,
                },
              })
              migratedCount++
            }
          }
        }
        catch (err) {
          console.error(`Error processing key ${key}:`, err)
          continue
        }
      }
    }

    console.log(`migrate-links task completed. Migrated ${migratedCount} links.`)
    return { result: 'success', migratedCount }
  },
})
