import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrBlock } from "@/components/card/QrBlock";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { env } from "@/lib/env";
import { getSiteContent, buildTelegramUrl } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `کارت دیجیتال — ${content.name}`,
    description: content.shortBio,
  };
}

async function getCardUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? (env.NODE_ENV === "production" ? "https" : "http");
    if (host) return `${proto}://${host}/card`;
  } catch {
    // ignore
  }
  const envDomain = env.SITE_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (envDomain) {
    const proto = env.NODE_ENV === "production" ? "https" : "http";
    const base = env.SITE_DOMAIN.startsWith("http") ? env.SITE_DOMAIN.replace(/\/$/, "") : `${proto}://${envDomain}`;
    return `${base}/card`;
  }
  const content = await getSiteContent();
  const base = content.website.replace(/\/$/, "");
  return `${base}/card`;
}

export default async function CardPage() {
  const cardUrl = await getCardUrl();
  const content = await getSiteContent();
  const whatsappHref = buildWhatsAppUrl(content.whatsapp.number, content.whatsapp.openerMessage);
  const telegramHref = content.telegram.username
    ? buildTelegramUrl(content.telegram.username, content.telegram.message)
    : null;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center px-4 py-8">
      <div className="flex w-full flex-col items-center gap-6 text-center">
        <div className="size-28 overflow-hidden rounded-full bg-muted ring-1 ring-primary/25 ring-offset-2 ring-offset-background sm:size-32">
          <Image
            src={content.photo}
            alt={`عکس ${content.name}`}
            width={128}
            height={128}
            priority
            sizes="128px"
            className="size-28 object-cover sm:size-32"
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-bold sm:text-2xl">{content.name}</h1>
          <p className="text-sm text-muted-foreground">{content.title}</p>
          {content.bio ? (
            <p className="max-w-sm text-sm leading-7 text-muted-foreground">{content.bio}</p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button asChild className="w-full" size="lg">
            <a href="/api/vcard" download aria-label="افزودن به مخاطبین">
              افزودن به مخاطبین ＋
            </a>
          </Button>

          <Button asChild variant="outline" className="w-full" size="lg">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="پیام در واتساپ">
              پیام در واتساپ
            </a>
          </Button>

          {telegramHref ? (
            <Button asChild variant="outline" className="w-full" size="lg">
              <a href={telegramHref} target="_blank" rel="noopener noreferrer" aria-label="پیام در تلگرام">
                پیام در تلگرام
              </a>
            </Button>
          ) : null}
        </div>

        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-3 p-4">
            <QrBlock url={cardUrl} size={176} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
