// 言語ごとの共通文言と、訳ありページの判定。区分 C

export type Lang = 'ja' | 'en' | 'zh';

export const langs: Lang[] = ['ja', 'en', 'zh'];

/** 今回までに訳があるページ（パスは末尾 /。トップは /） */
export const translatedPages: readonly string[] = [
  '/',
  '/company/',
  '/history/',
  '/business/',
  '/partners/',
];

/** 将来訳す5ページ（ナビの言語切り替え・リンク方針の前提） */
export const translatablePaths: readonly string[] = [
  '/',
  '/company/',
  '/history/',
  '/business/',
  '/partners/',
];

export const htmlLang: Record<Lang, string> = {
  ja: 'ja',
  en: 'en',
  zh: 'zh-Hans',
};

export const hreflangCode: Record<Lang, string> = {
  ja: 'ja',
  en: 'en',
  zh: 'zh-Hans',
};

export const ogLocale: Record<Lang, string> = {
  ja: 'ja_JP',
  en: 'en_US',
  zh: 'zh_CN',
};

type Dict = Record<string, string>;

const dictionaries: Record<Lang, Dict> = {
  ja: {
    siteName: '村田宝飾',
    companyName: '村田宝飾株式会社',
    companyNameEn: 'MURATA JEWELRY',
    titleSeparator: '｜',
    contactBranchMatsuyama: '松山支店',
    contactBranchTokyo: '東京支店',
    contactMail: 'メール',
    contactMailSp: 'メールアドレス',
    contactTitle: 'お問い合わせ',
    contactLeadPc: 'ご質問・ご相談はお電話またはメールにてお問い合わせください。',
    contactLeadSp: 'ご質問・ご相談はお電話またはメールにてお気軽にお問い合わせください。',
    headerContact: 'お問い合わせ',
    navGlobal: 'グローバルナビゲーション',
    navFooter: 'フッターナビゲーション',
    menuOpen: 'メニューを開く',
    menuClose: 'メニューを閉じる',
    menuLabel: 'メニュー',
    mailInquiry: 'メールで問い合わせ',
    langLabel: '言語',
    langJa: '日本語',
    langEn: 'English',
    langZh: '中文',
    japaneseOnlySuffix: '',
    navAbout: '村田宝飾について',
    navBusiness: '事業内容',
    navShop: 'オンラインショップ',
    navNews: 'お知らせ',
    navRecruit: '採用情報',
    footerCompany: '会社概要',
    footerShop: 'オンラインショップ',
    footerRecruit: '採用情報',
    footerFaq: 'FAQ',
    footerContact: 'お問い合わせ',
    footerPartners: '新規取引をご希望の方',
    footerPrivacy: 'プライバシーポリシー',
    footerBusiness: '事業内容',
    footerNews: 'お知らせ',
    heroAria: 'メインビジュアル',
    heroAlt:
      '人が輝く　世界で翔く　MURATA JEWELRY　星空を背景にした蝶と星のダイヤモンドのネックレス',
    altConcept1: '角形のサファイアのペンダントとダイヤのリング',
    altConcept2: 'ターコイズの猫と肉球のリングとチェーン',
    altAbout: '色石とダイヤの指輪とペンダント、パールとオニキスのネックレスを並べた写真',
    altOnlineShop: '星と蝶のダイヤのネックレスと「The Jewelry Concierge」の文字',
    draftBadge: '下書き',
    notFoundTitle: 'ページが見つかりません',
    notFoundDescription: 'お探しのページは見つかりませんでした。',
    notFoundBody: 'お探しのページは移動または削除された可能性があります。',
    notFoundLink: 'トップページへ',
    subnavAria: '関連ページ',
    timelineAria: '沿革の年表',
    businessFlowAria: 'ビジネスフロー',
    wholesaleCarousel: '取扱商品',
    repairCarousel: '修理・加工',
    tokyoMapAria: '東京店舗の地図（新しいタブで開く）',
    tokyoGalleryCarousel: '店舗ギャラリー',
    altWholesale1: '台座に飾られたダイヤモンドのリング',
    altWholesale2: '金の留め具が付いたパールのブレスレット',
    altWholesale3: 'エメラルドとダイヤモンドを交互に並べたゴールドのリング',
    altWholesale4: '白い布の上に並ぶサファイアやルビーなどのルース',
    altRepair1: 'ロジウムメッキ加工の様子',
    altRepair2: 'レーザー溶接でジュエリーを修理する様子',
    altStrength1: '机に向かってジュエリーのデザイン画を描く女性',
    altStrength2: '各地に印が立つ世界地図',
    altStrength3: '工具でジュエリーを加工する職人の手元',
    altStrength4: 'トレーに並ぶ色石とダイヤモンドの原石',
    altTokyoInterior: '村田宝飾ビル内の商品棚と陳列ケース',
    altTokyoExterior: '村田宝飾ビルの外観',
    altReason1: 'ゴールドのリングやネックレスを並べた陳列台',
    altReason2: 'ピンセットで色石を選り分ける女性',
    altReason3: '工房の作業台で指輪を加工する職人の手元',
    altReason4: '店舗のテーブルでジュエリーを見ながら話す2人',
    carouselDefaultLabel: 'スライド',
    carouselPrev: '{label}の前へ',
    carouselNext: '{label}の次へ',
    carouselDots: '{label}の表示する写真',
    carouselSlide: '写真の表示位置 {n}／{total}',
  },
  en: {
    siteName: 'Murata Jewelry',
    companyName: 'Murata Jewelry Co., Ltd.',
    companyNameEn: 'MURATA JEWELRY',
    titleSeparator: ' | ',
    contactBranchMatsuyama: 'Matsuyama Branch',
    contactBranchTokyo: 'Tokyo Branch',
    contactMail: 'Email',
    contactMailSp: 'Email',
    contactTitle: 'Contact',
    contactLeadPc: 'Please contact us by phone or email with any questions or inquiries.',
    contactLeadSp: 'Please feel free to contact us by phone or email with any questions or inquiries.',
    headerContact: 'Contact',
    navGlobal: 'Global navigation',
    navFooter: 'Footer navigation',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    menuLabel: 'Menu',
    mailInquiry: 'Email us',
    langLabel: 'Language',
    langJa: '日本語',
    langEn: 'English',
    langZh: '中文',
    japaneseOnlySuffix: ' (Japanese)',
    navAbout: 'About Us',
    navBusiness: 'Our Business',
    navShop: 'Online Shop',
    navNews: 'News & Topics',
    navRecruit: 'Recruit',
    footerCompany: 'Company Overview',
    footerShop: 'Online Shop',
    footerRecruit: 'Recruit',
    footerFaq: 'FAQ',
    footerContact: 'Contact',
    footerPartners: 'New Business Inquiries',
    footerPrivacy: 'Privacy Policy',
    footerBusiness: 'Our Business',
    footerNews: 'News & Topics',
    heroAria: 'Main visual',
    heroAlt:
      'People shine, soar in the world. MURATA JEWELRY. A butterfly and star diamond necklace against a starry sky',
    altConcept1: 'Square sapphire pendant and diamond ring',
    altConcept2: 'Turquoise cat and paw-print rings with a chain',
    altAbout: 'Colored-stone and diamond rings and pendants with pearl and onyx necklaces',
    altOnlineShop: 'Star and butterfly diamond necklace with the words “The Jewelry Concierge”',
    draftBadge: 'Draft',
    notFoundTitle: 'Page not found',
    notFoundDescription: 'The page you are looking for could not be found.',
    notFoundBody: 'The page you are looking for may have been moved or deleted.',
    notFoundLink: 'Back to top',
    subnavAria: 'Related pages',
    timelineAria: 'Company history timeline',
    businessFlowAria: 'Business flow',
    wholesaleCarousel: 'Products',
    repairCarousel: 'Repair & processing',
    tokyoMapAria: 'Map of Tokyo store (opens in a new tab)',
    tokyoGalleryCarousel: 'Store gallery',
    altWholesale1: 'Diamond ring displayed on a stand',
    altWholesale2: 'Pearl bracelet with a gold clasp',
    altWholesale3: 'Gold ring with emeralds and diamonds arranged alternately',
    altWholesale4: 'Loose sapphires, rubies, and other stones arranged on white cloth',
    altRepair1: 'Rhodium plating in progress',
    altRepair2: 'Jewelry being repaired by laser welding',
    altStrength1: 'A woman drawing a jewelry design at a desk',
    altStrength2: 'A world map with markers in various places',
    altStrength3: 'An artisan’s hands working jewelry with tools',
    altStrength4: 'Colored stones and rough diamonds arranged on a tray',
    altTokyoInterior: 'Product shelves and display cases inside the Murata Jewelry building',
    altTokyoExterior: 'Exterior of the Murata Jewelry building',
    altReason1: 'Display table with gold rings and necklaces',
    altReason2: 'A woman sorting colored stones with tweezers',
    altReason3: 'An artisan’s hands working a ring at a workshop bench',
    altReason4: 'Two people talking while looking at jewelry at a store table',
    carouselDefaultLabel: 'Slides',
    carouselPrev: 'Previous {label}',
    carouselNext: 'Next {label}',
    carouselDots: 'Photos in {label}',
    carouselSlide: 'Photo position {n} of {total}',
  },
  zh: {
    siteName: '村田宝饰',
    companyName: '村田宝饰株式会社',
    companyNameEn: 'MURATA JEWELRY',
    titleSeparator: '｜',
    contactBranchMatsuyama: '松山支店',
    contactBranchTokyo: '东京支店',
    contactMail: '邮件',
    contactMailSp: '电子邮箱',
    contactTitle: '联系我们',
    contactLeadPc: '如有疑问或咨询，请通过电话或邮件与我们联系。',
    contactLeadSp: '如有疑问或咨询，欢迎通过电话或邮件随时与我们联系。',
    headerContact: '联系我们',
    navGlobal: '全站导航',
    navFooter: '页脚导航',
    menuOpen: '打开菜单',
    menuClose: '关闭菜单',
    menuLabel: '菜单',
    mailInquiry: '邮件咨询',
    langLabel: '语言',
    langJa: '日本語',
    langEn: 'English',
    langZh: '中文',
    japaneseOnlySuffix: ' (日文)',
    navAbout: '关于村田宝饰',
    navBusiness: '业务内容',
    navShop: '网上商店',
    navNews: '通知',
    navRecruit: '招聘信息',
    footerCompany: '公司概要',
    footerShop: '网上商店',
    footerRecruit: '招聘信息',
    footerFaq: 'FAQ',
    footerContact: '联系我们',
    footerPartners: '希望开展新交易的客户',
    footerPrivacy: '隐私政策',
    footerBusiness: '业务内容',
    footerNews: '通知',
    heroAria: '主视觉',
    heroAlt: '人因闪耀而辉映世界 MURATA JEWELRY 星空背景下的蝴蝶与星星钻石项链',
    altConcept1: '方形蓝宝石吊坠与钻石戒指',
    altConcept2: '绿松石猫咪与肉垫戒指及链条',
    altAbout: '彩色宝石与钻石戒指、吊坠，以及珍珠与玛瑙项链的陈列',
    altOnlineShop: '星星与蝴蝶钻石项链及“The Jewelry Concierge”字样',
    draftBadge: '草稿',
    notFoundTitle: '找不到页面',
    notFoundDescription: '找不到您要访问的页面。',
    notFoundBody: '您要访问的页面可能已移动或删除。',
    notFoundLink: '返回首页',
    subnavAria: '相关页面',
    timelineAria: '沿革年表',
    businessFlowAria: '业务流程',
    wholesaleCarousel: '经营商品',
    repairCarousel: '修理与加工',
    tokyoMapAria: '东京门店地图（在新标签页中打开）',
    tokyoGalleryCarousel: '门店图库',
    altWholesale1: '陈列在台座上的钻石戒指',
    altWholesale2: '带金色搭扣的珍珠手链',
    altWholesale3: '翡翠与钻石交替排列的黄金戒指',
    altWholesale4: '白布上排列的蓝宝石、红宝石等裸石',
    altRepair1: '镀铑加工的情景',
    altRepair2: '用激光焊接修理珠宝的情景',
    altStrength1: '坐在桌前绘制珠宝设计图的女性',
    altStrength2: '各地标有记号的世界地图',
    altStrength3: '工匠用工具加工珠宝的手部特写',
    altStrength4: '托盘上排列的彩色宝石与钻石原石',
    altTokyoInterior: '村田宝饰大楼内的商品架与陈列柜',
    altTokyoExterior: '村田宝饰大楼外观',
    altReason1: '摆放黄金戒指与项链的陈列台',
    altReason2: '用镊子挑选彩色宝石的女性',
    altReason3: '在工房作业台上加工戒指的工匠手部特写',
    altReason4: '在店铺桌边边看珠宝边交谈的两人',
    carouselDefaultLabel: '幻灯片',
    carouselPrev: '{label}上一张',
    carouselNext: '{label}下一张',
    carouselDots: '{label}中显示的照片',
    carouselSlide: '图片位置 {n}/{total}',
  },
};

export function t(lang: Lang, key: string): string {
  const value = dictionaries[lang][key] ?? dictionaries.ja[key];
  if (value === undefined) {
    throw new Error(`i18n key not found: ${key}`);
  }
  return value;
}

/** パスを正規化（クエリ・ハッシュを除き、トップ以外は末尾 /） */
export function normalizePath(pathname: string): string {
  const bare = pathname.split('?')[0]?.split('#')[0] ?? '/';
  if (bare === '' || bare === '/') return '/';
  return bare.endsWith('/') ? bare : `${bare}/`;
}

/** /en/... や /zh/... を除いたページキー（例: /en/company/ → /company/） */
export function pageKeyFromPath(pathname: string): string {
  const path = normalizePath(pathname);
  if (path === '/en/' || path === '/zh/') return '/';
  if (path.startsWith('/en/')) return path.slice(3);
  if (path.startsWith('/zh/')) return path.slice(3);
  return path;
}

export function langFromPath(pathname: string): Lang {
  const path = normalizePath(pathname);
  if (path === '/en/' || path.startsWith('/en/')) return 'en';
  if (path === '/zh/' || path.startsWith('/zh/')) return 'zh';
  return 'ja';
}

export function isTranslatedPage(pageKey: string): boolean {
  return translatedPages.includes(normalizePath(pageKey));
}

/** 言語プレフィックス付きのパス（defaultLocale はプレフィックスなし） */
export function localizedPath(pageKey: string, lang: Lang): string {
  const key = normalizePath(pageKey);
  if (lang === 'ja') return key;
  if (key === '/') return `/${lang}/`;
  return `/${lang}${key}`;
}

/**
 * ナビ・フッター用のリンク先。
 * 訳があるページはその言語の URL、無いページ（または今回未訳）は日本語 URL。
 */
export function hrefForLang(pageKey: string, lang: Lang): string {
  const key = normalizePath(pageKey);
  if (lang === 'ja') return key;
  if (isTranslatedPage(key)) return localizedPath(key, lang);
  return key;
}

/** 訳が無いページへ英語・中国語から張るときの接尾辞 */
export function untranslatedSuffix(lang: Lang): string {
  if (lang === 'ja') return '';
  return t(lang, 'japaneseOnlySuffix');
}

export function labelWithUntranslatedSuffix(label: string, pageKey: string, lang: Lang): string {
  if (lang === 'ja' || isTranslatedPage(pageKey)) return label;
  return `${label}${untranslatedSuffix(lang)}`;
}

/**
 * 言語切り替えの行き先。
 * いまのページに訳があれば同じページの別言語、無ければその言語のトップ。
 */
export function languageSwitchHref(currentPathname: string, targetLang: Lang): string {
  const key = pageKeyFromPath(currentPathname);
  if (isTranslatedPage(key)) return localizedPath(key, targetLang);
  return localizedPath('/', targetLang);
}

export function pageEntryId(page: string, lang: Lang): string {
  return lang === 'ja' ? page : `${lang}/${page}`;
}

export function homeEntryId(lang: Lang): string {
  return pageEntryId('home', lang);
}

export function buildFullTitle(title: string, lang: Lang): string {
  const siteName = t(lang, 'siteName');
  if (title === siteName) return title;
  return `${title}${t(lang, 'titleSeparator')}${siteName}`;
}

export type Alternate = { lang: Lang; href: string };

/** 訳ありページの alternate 一覧（絶対 URL）。pageKey は末尾 /（トップは /） */
export function alternatesFor(pageKey: string, site: URL | string): Alternate[] {
  const base = typeof site === 'string' ? site : site.href;
  const origin = base.replace(/\/$/, '');
  const key = normalizePath(pageKey);
  return langs.map((lang) => ({
    lang,
    href: `${origin}${localizedPath(key, lang)}`,
  }));
}
