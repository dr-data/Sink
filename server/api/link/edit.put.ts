import type { z } from 'zod'
import { LinkSchema } from '@/schemas/link'

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  try {
    if (previewMode) {
      throw createError({
        status: 403,
        statusText: 'Preview mode cannot edit links.',
      })
    }

    console.log('Reading and validating request body')
    const link = await readValidatedBody(event, LinkSchema.parse)
    const { cloudflare } = event.context
    const { KV } = cloudflare.env

    console.log('Fetching existing link from KV storage')
    const existingLink: z.infer<typeof LinkSchema> | null = await KV.get(`link:${link.slug}`, { type: 'json' })
    
    if (!existingLink) {
      throw createError({
        status: 404,
        statusText: 'Link not found',
      })
    }

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

    console.log('Storing updated link with new slug')
    // Store updated link with new slug
    await KV.put(`link:${newLink.slug}`, JSON.stringify(newLink), {
      expiration,
      metadata: {
        expiration,
      },
    })

    // Remove the old slug entry if slug was updated
    if (isSlugUpdated) { 
      console.log('Removing old slug entry')
      await KV.delete(`link:${existingLink.slug}`);
    }

    setResponseStatus(event, 201)
    console.log('Link updated successfully')
    return { link: newLink }
  } catch (error) {
    console.error('Error updating link:', error)
    throw createError({
      status: error.status || 500,
      statusText: error.statusText || 'Internal Server Error',
      message: error.message || 'An error occurred while updating the link.',
    })
  }
})
