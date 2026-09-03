import FaqSection from "@/components/home/FaqSection";
import NeedsCalculatorForm from "@/components/home/NeedsCalculatorForm";
import ProfileHero from "@/components/home/ProfileHero";
import ReferralCta from "@/components/home/ReferralCta";
import { prisma } from "@/lib/db";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

async function getFaqItems() {
  try {
    return await prisma.faqItem.findMany({
      orderBy: { order: "asc" },
      select: { id: true, category: true, question: true, answer: true },
    });
  } catch {
    return [];
  }
}

export default async function Home() {
  const [content, faqItems] = await Promise.all([getSiteContent(), getFaqItems()]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
      <ProfileHero content={content} />
      <NeedsCalculatorForm title={content.calculatorTitle} description={content.calculatorDesc} />
      <FaqSection items={faqItems} title={content.faqPreviewTitle} />
      <ReferralCta title={content.referralTitle} description={content.referralDesc} />
    </div>
  );
}
