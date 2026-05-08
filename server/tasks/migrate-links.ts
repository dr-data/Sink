export default defineTask({
  meta: {
    name: 'migrate:links',
    description: 'Migrate links to include metadata',
  },
  async run({ context }) {
    const { cloudflare } = context as any
    if (!cloudflare) {
      return { result: 'failed', message: 'Cloudflare context not found' }
    }
    const { KV } = cloudflare.env

    // Using native Cloudflare KV binding instead of unstorage to explicitly pass options like metadata
    // since unstorage wrapper might not easily expose metadata setting.
    let finalCursor: string | undefined
    let migratedCount = 0

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
            // Check if metadata already exists
            if (!key.metadata || !key.metadata.url) {
              const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
              if (link) {
                const typedLink = link as { url: string, comment?: string }
                await KV.put(key.name, JSON.stringify(link), {
                  expiration: metadata?.expiration as number | undefined,
                  metadata: {
                    ...(metadata || {}),
                    url: typedLink.url,
                    comment: typedLink.comment,
                  },
                })
                migratedCount++
              }
            }
          }
          catch (err) {
            console.error(`Error migrating key ${key.name}:`, err)
          }
        }
      }

      if (!keys || list_complete) {
        break
      }
    }

    return { result: 'success', migratedCount }
  },
})
