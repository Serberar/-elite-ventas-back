import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureStatus(
  name: string,
  order: number,
  color: string,
  isFinal: boolean,
  isSystem: boolean
) {
  const existing = await prisma.saleStatus.findFirst({ where: { name } });
  if (!existing) {
    await prisma.saleStatus.create({
      data: { name, order, color, isFinal, isCancelled: false, isSystem },
    });
    console.log(`Created status: "${name}"`);
  } else {
    const needsUpdate =
      existing.isFinal !== isFinal || existing.isSystem !== isSystem;
    if (needsUpdate) {
      await prisma.saleStatus.update({
        where: { id: existing.id },
        data: { isFinal, isSystem },
      });
      console.log(`Updated status: "${name}"`);
    } else {
      console.log(`Status already exists: "${name}"`);
    }
  }
}

async function main() {
  console.log('Seeding sale statuses...');

  await ensureStatus('Pendiente firma', 1, '#f59e0b', false, true);
  await ensureStatus('Firmada', 2, '#10b981', true, true);

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
