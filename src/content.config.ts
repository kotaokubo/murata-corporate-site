// お知らせと法務文書の書式。区分 C（大久保だけが変える）
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      date: z.coerce.date(),
      category: z.enum(['EVENT', 'MEDIA', 'INFO']),
      description: z.string().min(1).max(200),
      image: image().optional(),
      imageAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }).refine((d) => !d.image || (d.imageAlt && d.imageAlt.length > 0), {
      message: '画像を付けるときは imageAlt（画像の説明）も書いてください',
      path: ['imageAlt'],
    }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { news, legal };
