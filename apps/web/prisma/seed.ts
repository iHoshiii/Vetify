import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding local database...");

  const user = await prisma.user.upsert({
    where: { email: "demo@vetify.ai" },
    update: {},
    create: {
      email: "demo@vetify.ai",
      name: "Demo User",
      pets: {
        create: [
          {
            name: "Buddy",
            species: "Dog",
            breed: "Labrador Retriever",
            age: 3,
            weight: 30.5,
          },
        ],
      },
    },
  });

  console.log("Seeded user:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
