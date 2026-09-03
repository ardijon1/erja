import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { ContactDock } from "@/components/shared/ContactDock";
import { getSiteContent } from "@/lib/site-content";

const vazirmatn = localFont({
  src: [{ path: "../public/fonts/Vazirmatn-Variable.woff2", style: "normal" }],
  variable: "--font-vazirmatn",
  display: "swap",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `${content.name} — ${content.title}`,
    description: content.bio,
    openGraph: {
      title: content.name,
      description: content.shortBio,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent();

  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground min-h-dvh flex flex-col antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <SiteHeader siteName={content.name} />
          <main className="flex-1">{children}</main>
          <ContactDock
            whatsappNumber={content.whatsapp.number}
            whatsappMessage={content.whatsapp.openerMessage}
            telegramUsername={content.telegram.username}
            telegramMessage={content.telegram.message}
            eitaaUsername={content.eitaa.username}
            eitaaMessage={content.eitaa.message}
            rubikaUsername={content.rubika.username}
            rubikaMessage={content.rubika.message}
          />
          <SiteFooter
            phone={content.phone}
            website={content.website}
            address={content.address ?? null}
            agencyCode={content.agencyCode ?? null}
            name={content.name}
            title={content.title}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
