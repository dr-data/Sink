export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrate old links to include metadata for faster searching',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found')
      return { result: 'error', message: 'KV binding not found' }
    }

    let migratedCount = 0
    let finalCursor: string | undefined

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
            if (!key.metadata?.url) {
              const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
              if (link) {
                await KV.put(key.name, JSON.stringify(link), {
                  expiration: metadata?.expiration,
                  metadata: {
                    ...(metadata || {}),
                    url: (link as any).url,
                    comment: (link as any).comment,
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

      console.log(`Successfully migrated ${migratedCount} links.`)
      return { result: 'success', migratedCount }
    }
    catch (err) {
      console.error('Error migrating links:', err)
      return { result: 'error', message: String(err) }
    }
  },
})
