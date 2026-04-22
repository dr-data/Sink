export default defineTask({
  meta: {
    name: 'kv:migrate:metadata',
    description: 'Migrate old KV links to include metadata for faster list and search operations.',
  },
  async run() {
    console.log('Running KV metadata migration task...')
    const KV = hubKV() as any
    let finalCursor: string | undefined
    let migratedCount = 0

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
            // Check if metadata is missing
            if (!key.metadata?.url) {
              const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
              if (link) {
                // Perform the migration for this specific key
                await KV.put(key.name, JSON.stringify(link), {
                  expiration: metadata?.expiration,
                  metadata: {
                    ...metadata,
                    url: link.url,
                    comment: link.comment,
                  },
                })
                migratedCount++
                // Optional: add a small delay to avoid hitting write limits too hard
                await new Promise(resolve => setTimeout(resolve, 50))
              }
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }
      return { result: `Success - Migrated ${migratedCount} links` }
    }
    catch (err: any) {
      console.error('Error during KV metadata migration:', err)
      return { result: 'Error', error: err?.message || String(err) }
    }
  },
})
