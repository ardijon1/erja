import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const agents = [
  { name: "admin", slug: "admin", password: "Admin@123", phone: null },
  { name: "محمد رضایی", slug: "mohammad", password: "Mohammad@123", phone: "09121112233" },
  { name: "علی احمدی", slug: "ali", password: "Ali@123", phone: "09133334455" },
  { name: "زهرا کریمی", slug: "zahra", password: "Zahra@123", phone: "09195556677" },
];

async function main() {
  console.log("Seeding agents...");

  for (const agent of agents) {
    const passwordHash = await bcrypt.hash(agent.password, 10);

    if (agent.slug === "admin") {
      // Admin is handled via env var, skip
      console.log(`  Skipping admin (use ADMIN_PASSWORD_HASH env var)`);
      continue;
    }

    const existing = await prisma.agent.findUnique({ where: { slug: agent.slug } });
    if (existing) {
      console.log(`  Agent "${agent.name}" (${agent.slug}) already exists, skipping`);
      continue;
    }

    await prisma.agent.create({
      data: {
        name: agent.name,
        slug: agent.slug,
        passwordHash,
        phone: agent.phone,
      },
    });
    console.log(`  Created agent: ${agent.name} (${agent.slug}) / ${agent.password}`);
  }

  console.log("\nDone! Agents seeded.");
  console.log("\nLogin credentials:");
  console.log("  admin     / Admin@123");
  console.log("  mohammad  / Mohammad@123");
  console.log("  ali       / Ali@123");
  console.log("  zahra     / Zahra@123");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
