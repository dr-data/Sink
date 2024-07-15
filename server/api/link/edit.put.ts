import type { z } from 'zod';
import { LinkSchema } from '@/schemas/link';

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public;
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot edit links.',
    });
  }
  const link = await readValidatedBody(event, LinkSchema.parse);
  const { cloudflare } = event.context;
  const { KV } = cloudflare.env;

  // Check if the link with the old slug exists
  const existingLink: z.infer<typeof LinkSchema> | null = await KV.get(`link:${link.oldSlug}`, { type: 'json' });

  if (existingLink) {
    // Check if the new slug already exists
    if (link.oldSlug !== link.slug) {
      const newSlugLink: z.infer<typeof LinkSchema> | null = await KV.get(`link:${link.slug}`, { type: 'json' });
      if (newSlugLink) {
        throw createError({
          status: 409,
          statusText: 'The new slug already exists. Please choose a different slug.',
        });
      }
    }

    const newLink = {
      ...existingLink,
      ...link,
      id: existingLink.id, // don't update id
      createdAt: existingLink.createdAt, // don't update createdAt
      updatedAt: Math.floor(Date.now() / 1000),
    };
    
    // If slug is changed, delete the old link
    if (link.oldSlug !== link.slug) {
      await KV.delete(`link:${link.oldSlug}`);
    }

    const expiration = getExpiration(event, newLink.expiration);
    await KV.put(`link:${newLink.slug}`, JSON.stringify(newLink), {
      expiration,
      metadata: {
        expiration,
      },
    });

    setResponseStatus(event, 201);
    return { link: newLink };
  } else {
    throw createError({
      status: 404,
      statusText: 'The link to be updated does not exist.',
    });
  }
});
