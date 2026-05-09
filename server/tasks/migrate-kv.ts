export default defineTask({
  meta: {
    name: 'migrate-kv',
    description: 'Migrate KV links to include metadata',
  },
  async run() {
    const { KV } = hubKV() as any
    let finalCursor: string | undefined

    let migrated = 0
    let total = 0

    while (true) {
      const { keys, list_complete, cursor } = await KV.list({
        prefix: `link:`,
        limit: 1000,
        cursor: finalCursor,
      })

      finalCursor = cursor

      if (Array.isArray(keys)) {
        for (const key of keys) {
          total++
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
              migrated++
            }
          }
        }
      }

      if (!keys || list_complete) {
        break
      }
    }

    return { result: `Migration complete. Checked ${total} links, migrated ${migrated} links.` }
  },
})
