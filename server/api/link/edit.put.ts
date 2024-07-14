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

  // Parse the incoming request body
  const link = await readValidatedBody(event, LinkSchema.parse)
  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  // Fetch the existing link data using the current slug
  const existingLink: z.infer<typeof LinkSchema> | null = await KV.get(`link:${link.oldSlug}`, { type: 'json' })
  if (!existingLink) {
    throw createError({
      status: 404, // Not Found
      statusText: 'Link not found',
    })
  }

  // Determine the updated slug
  const updatedSlug = link.newSlug ? modifySlug(link.newSlug) : link.oldSlug

  // Check for slug conflict if the slug is updated
  if (link.newSlug && link.oldSlug !== updatedSlug) {
    const conflictLink = await KV.get(`link:${updatedSlug}`, { type: 'json' })
    if (conflictLink) {
      throw createError({
        status: 409, // Conflict
        statusText: 'Slug already exists',
      })
    }
  }

  // Create the new link object with updated data
  const newLink = {
    ...existingLink,
    ...link,
    slug: updatedSlug, // Update slug
    id: existingLink.id, // Preserve original id
    createdAt: existingLink.createdAt, // Preserve original creation date
    updatedAt: Math.floor(Date.now() / 1000), // Update timestamp
  }

  const expiration = getExpiration(event, newLink.expiration)

  // Save the updated link with the new slug
  await KV.put(`link:${updatedSlug}`, JSON.stringify(newLink), {
    expiration,
    metadata: {
      expiration,
    },
  })

  // Delete the old link if the slug has changed
  if (link.oldSlug !== updatedSlug) {
    await KV.delete(`link:${link.oldSlug}`)
  }

  setResponseStatus(event, 201)
  return { link: newLink }
})

// Function to modify the slug
function modifySlug(slug: string): string {
  // Example logic to modify the slug, this can be customized
  return slug + '-updated'
}
