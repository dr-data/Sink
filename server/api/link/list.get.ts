import { z } from 'zod'

export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const { limit, cursor } = await getValidatedQuery(event, z.object({
    limit: z.coerce.number().max(1024).default(20),
    cursor: z.string().trim().max(1024).optional(),
  }).parse)
  const list = await KV.list({
    prefix: `link:`,
    limit,
    cursor: cursor || undefined,
  })
  if (Array.isArray(list.keys)) {
    list.links = await Promise.all(list.keys.map(async (key: { name: string, metadata?: any }) => {
      // If metadata has URL, use it directly to avoid N+1 queries
      if (key.metadata?.url) {
        return {
          ...key.metadata,
          slug: key.name.replace('link:', ''),
        }
      }

      // Fallback for non-migrated links
      const { metadata, value: link } = await KV.getWithMetadata(key.name, { type: 'json' })
      if (link) {
        return {
          ...metadata,
          ...link,
          slug: key.name.replace('link:', ''),
        }
      }
      return link
    }))
  }
  delete list.keys
  return list
})
