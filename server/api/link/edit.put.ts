import { EditLinkPasswordSchema, LinkSchema } from '#shared/schemas/link'
import { z } from 'zod'

const EditLinkSchema = LinkSchema.extend({
  password: EditLinkPasswordSchema,
  // Optional original slug. When present and different from `slug`, the link is
  // renamed: written under the new slug and the old key is removed.
  oldSlug: z.string().trim().max(2048).optional(),
})

defineRouteMeta({
  openAPI: {
    description: 'Edit an existing short link',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['url', 'slug'],
            properties: {
              url: { type: 'string', description: 'The target URL' },
              slug: { type: 'string', description: 'The slug of the link to edit' },
              comment: { type: 'string', description: 'Optional comment' },
              expiration: { type: 'integer', description: 'Expiration timestamp (unix seconds)' },
              title: { type: 'string', description: 'Custom title for link preview' },
              description: { type: 'string', description: 'Custom description for link preview' },
              image: { type: 'string', description: 'Custom image for link preview' },
              apple: { type: 'string', description: 'Apple App Store redirect URL' },
              google: { type: 'string', description: 'Google Play Store redirect URL' },
              cloaking: { type: 'boolean', description: 'Enable link cloaking (mask destination URL)' },
              redirectWithQuery: { type: 'boolean', description: 'Append query parameters to destination URL' },
              password: { type: 'string', description: 'Password protection for the link' },
              unsafe: { type: 'boolean', description: 'Mark link as unsafe, showing a warning page before redirect' },
              geo: { type: 'object', additionalProperties: { type: 'string' }, description: 'Geo-routing rules (country code to URL)' },
              oldSlug: { type: 'string', description: 'Original slug to rename from. If different from slug, the link is renamed.' },
            },
          },
        },
      },
    },
  },
})

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot edit links.',
    })
  }
  const { oldSlug, ...link } = await readValidatedBody(event, EditLinkSchema.parse)

  // Slug rename: original slug provided and differs from the new one.
  if (oldSlug && oldSlug !== link.slug) {
    link.slug = normalizeSlug(event, link.slug)

    const existingLink: z.infer<typeof LinkSchema> | null = await getLink(event, oldSlug)
    if (!existingLink) {
      throw createError({
        status: 404,
        statusText: 'Original link not found',
      })
    }

    // Reject if the new slug is already taken by another link.
    const slugTaken = await getLink(event, link.slug)
    if (slugTaken) {
      throw createError({
        status: 409,
        statusText: 'New slug already exists',
      })
    }

    if (link.url !== existingLink.url)
      await detectUnsafeLink(event, link)

    const newLink = mergeEditableLink(existingLink, link)
    await applyEditableLinkPassword(newLink, link.password)

    // Write the new key first, then remove the old one (preserves data on failure).
    await putLink(event, newLink)
    await deleteLink(event, oldSlug)

    setResponseStatus(event, 201)
    return buildLinkResponse(event, newLink)
  }

  const existingLink: z.infer<typeof LinkSchema> | null = await getLink(event, link.slug)
  if (!existingLink) {
    throw createError({
      status: 404,
      statusText: 'Link not found',
    })
  }

  if (link.url !== existingLink.url)
    await detectUnsafeLink(event, link)

  const newLink = mergeEditableLink(existingLink, link)
  await applyEditableLinkPassword(newLink, link.password)

  await putLink(event, newLink)
  setResponseStatus(event, 201)
  return buildLinkResponse(event, newLink)
})
