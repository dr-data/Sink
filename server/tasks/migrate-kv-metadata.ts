export default defineTask({
  meta: {
    name: 'migrate:kv-metadata',
    description: 'Migrate old KV links to include metadata for faster listing',
  },
  async run() {
    console.log('Running KV metadata migration task...')
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found')
      return { result: 'error', message: 'KV binding not found' }
    }

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
          const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
          if (link) {
            // Include everything from link in metadata, ensuring we have slug.
            // But KV metadata has a 1024-byte limit. Most links won't exceed this.
            // We ensure we at least copy url, comment.
            // If we want to optimize list, we'd add slug, id, createdAt, views, etc.
            const fullLink = link as any

            // To be completely safe with size limit while saving reads, we save the full object
            // into metadata if we can.

            let newMetadata = {
              ...(metadata || {}),
              ...fullLink, // Store the entire object in metadata
            }

            // Just double checking size isn't insane, but stringified json > 1024 bytes fails
            if (JSON.stringify(newMetadata).length > 1024) {
              console.warn(`Link ${key.name} metadata too large to fully cache, falling back to partial`)
              newMetadata = {
                ...(metadata || {}),
                url: fullLink.url,
                comment: fullLink.comment,
              }
            }

            await KV.put(key.name, JSON.stringify(link), {
              expiration: metadata?.expiration,
              metadata: newMetadata,
            })
            migratedCount++
          }
        }
      }

      if (!keys || list_complete) {
        break
      }
    }

    console.log(`Migration complete. Migrated ${migratedCount} links.`)
    return { result: 'success', migratedCount }
  },
})
