export default defineTask({
  meta: {
    name: 'migrate:links',
    description: 'Migrate KV links to include metadata to prevent N+1 queries during list operations',
  },
  async run() {
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV
    if (!KV) {
      console.error('KV binding not found')
      return { result: 'error', message: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let migratedCount = 0

    console.log('Starting links migration task...')

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
                  expiration: (metadata as any)?.expiration,
                  metadata: {
                    ...(metadata as any),
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
      return { result: 'success', migratedCount }
    }
    catch (error) {
      console.error('Migration failed:', error)
      return { result: 'error', message: String(error) }
    }
  },
})
