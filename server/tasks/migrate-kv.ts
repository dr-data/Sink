export default defineTask({
  meta: {
    name: 'migrate:kv-metadata',
    description: 'Migrate KV links to include metadata for performance optimization',
  },
  async run() {
    console.log('Running KV metadata migration task...')
    // Use the native Cloudflare KV binding directly to access metadata features.
    const KV = process.env.KV || globalThis.__env__?.KV || globalThis.KV
    if (!KV) {
      throw new Error('KV binding not found')
    }
    let finalCursor: string | undefined
    let migratedCount = 0
    let totalChecked = 0

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
            totalChecked++
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

      console.log(`Migration complete. Checked ${totalChecked} keys, migrated ${migratedCount} links.`)
      return { result: `Success. Checked ${totalChecked} keys, migrated ${migratedCount} links.` }
    }
    catch (err) {
      console.error('Error during migration:', err)
      return { error: 'Migration failed', details: String(err) }
    }
  },
})
