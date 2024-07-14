import { LinkSchema } from '@/schemas/link'

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, LinkSchema.parse)

  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  // Fetch the existing link data using the old slug
  const existingLink = await KV.get(`link:${link.oldSlug}`)
  if (!existingLink) {
    throw createError({
      status: 404, // Not Found
      statusText: 'Link not found',
    })
  }

  // Modify the slug if it is being updated
  const updatedSlug = link.newSlug ? modifySlug(link.newSlug) : link.oldSlug
  
  // Check for slug conflict if the slug is updated
  if (link.newSlug) {
    const conflictLink = await KV.get(`link:${updatedSlug}`)
    if (conflictLink) {
      throw createError({
        status: 409, // Conflict
        statusText: 'Slug already exists',
      })
    }
  }

  // Save the updated link with the new slug
  await KV.put(`link:${updatedSlug}`, JSON.stringify({ ...link, slug: updatedSlug }), {
    expiration: link.expiration,
    metadata: {
      expiration: link.expiration,
    },
  })

  // Delete the old link if the slug has changed
  if (link.oldSlug !== updatedSlug) {
    await KV.delete(`link:${link.oldSlug}`)
  }

  setResponseStatus(event, 200)
  return { link: { ...link, slug: updatedSlug } }
})

// Function to modify the slug
function modifySlug(slug: string): string {
  // Example logic to modify the slug, this can be customized
  return slug + '-updated'
}
