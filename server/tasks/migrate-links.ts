interface Link {
  slug: string
  url: string
  comment?: string
}

export default defineTask({
  meta: {
    name: 'migrate-links',
    description: 'Migrates KV links by adding missing metadata for better listing performance',
  },
  async run() {
    console.log('Running KV link migration task...')

    // We get KV this way as HubKV unstorage wrapper does not expose metadata putting capability directly
    const globalAny = globalThis as any
    const KV = process.env.KV || globalAny.__env__?.KV || globalAny.KV

    if (!KV) {
      console.error('KV binding not found. Please ensure it is configured properly.')
      return { result: 'error', message: 'KV binding not found' }
    }

    let finalCursor: string | undefined
    let migratedCount = 0
    let totalCount = 0

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
            totalCount++

            // If it already has url in metadata, we can skip it
            if (!key.metadata?.url) {
              const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' }) as { metadata: any, value: Link | null }

              if (link) {
                const metadataPayload = {
                  ...metadata,
                  url: link.url,
                  comment: link.comment,
                }

                // Only write if metadata fits within the 1024-byte limit of Cloudflare KV
                if (JSON.stringify(metadataPayload).length <= 1024) {
                  await KV.put(key.name, JSON.stringify(link), {
                    expiration: metadata?.expiration,
                    metadata: metadataPayload,
                  })
                  migratedCount++
                  console.log(`Migrated ${key.name}`)
                }
                else {
                  console.warn(`Could not migrate ${key.name}: metadata payload exceeds 1024 bytes`)
                }
              }
            }
          }
        }

        if (!keys || list_complete) {
          break
        }
      }

      console.log(`Migration complete. Checked ${totalCount} links, migrated ${migratedCount} links.`)
      return { result: 'success', migrated: migratedCount, total: totalCount }
    }
    catch (err) {
      console.error('Error during migration:', err)
      return { result: 'error', message: err instanceof Error ? err.message : String(err) }
    }
  },
})
