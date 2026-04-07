import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Superadmin Seeder ---');

    // 1. Asegurar que los roles básicos existan
    const roles = [
        { name: 'ADMIN', description: 'Acceso total al sistema' },
        { name: 'CASHIER', description: 'Operaciones de punto de venta' },
        { name: 'ENCARGADO', description: 'Gestión intermiedia de stock y reportes' },
        { name: 'PARENT', description: 'Padre/Tutor de alumnos' },
    ];

    for (const r of roles) {
        await prisma.role.upsert({
            where: { name: r.name },
            update: {},
            create: r,
        });
        console.log(`Rol verificado: ${r.name}`);
    }

    // 2. Crear el superadmin
    const adminEmail = 'admin@KioEdu.com';
    const adminPassword = 'SuperAdmin123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });

    if (!adminRole) {
        console.error('Error: El rol ADMIN no existe.');
        return;
    }

    const user = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            password: hashedPassword,
            isActive: true
        },
        create: {
            email: adminEmail,
            name: 'Super Admin',
            password: hashedPassword,
            isActive: true,
        },
    });

    // 3. Asignar el rol al usuario
    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: user.id,
                roleId: adminRole.id,
            },
        },
        update: {},
        create: {
            userId: user.id,
            roleId: adminRole.id,
        },
    });

    console.log('--------------------------');
    console.log('Superadmin creado con éxito:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('--------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
