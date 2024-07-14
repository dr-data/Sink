import { LinkSchema } from '@/schemas/link'

export default eventHandler(async (event) => {
  const link = await readValidatedBody(event, LinkSchema.parse)

  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  
  // Modify the slug before saving
  const updatedSlug = modifySlug(link.slug)
  
  let existingLink = await KV.get(`link:${updatedSlug}`)
  if (existingLink) {
    throw createError({
      status: 409, // Conflict
      statusText: 'Link already exists',
    })
  } else {
    const expiration = getExpiration(event, link.expiration)

    await KV.put(`link:${updatedSlug}`, JSON.stringify({ ...link, slug: updatedSlug }), {
      expiration,
      metadata: {
        expiration,
      },
    })
    setResponseStatus(event, 201)
    return { link: { ...link, slug: updatedSlug } }
  }
})

// Function to modify the slug
function modifySlug(slug: string): string {
  // Example logic to modify the slug, this can be customized
  return slug + '-updated'
}
