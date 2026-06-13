import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete existing seats first
  await prisma.booking.deleteMany();
  await prisma.seat.deleteMany();

  // Create seats A1–A10, B1–B10
  const seats = [];
  for (const row of ["A", "B"]) {
    for (let i = 1; i <= 10; i++) {
      seats.push({ number: `${row}${i}` });
    }
  }

  await prisma.seat.createMany({ data: seats });
  console.log(`✅ Created ${seats.length} seats`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());