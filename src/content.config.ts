// お知らせと法務文書・ページ文言の書式。区分 C（大久保だけが変える）
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const nonEmpty = z.string().trim().min(1);

// 知らないキーを黙って捨てず、エラーにする（入れ子も含む）
const obj = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

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

const metaSchema = obj({
  title: nonEmpty,
  description: nonEmpty,
});

// サイト内のパス（/ で始まる）だけを許す。外部 URL や javascript: を書けないようにする
const internalPath = z.string().trim().regex(/^\/(?![\/\\])[^\s\\]*$/, 'サイト内のパス（/ で始まる）を書いてください');

const stepEnJa = obj({
  en: nonEmpty,
  ja: nonEmpty,
});

const captionSlide = obj({
  caption: nonEmpty,
});

const subnavSchema = z
  .array(
    obj({
      label: nonEmpty,
      href: internalPath,
    }),
  )
  .min(1)
  .max(6);

const homePage = defineCollection({
  loader: glob({ pattern: '{home,en/home,zh/home}.yml', base: './src/content/pages' }),
  schema: ({ image }) =>
    obj({
      meta: metaSchema,
      hero: obj({
        catchphrase: nonEmpty,
        scroll: nonEmpty,
      }),
      concept: obj({
        eyebrow: nonEmpty,
        title: nonEmpty,
        body: nonEmpty,
        sp: obj({
          title: nonEmpty,
          body: nonEmpty,
        }).optional(),
      }),
      ourBusiness: obj({
        eyebrow: nonEmpty,
        title: nonEmpty,
        body: nonEmpty,
        ...ctaFields,
        steps: z
          .array(
            obj({
              en: nonEmpty,
              ja: nonEmpty,
            }),
          )
          .length(6),
        sp: obj({
          title: nonEmpty,
        }).optional(),
      }),
      about: obj({
        eyebrow: nonEmpty,
        title: nonEmpty,
        body: nonEmpty,
        ...ctaFields,
        sp: obj({
          eyebrow: nonEmpty,
          body: nonEmpty,
        }).optional(),
      }),
      recruit: obj({
        eyebrow: nonEmpty,
        title: nonEmpty,
        lead: nonEmpty,
        ...ctaFields,
        cards: z
          .array(
            obj({
              title: nonEmpty,
              linkLabel: nonEmpty,
            }),
          )
          .min(1)
          .max(6),
        sp: obj({
          lead: nonEmpty,
          ctaLabel: nonEmpty.optional(),
        }).optional(),
      }),
      news: obj({
        eyebrow: nonEmpty,
        title: nonEmpty,
        ...ctaFields,
      }),
      onlineShop: obj({
        eyebrow: nonEmpty,
        title: nonEmpty,
        overlay: nonEmpty,
        body: nonEmpty,
        ...ctaFields,
        note: nonEmpty,
        sp: obj({
          body: nonEmpty,
        }).optional(),
      }),
      instagram: obj({
        eyebrow: nonEmpty,
        title: nonEmpty,
        ...ctaFields,
        images: z
          .array(
            obj({
              src: image(),
              alt: nonEmpty,
            }),
          )
          .max(8)
          .default([]),
      }),
      faq: obj({
        eyebrow: nonEmpty,
        title: nonEmpty,
        items: z
          .array(
            obj({
              question: nonEmpty,
              // 空答えはトップで非表示にする運用のため、空文字を許す
              answer: z.string().trim(),
            }),
          )
          .min(1)
          .max(12),
      }),
    }),
});

const companyPage = defineCollection({
  loader: glob({ pattern: '{company,en/company,zh/company}.yml', base: './src/content/pages' }),
  schema: obj({
    meta: metaSchema,
    hero: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
    }),
    subnav: subnavSchema,
    philosophy: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      headline: nonEmpty,
      body: nonEmpty,
    }),
    message: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      body: nonEmpty,
      role: nonEmpty,
      name: nonEmpty,
    }),
    profile: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      rows: z
        .array(
          obj({
            label: nonEmpty,
            value: nonEmpty,
            sp: obj({
              value: nonEmpty,
            }).optional(),
          }),
        )
        .min(1)
        .max(20),
    }),
  }),
});

const historyPage = defineCollection({
  loader: glob({ pattern: '{history,en/history,zh/history}.yml', base: './src/content/pages' }),
  schema: obj({
    meta: metaSchema,
    hero: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
    }),
    subnav: subnavSchema,
    intro: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      body: nonEmpty,
      sp: obj({
        eyebrow: nonEmpty,
        body: nonEmpty,
      }).optional(),
    }),
    timeline: z
      .array(
        obj({
          date: nonEmpty,
          text: nonEmpty,
          sp: obj({
            text: nonEmpty,
          }).optional(),
        }),
      )
      .min(1)
      .max(40),
    houseBrands: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      items: z
        .array(
          obj({
            date: nonEmpty,
            text: nonEmpty,
            sp: obj({
              text: nonEmpty,
            }).optional(),
          }),
        )
        .min(1)
        .max(20),
      noteBefore: nonEmpty,
      noteLinkLabel: nonEmpty,
      noteAfter: nonEmpty,
      noteHref: internalPath,
    }),
  }),
});

const businessPage = defineCollection({
  loader: glob({ pattern: '{business,en/business,zh/business}.yml', base: './src/content/pages' }),
  schema: obj({
    meta: metaSchema,
    hero: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
    }),
    wholesale: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      intro: nonEmpty,
      body: nonEmpty,
      steps: z.array(stepEnJa).length(6),
      slides: z.array(captionSlide).length(4),
      sp: obj({
        steps: z.array(stepEnJa).length(6),
        body: nonEmpty,
      }).optional(),
    }),
    craft: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      steps: z
        .array(
          obj({
            num: nonEmpty,
            label: nonEmpty,
          }),
        )
        .length(8),
      // 製作工程の写真は、使える写真が届くまで置かない（届いたら写真と見出しを足す）
    }),
    repair: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      body: nonEmpty,
      slides: z.array(captionSlide).length(2),
      sp: obj({
        lead: nonEmpty,
        services: nonEmpty,
        closing: nonEmpty,
        slides: z.array(captionSlide).length(2).optional(),
      }).optional(),
    }),
    endToEnd: obj({
      title: nonEmpty,
      body: nonEmpty,
      sp: obj({
        eyebrow: nonEmpty,
        body: nonEmpty,
      }).optional(),
    }),
    strength: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      cards: z
        .array(
          obj({
            title: nonEmpty,
            body: nonEmpty,
          }),
        )
        .length(4),
    }),
    tokyo: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      company: nonEmpty,
      branch: nonEmpty,
      postal: nonEmpty,
      address: nonEmpty,
      building: nonEmpty,
      telLabel: nonEmpty,
      telHref: z.string().trim().regex(/^tel:\+?[0-9-]+$/, 'tel: で始まる電話番号を書いてください'),
      mapLabel: nonEmpty,
      mapHref: z.string().trim().regex(/^https:\/\/[^\s]+$/, 'https:// で始まる地図の URL を書いてください'),
      galleryLabel: nonEmpty,
      features: z
        .array(
          obj({
            title: nonEmpty,
            body: nonEmpty,
          }),
        )
        .length(2),
    }),
    onlineShop: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      overlay: nonEmpty,
      body: nonEmpty,
      ...ctaFields,
      note: nonEmpty,
    }),
  }),
});

const recruitPage = defineCollection({
  loader: glob({ pattern: 'recruit.yml', base: './src/content/pages' }),
  schema: obj({
    meta: metaSchema,
    hero: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
    }),
    message: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      headline: nonEmpty,
      body1: nonEmpty,
      body2: nonEmpty,
      ctaRequirements: nonEmpty,
      ctaEntry: nonEmpty,
      sp: obj({
        title: nonEmpty,
        headline: nonEmpty,
        body1: nonEmpty,
        body2: nonEmpty,
      }),
    }),
    staffInterview: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      items: z
        .array(
          obj({
            role: nonEmpty,
            name: nonEmpty,
            // 写真のファイル（src/assets/images/recruit/staff-<photo>.jpg）。順序を入れ替えても写真が人に付いていく
            photo: z.enum(['omoto', 'sakamoto', 'mandal']),
            sections: z.array(nonEmpty).min(1).max(4),
            // PC で一言がカード下部に無い場合は空文字
            message: z.string().trim(),
            spBody: nonEmpty,
          }),
        )
        .length(3),
    }),
    midCta: obj({
      message: nonEmpty,
      ...ctaFields,
    }),
    selectionFlow: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      steps: z
        .array(
          obj({
            en: nonEmpty,
            ja: nonEmpty,
          }),
        )
        .length(5),
      sp: obj({
        steps: z
          .array(
            obj({
              en: nonEmpty,
              ja: nonEmpty,
            }),
          )
          .length(5),
      }),
    }),
    jobRequirements: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      jobs: z
        .array(
          obj({
            title: nonEmpty,
            rows: z
              .array(
                obj({
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
          obj({
            title: nonEmpty,
            value: nonEmpty,
            unit: nonEmpty,
          }),
        )
        .length(5),
      bottomCta: obj({
        message: nonEmpty,
        ...ctaFields,
      }),
    }),
  }),
});

const entryPage = defineCollection({
  loader: glob({ pattern: 'entry.yml', base: './src/content/pages' }),
  schema: obj({
    meta: metaSchema,
    hero: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
    }),
    lead: obj({
      title: nonEmpty,
      body: nonEmpty,
      sp: obj({
        title: nonEmpty,
        body: nonEmpty,
      }),
    }),
    form: obj({
      requiredLabel: nonEmpty,
      optionalLabel: nonEmpty,
      fields: obj({
        name: obj({ label: nonEmpty, placeholder: nonEmpty }),
        kana: obj({ label: nonEmpty, placeholder: nonEmpty }),
        email: obj({ label: nonEmpty, placeholder: nonEmpty }),
        tel: obj({
          label: nonEmpty,
          placeholder: nonEmpty,
          spPlaceholder: nonEmpty,
        }),
        job: obj({
          label: nonEmpty,
          placeholder: nonEmpty,
          spPlaceholder: nonEmpty,
          options: z.array(nonEmpty).min(1).max(6),
        }),
        place: obj({
          label: nonEmpty,
          placeholder: nonEmpty,
          spPlaceholder: nonEmpty,
          options: z.array(nonEmpty).min(1).max(6),
        }),
        pr: obj({ label: nonEmpty, placeholder: nonEmpty }),
        motive: obj({ label: nonEmpty, placeholder: nonEmpty }),
        resume: obj({
          label: nonEmpty,
          dropLabel: nonEmpty,
          spDropLabel: nonEmpty,
          hint: nonEmpty,
          spHint: nonEmpty,
        }),
      }),
      privacy: obj({
        title: nonEmpty,
        body: nonEmpty,
        agreeLabel: nonEmpty,
      }),
      preparingNote: nonEmpty,
    }),
  }),
});

const partnersPage = defineCollection({
  loader: glob({ pattern: '{partners,en/partners,zh/partners}.yml', base: './src/content/pages' }),
  schema: obj({
    meta: metaSchema,
    pageHero: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      sp: obj({
        title: nonEmpty,
      }).optional(),
    }),
    intro: obj({
      title: nonEmpty,
      body: nonEmpty,
      ctaBusiness: nonEmpty,
      ctaContact: nonEmpty,
      sp: obj({
        title: nonEmpty,
        body: nonEmpty,
      }).optional(),
    }),
    reasons: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      sp: obj({
        eyebrow: nonEmpty,
        title: nonEmpty,
      }).optional(),
      items: z
        .array(
          obj({
            number: nonEmpty,
            title: nonEmpty,
            body: nonEmpty,
            sp: obj({
              title: nonEmpty.optional(),
              body: nonEmpty.optional(),
            }).optional(),
          }),
        )
        .length(4),
    }),
    consultations: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      items: z
        .array(
          obj({
            en: nonEmpty,
            title: nonEmpty,
            bullets: z.array(nonEmpty).min(1).max(6),
            sp: obj({
              en: nonEmpty,
              title: nonEmpty,
              bullets: z.array(nonEmpty).min(1).max(6),
            }).optional(),
          }),
        )
        .length(4),
    }),
    flow: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      lead: nonEmpty,
      steps: z
        .array(
          obj({
            number: nonEmpty,
            title: nonEmpty,
            body: nonEmpty,
          }),
        )
        .length(4),
    }),
    faq: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      items: z
        .array(
          obj({
            question: nonEmpty,
            answer: z.string().trim(),
          }),
        )
        .min(1)
        .max(12),
    }),
  }),
});

const newsPage = defineCollection({
  loader: glob({ pattern: 'news.yml', base: './src/content/pages' }),
  schema: obj({
    meta: metaSchema,
    pageHero: obj({
      eyebrow: nonEmpty,
      title: nonEmpty,
      sp: obj({
        title: nonEmpty,
      }).optional(),
    }),
    breadcrumb: obj({
      home: nonEmpty,
      current: nonEmpty,
    }),
  }),
});

export const collections = {
  news,
  legal,
  homePage,
  companyPage,
  historyPage,
  businessPage,
  recruitPage,
  entryPage,
  partnersPage,
  newsPage,
};
