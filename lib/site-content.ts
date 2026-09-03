import { z } from "zod";

import { prisma } from "./db";

// ---------------------------------------------------------------------------
// Defaults for section texts (what homepage hard-codes today)
// ---------------------------------------------------------------------------
export const DEFAULT_SECTION_TEXT = {
  calculatorTitle: "در ۳۰ ثانیه بفهمید خانواده‌تان به چه عددی نیاز دارد",
  calculatorDesc: "با وارد کردن اطلاعات زیر، برآورد اولیه پوشش پیشنهادی را به‌صورت تخمینی مشاهده کنید.",
  faqPreviewTitle: "پرسش‌های پرتکرار",
  referralTitle: "لینک اختصاصی ارجاع شما را دارید؟",
  referralDesc: "اگر از طریق یکی از بیمه‌شده‌های ما به این صفحه آمده‌ید، مشاوره شما با همان ارجاع ثبت می‌شود.",
} as const;

// Fallback values (used when DB not yet migrated or query fails)
// These mirror the values in content/client.config.ts but are defined here
// to avoid importing from content/ in lib/ (AGENTS.md §2.1).
const FALLBACK_DEFAULTS = {
  name: "اردلان نمونه",
  title: "نماینده فروش بیمه عمر",
  photo: "/images/profile-placeholder.jpg",
  bio: "با بیش از ۱۲ سال تجربه در صنعت بیمه عمر، همراه شما در مسیر امنیت مالی خانواده هستم. مشاوره تخصصی و پشتیبانی مستمر، تعهد من به شماست.",
  shortBio: "نماینده فروش بیمه عمر — ۱۲ سال تجربه",
  yearsExperience: 12,
  insuredCount: 800,
  satisfactionScore: 4.9,
  phone: "09123456789",
  website: "https://example.ir",
  address: "تهران، خیابان نمونه",
  agencyCode: null,
  whatsappNumber: "989123456789",
  whatsappMessage: "سلام، درباره بیمه عمر می‌خواستم مشاوره بگیرم.",
  telegramUsername: "ardalan_insurance",
} as const;

// ---------------------------------------------------------------------------
// Zod schema — shared between API (PUT) and admin form (react-hook-form).
// Numeric fields use coerce so form string inputs ("۱۲", "12") are accepted;
// string optional fields use preprocess to treat "" as null (clear to default).
// ---------------------------------------------------------------------------
const emptyToNull = (v: unknown) => (v === "" ? null : v);

const telegramUsernameRegex = /^@?[a-zA-Z0-9_]{3,32}$/;

export const siteContentSchema = z.object({
  name: z.string().trim().min(1, "نام الزامی است.").max(80, "نام حداکثر ۸۰ نویسه."),
  title: z.string().trim().min(1, "عنوان الزامی است.").max(80, "عنوان حداکثر ۸۰ نویسه."),
  photo: z
    .string()
    .trim()
    .min(1, "آدرس عکس الزامی است.")
    .max(500)
    .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), {
      message: "آدرس عکس باید با / یا https:// شروع شود.",
    }),
  bio: z.string().trim().min(1, "بیوگرافی الزامی است.").max(1000, "بیوگرافی حداکثر ۱۰۰۰ نویسه."),
  shortBio: z.string().trim().min(1, "بیوی کوتاه الزامی است.").max(200),
  yearsExperience: z.coerce.number().int("باید عدد صحیح باشد.").min(0, "نمی‌تواند منفی باشد.").max(60),
  insuredCount: z.coerce.number().int().min(0).max(1_000_000),
  satisfactionScore: z.coerce.number().min(0).max(5),
  phone: z.string().trim().min(7, "شماره تماس کوتاه است.").max(30),
  website: z.string().trim().min(1, "وب‌سایت الزامی است.").max(300),
  address: z.preprocess(
    emptyToNull,
    z.string().trim().max(300).nullable().optional(),
  ),
  agencyCode: z.preprocess(
    emptyToNull,
    z.string().trim().max(40).nullable().optional(),
  ),
  whatsappNumber: z.string().trim().min(7, "شماره واتساپ الزامی است.").max(20),
  whatsappMessage: z.string().trim().min(1, "پیام واتساپ الزامی است.").max(500),
  telegramUsername: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(40)
      .refine((v) => v === null || telegramUsernameRegex.test(v as string), {
        message: "نام کاربری تلگرام نامعتبر است. مثال: ardalan_insurance یا @ardalan_insurance",
      })
      .nullable()
      .optional(),
  ),
  telegramMessage: z.preprocess(
    emptyToNull,
    z.string().trim().max(500).nullable().optional(),
  ),
  eitaaUsername: z.preprocess(
    emptyToNull,
    z.string().trim().max(40).nullable().optional(),
  ),
  eitaaMessage: z.preprocess(
    emptyToNull,
    z.string().trim().max(500).nullable().optional(),
  ),
  rubikaUsername: z.preprocess(
    emptyToNull,
    z.string().trim().max(40).nullable().optional(),
  ),
  rubikaMessage: z.preprocess(
    emptyToNull,
    z.string().trim().max(500).nullable().optional(),
  ),
  // Reserved — stored only, not used to call external APIs (ARCHITECTURE.md §4)
  whatsappApiToken: z.preprocess(
    emptyToNull,
    z.string().trim().max(300).nullable().optional(),
  ),
  telegramBotToken: z.preprocess(
    emptyToNull,
    z.string().trim().max(300).nullable().optional(),
  ),
  eitaaBotToken: z.preprocess(
    emptyToNull,
    z.string().trim().max(300).nullable().optional(),
  ),
  rubikaBotToken: z.preprocess(
    emptyToNull,
    z.string().trim().max(300).nullable().optional(),
  ),
  calculatorTitle: z.preprocess(
    emptyToNull,
    z.string().trim().max(100).nullable().optional(),
  ),
  calculatorDesc: z.preprocess(
    emptyToNull,
    z.string().trim().max(300).nullable().optional(),
  ),
  faqPreviewTitle: z.preprocess(
    emptyToNull,
    z.string().trim().max(100).nullable().optional(),
  ),
  referralTitle: z.preprocess(
    emptyToNull,
    z.string().trim().max(100).nullable().optional(),
  ),
  referralDesc: z.preprocess(
    emptyToNull,
    z.string().trim().max(300).nullable().optional(),
  ),
});

export type SiteContentInput = z.infer<typeof siteContentSchema>;

export type ResolvedSiteContent = {
  id: string;
  name: string;
  title: string;
  photo: string;
  bio: string;
  shortBio: string;
  yearsExperience: number;
  insuredCount: number;
  satisfactionScore: number;
  phone: string;
  website: string;
  address?: string | null;
  agencyCode: string | null;
  whatsapp: { number: string; openerMessage: string; apiToken?: string | null };
  telegram: { username: string | null; message: string | null; botToken?: string | null };
  eitaa: { username: string | null; message: string | null; botToken?: string | null };
  rubika: { username: string | null; message: string | null; botToken?: string | null };
  calculatorTitle: string;
  calculatorDesc: string;
  faqPreviewTitle: string;
  referralTitle: string;
  referralDesc: string;
  updatedAt?: Date;
  createdAt?: Date;
};

export type RawSiteContent = {
  id: string;
  name: string;
  title: string;
  photo: string;
  bio: string;
  shortBio: string;
  yearsExperience: number;
  insuredCount: number;
  satisfactionScore: number;
  phone: string;
  agencyCode: string | null;
  website: string;
  address: string | null;
  whatsappNumber: string;
  whatsappMessage: string;
  telegramUsername: string | null;
  telegramMessage: string | null;
  eitaaUsername: string | null;
  eitaaMessage: string | null;
  rubikaUsername: string | null;
  rubikaMessage: string | null;
  whatsappApiToken: string | null;
  telegramBotToken: string | null;
  eitaaBotToken: string | null;
  rubikaBotToken: string | null;
  calculatorTitle: string | null;
  calculatorDesc: string | null;
  faqPreviewTitle: string | null;
  referralTitle: string | null;
  referralDesc: string | null;
  updatedAt: Date;
  createdAt: Date;
};

function fallbackRaw(): RawSiteContent {
  const now = new Date();
  return {
    id: "default",
    name: FALLBACK_DEFAULTS.name,
    title: FALLBACK_DEFAULTS.title,
    photo: FALLBACK_DEFAULTS.photo,
    bio: FALLBACK_DEFAULTS.bio,
    shortBio: FALLBACK_DEFAULTS.shortBio,
    yearsExperience: FALLBACK_DEFAULTS.yearsExperience,
    insuredCount: FALLBACK_DEFAULTS.insuredCount,
    satisfactionScore: FALLBACK_DEFAULTS.satisfactionScore,
    phone: FALLBACK_DEFAULTS.phone,
    agencyCode: FALLBACK_DEFAULTS.agencyCode ?? null,
    website: FALLBACK_DEFAULTS.website,
    address: FALLBACK_DEFAULTS.address ?? null,
    whatsappNumber: FALLBACK_DEFAULTS.whatsappNumber,
    whatsappMessage: FALLBACK_DEFAULTS.whatsappMessage,
    telegramUsername: FALLBACK_DEFAULTS.telegramUsername ?? null,
    telegramMessage: null,
    eitaaUsername: null,
    eitaaMessage: null,
    rubikaUsername: null,
    rubikaMessage: null,
    whatsappApiToken: null,
    telegramBotToken: null,
    eitaaBotToken: null,
    rubikaBotToken: null,
    calculatorTitle: null,
    calculatorDesc: null,
    faqPreviewTitle: null,
    referralTitle: null,
    referralDesc: null,
    updatedAt: now,
    createdAt: now,
  };
}

function toResolved(row: RawSiteContent): ResolvedSiteContent {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    photo: row.photo,
    bio: row.bio,
    shortBio: row.shortBio,
    yearsExperience: row.yearsExperience,
    insuredCount: row.insuredCount,
    satisfactionScore: row.satisfactionScore,
    phone: row.phone,
    agencyCode: row.agencyCode,
    website: row.website,
    address: row.address,
    whatsapp: { number: row.whatsappNumber, openerMessage: row.whatsappMessage, apiToken: row.whatsappApiToken ?? null },
    telegram: { username: row.telegramUsername, message: row.telegramMessage, botToken: row.telegramBotToken ?? null },
    eitaa: { username: row.eitaaUsername, message: row.eitaaMessage, botToken: row.eitaaBotToken ?? null },
    rubika: { username: row.rubikaUsername, message: row.rubikaMessage, botToken: row.rubikaBotToken ?? null },
    calculatorTitle: row.calculatorTitle ?? DEFAULT_SECTION_TEXT.calculatorTitle,
    calculatorDesc: row.calculatorDesc ?? DEFAULT_SECTION_TEXT.calculatorDesc,
    faqPreviewTitle: row.faqPreviewTitle ?? DEFAULT_SECTION_TEXT.faqPreviewTitle,
    referralTitle: row.referralTitle ?? DEFAULT_SECTION_TEXT.referralTitle,
    referralDesc: row.referralDesc ?? DEFAULT_SECTION_TEXT.referralDesc,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

export async function getRawSiteContent(): Promise<RawSiteContent> {
  try {
    const row = await prisma.siteContent.findUnique({ where: { id: "default" } });
    if (row) return row as RawSiteContent;
  } catch {
    // DB not migrated yet or query failed — fallback to file
  }
  return fallbackRaw();
}

export async function getSiteContent(): Promise<ResolvedSiteContent> {
  const raw = await getRawSiteContent();
  return toResolved(raw);
}

export function buildTelegramUrl(username: string, message?: string | null): string {
  const clean = username.trim().replace(/^@/, "");
  if (!clean) throw new Error("Telegram username is required");
  const base = `https://t.me/${clean}`;
  const trimmed = message?.trim();
  if (!trimmed) return base;
  return `${base}?text=${encodeURIComponent(trimmed)}`;
}

export function buildEitaaUrl(username: string, message?: string | null): string {
  const clean = username.trim().replace(/^@/, "");
  if (!clean) throw new Error("Eitaa username is required");
  const base = `https://eitaa.com/${clean}`;
  const trimmed = message?.trim();
  if (!trimmed) return base;
  return `${base}?text=${encodeURIComponent(trimmed)}`;
}

export function buildRubikaUrl(username: string, message?: string | null): string {
  const clean = username.trim().replace(/^@/, "");
  if (!clean) throw new Error("Rubika username is required");
  const base = `https://rubika.us/${clean}`;
  const trimmed = message?.trim();
  if (!trimmed) return base;
  return `${base}?text=${encodeURIComponent(trimmed)}`;
}