import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';
const pages = defineCollection({
  loader: file('src/data/pages.json', {
    parser: (text) =>
      JSON.parse(text).map((page: Record<string, unknown>) => ({ ...page, id: page.key })),
  }),
  schema: z.object({
    path: z.string(),
    key: z.string(),
    kind: z.enum(['story', 'marketing']),
    title: z.string(),
    sections: z.number(),
    stylesheets: z.array(z.string()),
  }),
});
export const collections = { pages };
