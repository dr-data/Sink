export default defineTask({
  meta: {
    name: 'migrate-kv',
    description: 'Run KV database migrations to populate metadata',
  },
  async run({ payload: _payload, context: _context }) {
    console.log('Starting KV migration...')

    // Access native Cloudflare KV binding directly
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found')
      return { result: 'failed', error: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let migratedCount = 0

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
            try {
              const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
              if (link) {
                await KV.put(key.name, JSON.stringify(link), {
                  expiration: metadata?.expiration,
                  metadata: {
                    ...(metadata || {}),
                    url: link.url,
                    comment: link.comment,
                  },
                })
                migratedCount++
                console.log(`Migrated ${key.name}`)
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

    console.log(`KV migration completed. Migrated ${migratedCount} entries.`)
    return { result: 'success', migratedCount }
  },
})
