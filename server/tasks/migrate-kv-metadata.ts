export default defineTask({
  meta: {
    name: 'migrate-kv-metadata',
    description: 'Migrate KV entries to include metadata for list optimizations',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV
    if (!KV) {
      console.error('KV binding not found')
      return { result: 'failed', error: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let migratedCount = 0

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
                migratedCount++
              }
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }
      console.log(`Successfully migrated ${migratedCount} KV entries.`)
      return { result: 'success', migratedCount }
    }
    catch (err) {
      console.error('Error migrating KV entries:', err)
      return { result: 'error', error: String(err) }
    }
  },
})
