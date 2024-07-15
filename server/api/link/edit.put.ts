import type { z } from 'zod'
import { LinkSchema } from '@/schemas/link'

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot edit links.',
    })
  }
  const link = await readValidatedBody(event, LinkSchema.parse)
  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  const existingLink: z.infer<typeof LinkSchema> | null = await KV.get(`link:${link.slug}`, { type: 'json' })
  if (existingLink) {
    // Check if the slug is being updated
    const isSlugUpdated = existingLink.slug !== link.slug;

    const newLink = {
      ...existingLink,
      ...link,
      id: existingLink.id, // don't update id
      createdAt: existingLink.createdAt, // don't update createdAt
      updatedAt: Math.floor(Date.now() / 1000),
    }
    const expiration = getExpiration(event, newLink.expiration)

    // Store updated link with new slug
    await KV.put(`link:${newLink.slug}`, JSON.stringify(newLink), {
      expiration,
      metadata: {
        expiration,
      },
    })

    // Remove the old slug entry if slug was updated
    if (isSlugUpdated) {
      await KV.delete(`link:${existingLink.slug}`);
    }

    setResponseStatus(event, 201)
    return { link: newLink }
  }
})
