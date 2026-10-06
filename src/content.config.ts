// お知らせと法務文書・ページ文言の書式。区分 C（大久保だけが変える）
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const nonEmpty = z.string().trim().min(1);

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
  ctaLabel: nonEmpty,
};

const pages = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: './src/content/pages' }),
  schema: ({ image }) =>
    z.object({
      meta: z.object({
        title: nonEmpty,
        description: nonEmpty,
      }),
      hero: z.object({
        catchphrase: nonEmpty,
        scroll: nonEmpty,
      }),
      concept: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        body: nonEmpty,
        sp: z.object({
          title: nonEmpty,
          body: nonEmpty,
        }).optional(),
      }),
      ourBusiness: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        body: nonEmpty,
        ...ctaFields,
        steps: z.array(z.object({
          en: nonEmpty,
          ja: nonEmpty,
        })).length(6),
        sp: z.object({
          title: nonEmpty,
        }).optional(),
      }),
      about: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        body: nonEmpty,
        ...ctaFields,
        sp: z.object({
          eyebrow: nonEmpty,
          body: nonEmpty,
        }).optional(),
      }),
      recruit: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        lead: nonEmpty,
        ...ctaFields,
        cards: z.array(z.object({
          title: nonEmpty,
          linkLabel: nonEmpty,
        })).min(1).max(6),
        sp: z.object({
          lead: nonEmpty,
          ctaLabel: nonEmpty.optional(),
        }).optional(),
      }),
      news: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        ...ctaFields,
      }),
      onlineShop: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        overlay: nonEmpty,
        body: nonEmpty,
        ...ctaFields,
        note: nonEmpty,
        sp: z.object({
          body: nonEmpty,
        }).optional(),
      }),
      instagram: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        ...ctaFields,
        images: z
          .array(
            z.object({
              src: image(),
              alt: nonEmpty,
            }),
          )
          .max(8)
          .default([]),
      }),
      faq: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        items: z.array(z.object({
          question: nonEmpty,
          // 空答えはトップで非表示にする運用のため、空文字を許す
          answer: z.string().trim(),
        })).min(1).max(12),
      }),
    }),
});

export const collections = { news, legal, pages };
