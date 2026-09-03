import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existingContent = await prisma.siteContent.findUnique({ where: { id: "default" } });
  if (!existingContent) {
    await prisma.siteContent.create({
      data: {
        id: "default",
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
        whatsappNumber: "989123456789",
        whatsappMessage: "سلام، درباره بیمه عمر می‌خواستم مشاوره بگیرم.",
        telegramUsername: null,
        telegramMessage: null,
        calculatorTitle: null,
        calculatorDesc: null,
        faqPreviewTitle: null,
        referralTitle: null,
        referralDesc: null,
      },
    });
    console.log("[seed] created SiteContent default");
  } else {
    const needsPatch =
      (existingContent as unknown as Record<string, unknown>).telegramUsername === undefined ||
      existingContent.telegramUsername === null;
    if (needsPatch && existingContent.telegramUsername === null) {
      console.log("[seed] SiteContent already exists (telegram null — set it in admin panel)");
    } else {
      console.log("[seed] SiteContent already exists");
    }
  }

  const existing = await prisma.referrer.findUnique({
    where: { code: "ardalan-demo" },
  });
  if (existing) {
    console.log(`[seed] sample referrer already exists: ${existing.code}`);
    return;
  }
  const referrer = await prisma.referrer.create({
    data: {
      code: "ardalan-demo",
      displayName: "نمونه معرف (توسعه)",
    },
  });
  console.log(`[seed] created sample referrer: ${referrer.code} (${referrer.id})`);

  await prisma.referralClick.create({
    data: { referrerId: referrer.id, userAgent: "seed-script" },
  });
  console.log("[seed] created 1 sample click");

  await prisma.lead.create({
    data: {
      name: "سرنخ نمونه",
      phone: "09123456789",
      message: "این یک سرنخ نمونه برای تست داشبورد است.",
      referrerId: referrer.id,
      estimatedCover: 500_000_000,
      status: "new",
    },
  });
  console.log("[seed] created 1 sample lead");
}

main()
  .catch((e) => {
    console.error("[seed] error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
