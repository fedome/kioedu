const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Fixing orphaned transactions ---');

    const firstOwner = await prisma.owner.findFirst();

    if (!firstOwner) {
        console.log('No owner found. Migration might fail if there are transactions.');
        return;
    }

    const result = await prisma.$executeRawUnsafe(
        `UPDATE "Transaction" SET "ownerId" = ${firstOwner.id} WHERE "ownerId" IS NULL`
    );

    console.log(`Successfully updated ${result} orphaned transactions to owner ${firstOwner.id}.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
