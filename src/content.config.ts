// お知らせと法務文書・ページ文言の書式。区分 C（大久保だけが変える）
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

const ctaFields = {
  ctaLabel: z.string(),
};

const pages = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: './src/content/pages' }),
  schema: ({ image }) =>
    z.object({
      meta: z.object({
        title: z.string(),
        description: z.string(),
      }),
      hero: z.object({
        catchphrase: z.string(),
        scroll: z.string(),
      }),
      concept: z.object({
        eyebrow: z.string(),
        title: z.string(),
        body: z.string(),
        sp: z.object({
          title: z.string(),
          body: z.string(),
        }).optional(),
      }),
      ourBusiness: z.object({
        eyebrow: z.string(),
        title: z.string(),
        body: z.string(),
        ...ctaFields,
        steps: z.array(z.object({
          en: z.string(),
          ja: z.string(),
        })).length(6),
        sp: z.object({
          title: z.string(),
        }).optional(),
      }),
      about: z.object({
        eyebrow: z.string(),
        title: z.string(),
        body: z.string(),
        ...ctaFields,
        sp: z.object({
          eyebrow: z.string(),
          body: z.string(),
        }).optional(),
      }),
      recruit: z.object({
        eyebrow: z.string(),
        title: z.string(),
        lead: z.string(),
        ...ctaFields,
        cards: z.array(z.object({
          title: z.string(),
          linkLabel: z.string(),
        })),
        sp: z.object({
          lead: z.string(),
          ctaLabel: z.string().optional(),
        }).optional(),
      }),
      news: z.object({
        eyebrow: z.string(),
        title: z.string(),
        ...ctaFields,
      }),
      onlineShop: z.object({
        eyebrow: z.string(),
        title: z.string(),
        overlay: z.string(),
        body: z.string(),
        ...ctaFields,
        note: z.string(),
        sp: z.object({
          body: z.string(),
        }).optional(),
      }),
      instagram: z.object({
        eyebrow: z.string(),
        title: z.string(),
        ...ctaFields,
        images: z
          .array(
            z.object({
              src: image(),
              alt: z.string(),
            }),
          )
          .default([]),
      }),
      faq: z.object({
        eyebrow: z.string(),
        title: z.string(),
        items: z.array(z.object({
          question: z.string(),
          answer: z.string(),
        })),
      }),
    }),
});

export const collections = { news, legal, pages };
