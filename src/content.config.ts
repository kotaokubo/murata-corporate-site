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

const metaSchema = z.object({
  title: nonEmpty,
  description: nonEmpty,
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.yml', base: './src/content/pages' }),
  schema: ({ image }) => {
    const homePageSchema = z.object({
      meta: metaSchema,
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
    });

    const recruitPageSchema = z.object({
      meta: metaSchema,
      hero: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
      }),
      message: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        headline: nonEmpty,
        body1: nonEmpty,
        body2: nonEmpty,
        ctaRequirements: nonEmpty,
        ctaEntry: nonEmpty,
        sp: z.object({
          title: nonEmpty,
          headline: nonEmpty,
          body1: nonEmpty,
          body2: nonEmpty,
        }),
      }),
      staffInterview: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        items: z
          .array(
            z.object({
              role: nonEmpty,
              name: nonEmpty,
              sections: z.array(nonEmpty).min(1).max(4),
              // PC で一言がカード下部に無い場合は空文字
              message: z.string().trim(),
              spBody: nonEmpty,
            }),
          )
          .length(3),
      }),
      midCta: z.object({
        message: nonEmpty,
        ...ctaFields,
      }),
      selectionFlow: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        steps: z
          .array(
            z.object({
              en: nonEmpty,
              ja: nonEmpty,
            }),
          )
          .length(5),
        sp: z.object({
          steps: z
            .array(
              z.object({
                en: nonEmpty,
                ja: nonEmpty,
              }),
            )
            .length(5),
        }),
      }),
      jobRequirements: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
        jobs: z
          .array(
            z.object({
              title: nonEmpty,
              rows: z
                .array(
                  z.object({
                    label: nonEmpty,
                    value: nonEmpty,
                  }),
                )
                .min(3)
                .max(10),
            }),
          )
          .length(3),
        stats: z
          .array(
            z.object({
              title: nonEmpty,
              value: nonEmpty,
              unit: nonEmpty,
            }),
          )
          .length(5),
        bottomCta: z.object({
          message: nonEmpty,
          ...ctaFields,
        }),
      }),
    });

    const entryPageSchema = z.object({
      meta: metaSchema,
      hero: z.object({
        eyebrow: nonEmpty,
        title: nonEmpty,
      }),
      lead: z.object({
        title: nonEmpty,
        body: nonEmpty,
        sp: z.object({
          title: nonEmpty,
          body: nonEmpty,
        }),
      }),
      form: z.object({
        requiredLabel: nonEmpty,
        optionalLabel: nonEmpty,
        fields: z.object({
          name: z.object({ label: nonEmpty, placeholder: nonEmpty }),
          kana: z.object({ label: nonEmpty, placeholder: nonEmpty }),
          email: z.object({ label: nonEmpty, placeholder: nonEmpty }),
          tel: z.object({
            label: nonEmpty,
            placeholder: nonEmpty,
            spPlaceholder: nonEmpty,
          }),
          job: z.object({
            label: nonEmpty,
            placeholder: nonEmpty,
            spPlaceholder: nonEmpty,
            options: z.array(nonEmpty).min(1).max(6),
          }),
          place: z.object({
            label: nonEmpty,
            placeholder: nonEmpty,
            spPlaceholder: nonEmpty,
            options: z.array(nonEmpty).min(1).max(6),
          }),
          pr: z.object({ label: nonEmpty, placeholder: nonEmpty }),
          motive: z.object({ label: nonEmpty, placeholder: nonEmpty }),
          resume: z.object({
            label: nonEmpty,
            dropLabel: nonEmpty,
            spDropLabel: nonEmpty,
            hint: nonEmpty,
            spHint: nonEmpty,
          }),
        }),
        privacy: z.object({
          title: nonEmpty,
          body: nonEmpty,
          spBody: nonEmpty,
          agreeLabel: nonEmpty,
        }),
        submitLabel: nonEmpty,
        preparingNote: nonEmpty,
      }),
    });

    // 実行時はページごとの形を検証する。型はトップページ形に固定し、
    // index.astro を変えずに済むようにする（各下層ページは入口で絞り込む）
    return z.union([
      homePageSchema,
      recruitPageSchema,
      entryPageSchema,
    ]) as unknown as typeof homePageSchema;
  },
});

export const collections = { news, legal, pages };
