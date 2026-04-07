const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Data Migration: Owner Initialization V2 ---');

    const schools = await prisma.school.findMany();

    for (const school of schools) {
        console.log(`Processing School: ${school.name} (ID: ${school.id})`);

        let owner = await prisma.owner.findFirst({
            where: { schoolId: school.id, name: 'Principal' }
        });

        if (!owner) {
            owner = await prisma.owner.create({
                data: { schoolId: school.id, name: 'Principal' }
            });
            console.log(`  Created default Owner: ID ${owner.id}`);
        }

        // Assign Kiosks
        await prisma.kiosk.updateMany({
            where: { schoolId: school.id, ownerId: null },
            data: { ownerId: owner.id }
        });

        // Assign Transactions based on terminalId (kioskId)
        // We fetch kiosks of this school to find their transactions
        const kiosks = await prisma.kiosk.findMany({ where: { schoolId: school.id } });
        for (const kiosk of kiosks) {
            const txRes = await prisma.transaction.updateMany({
                where: { terminalId: kiosk.id, ownerId: null },
                data: { ownerId: kiosk.ownerId || owner.id }
            });
            if (txRes.count > 0) console.log(`  Assigned ${txRes.count} Transactions to Owner ID ${kiosk.ownerId || owner.id} for Kiosk ${kiosk.id}`);
        }
    }

    const firstOwner = await prisma.owner.findFirst();
    if (firstOwner) {
        const pRes = await prisma.product.updateMany({ where: { ownerId: null }, data: { ownerId: firstOwner.id } });
        const cRes = await prisma.category.updateMany({ where: { ownerId: null }, data: { ownerId: firstOwner.id } });
        const sRes = await prisma.supplier.updateMany({ where: { ownerId: null }, data: { ownerId: firstOwner.id } });
        const aRes = await prisma.account.updateMany({ where: { ownerId: null }, data: { ownerId: firstOwner.id } });
        const tRes = await prisma.transaction.updateMany({ where: { ownerId: null }, data: { ownerId: firstOwner.id } });

        console.log(`Fallback assignment to Owner ID ${firstOwner.id}:`);
        console.log(`  Products: ${pRes.count}, Categories: ${cRes.count}, Suppliers: ${sRes.count}, Accounts: ${aRes.count}, Transactions: ${tRes.count}`);
    }

    console.log('--- Data Migration Finished ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
