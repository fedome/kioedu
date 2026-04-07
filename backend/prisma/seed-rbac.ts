import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding roles and permissions...');

    const roles = [
        { name: 'ADMIN', description: 'Administrador con acceso total' },
        { name: 'CASHIER', description: 'Cajero para ventas en kiosco' },
        { name: 'PARENT', description: 'Padre para gestión de hijos y saldo' },
        { name: 'ENCARGADO', description: 'Encargado de local / Stock' },
    ];

    for (const r of roles) {
        await prisma.role.upsert({
            where: { name: r.name },
            update: { description: r.description },
            create: { name: r.name, description: r.description },
        });
    }

    const permissions = [
        { action: 'manage', subject: 'all', description: 'Full access' },
        { action: 'create', subject: 'sale', description: 'Create sales' },
        { action: 'read', subject: 'report', description: 'Read reports' },
        { action: 'manage', subject: 'inventory', description: 'Manage inventory' },
    ];

    for (const p of permissions) {
        await prisma.permission.upsert({
            where: {
                action_subject: { action: p.action, subject: p.subject }
            },
            update: { description: p.description },
            create: { action: p.action, subject: p.subject, description: p.description },
        });
    }

    // Asignar todos los permisos a ADMIN (opcional, solo como ejemplo)
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const allPerms = await prisma.permission.findMany();

    if (adminRole) {
        for (const p of allPerms) {
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: { roleId: adminRole.id, permissionId: p.id }
                },
                update: {},
                create: { roleId: adminRole.id, permissionId: p.id },
            });
        }
    }

    // Migrar usuarios existentes (opcional si sabemos sus emails o IDs)
    // Como no queremos arriesgar, esto se puede hacer manual o por script posterior.
    // Pero para agilizar, podemos buscar a todos los usuarios y darles un rol por defecto.
    const users = await prisma.user.findMany();
    const parentRole = await prisma.role.findUnique({ where: { name: 'PARENT' } });

    if (parentRole) {
        for (const u of users) {
            // Si no tienen roles, les damos PARENT por defecto
            const count = await prisma.userRole.count({ where: { userId: u.id } });
            if (count === 0) {
                await prisma.userRole.create({
                    data: { userId: u.id, roleId: parentRole.id }
                });
            }
        }
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
