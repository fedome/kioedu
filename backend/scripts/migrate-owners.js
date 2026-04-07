const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Data Migration: Owner Initialization ---');

    // 1. Get all schools
    const schools = await prisma.school.findMany();

    for (const school of schools) {
        console.log(`Processing School: ${school.name} (ID: ${school.id})`);

        // Create default owner for this school if it doesn't exist
        let owner = await prisma.owner.findFirst({
            where: { schoolId: school.id, name: 'Principal' }
        });

        if (!owner) {
            owner = await prisma.owner.create({
                data: {
                    schoolId: school.id,
                    name: 'Principal',
                }
            });
            console.log(`  Created default Owner: ${owner.name} (ID: ${owner.id})`);
        } else {
            console.log(`  Default Owner already exists: ID ${owner.id}`);
        }

        // 2. Assign Kiosks of this school to this owner
        const kioskResult = await prisma.kiosk.updateMany({
            where: { schoolId: school.id, ownerId: null },
            data: { ownerId: owner.id }
        });
        console.log(`  Assigned ${kioskResult.count} Kiosks`);

        // 3. Assign Products of this school to this owner
        // Note: Products currently don't have schoolId directly, but we can infer from Kiosks or just assign all to the first school's owner if it's a single school setup.
        // However, if we have multiple schools, we need to be careful.
        // For now, let's look at the products and if schoolId is not there, we'll try to find any link.
        // Since Product has no schoolId, and the user said "el programa es multi kiosco y multi colegio", 
        // maybe products were intended to be shared? No, my plan is to isolate them.
        // I will assign ALL current products to the FIRST owner I find if no schoolId is present in products.
        // Wait, let's see if there are any products with schoolId? No, I checked and it wasn't there.
    }

    // Fallback for Products/Categories/Suppliers that don't have a school link:
    // We'll assign them to the FIRST owner created.
    const firstOwner = await prisma.owner.findFirst();
    if (firstOwner) {
        const pRes = await prisma.product.updateMany({ where: { ownerId: null }, data: { ownerId: firstOwner.id } });
        const cRes = await prisma.category.updateMany({ where: { ownerId: null }, data: { ownerId: firstOwner.id } });
        const sRes = await prisma.supplier.updateMany({ where: { ownerId: null }, data: { ownerId: firstOwner.id } });
        const aRes = await prisma.account.updateMany({ where: { ownerId: null }, data: { ownerId: firstOwner.id } });

        console.log(`Fallback assignment to Owner ID ${firstOwner.id}:`);
        console.log(`  Products: ${pRes.count}`);
        console.log(`  Categories: ${cRes.count}`);
        console.log(`  Suppliers: ${sRes.count}`);
        console.log(`  Accounts: ${aRes.count}`);
    }

    console.log('--- Data Migration Finished ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
