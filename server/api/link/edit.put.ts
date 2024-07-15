import type { z } from 'zod'
import { LinkSchema } from '@/schemas/link'

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  try {
    if (previewMode) {
      console.log('Preview mode is enabled, cannot edit links')
      throw createError({
        status: 403,
        statusText: 'Preview mode cannot edit links.',
      })
    }

    console.log('Reading and validating request body')
    const link = await readValidatedBody(event, LinkSchema.parse)
    console.log('Validated link:', link)

    const { cloudflare } = event.context
    const { KV } = cloudflare.env

    console.log('Fetching existing link from KV storage with slug:', link.slug)
    const existingLink: z.infer<typeof LinkSchema> | null = await KV.get(`link:${link.slug}`, { type: 'json' })
    
    if (!existingLink) {
      console.log('Link not found for slug:', link.slug)
      throw createError({
        status: 404,
        statusText: 'Link not found',
      })
    }

    console.log('Existing link found:', existingLink)

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

    console.log('Storing updated link with new slug:', newLink.slug)
    try {
      // Store updated link with new slug
      await KV.put(`link:${newLink.slug}`, JSON.stringify(newLink), {
        expiration,
        metadata: {
          expiration,
        },
      })
      console.log('Updated link stored successfully')
    } catch (kvPutError) {
      console.error('Error storing updated link with new slug:', kvPutError)
      throw createError({
        status: 500,
        statusText: 'Failed to store updated link',
        message: kvPutError.message || 'An error occurred while storing the updated link.',
      })
    }

    // Remove the old slug entry if slug was updated
    if (isSlugUpdated) { 
      console.log('Removing old slug entry:', existingLink.slug)
      try {
        await KV.delete(`link:${existingLink.slug}`);
        console.log('Old slug entry removed successfully')
      } catch (kvDeleteError) {
        console.error('Error removing old slug entry:', kvDeleteError)
        throw createError({
          status: 500,
          statusText: 'Failed to remove old slug entry',
          message: kvDeleteError.message || 'An error occurred while removing the old slug entry.',
        })
      }
    }

    setResponseStatus(event, 201)
    console.log('Link updated successfully:', newLink)
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
