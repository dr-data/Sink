import { LinkSchema } from '@/schemas/link'

export default eventHandler(async (event) => {
  const { oldSlug, newSlug, ...linkData } = await readValidatedBody(event, LinkSchema.parse)

  const { cloudflare } = event.context
  const { KV } = cloudflare.env

  // Fetch the existing link data using the old slug
  const existingLink = await KV.get(`link:${oldSlug}`)
  if (!existingLink) {
    throw createError({
      status: 404, // Not Found
      statusText: 'Link not found',
    })
  }

  // Determine the updated slug
  const updatedSlug = newSlug ? modifySlug(newSlug) : oldSlug

  // Check for slug conflict if the slug is updated
  if (newSlug) {
    const conflictLink = await KV.get(`link:${updatedSlug}`)
    if (conflictLink) {
      throw createError({
        status: 409, // Conflict
        statusText: 'Slug already exists',
      })
    }
  }

  // Save the updated link with the new slug
  await KV.put(`link:${updatedSlug}`, JSON.stringify({ ...JSON.parse(existingLink), ...linkData, slug: updatedSlug }), {
    expiration: linkData.expiration,
    metadata: {
      expiration: linkData.expiration,
    },
  })

  // Delete the old link if the slug has changed
  if (oldSlug !== updatedSlug) {
    await KV.delete(`link:${oldSlug}`)
  }

  setResponseStatus(event, 200)
  return { link: { ...JSON.parse(existingLink), ...linkData, slug: updatedSlug } }
})

// Function to modify the slug
function modifySlug(slug: string): string {
  // Example logic to modify the slug, this can be customized
  return slug + '-updated'
}
