export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrates KV link entries to ensure metadata contains URL and comment to avoid N+1 query problems in lists.',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      return { result: 'Error: KV binding not found.' }
    }

    let count = 0
    let finalCursor: string | undefined

    console.log('Starting migration task for KV link metadata...')

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
            // Check if metadata is missing the required fields
            if (!key.metadata?.url) {
              try {
                // Fetch the actual record to get the data
                const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })

                if (link && link.url) {
                  // Update the KV entry with the metadata inline
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

      console.log(`Migration task complete. Migrated ${count} link(s).`)
      return { result: `Success. Migrated ${count} link(s).` }
    }
    catch (err) {
      console.error('Error during migration task:', err)
      return { result: 'Error during migration. Check logs.' }
    }
  },
})
