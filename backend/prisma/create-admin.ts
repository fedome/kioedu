/**
 * Script para crear (o resetear) un usuario ADMIN rápidamente.
 * 
 * Uso:  npx tsx prisma/create-admin.ts
 * 
 * Si el email ya existe, sólo resetea la contraseña.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@kioedu.com';
const ADMIN_PASSWORD = 'Admin1234!';
const ADMIN_NAME = 'Administrador';

async function main() {
    console.log('🔧 Creando/reseteando usuario admin...');

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // Buscar si ya existe
    const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

    if (existing) {
        // Solo resetear contraseña
        await prisma.user.update({
            where: { id: existing.id },
            data: { password: hash, isActive: true },
        });
        console.log(`✅ Contraseña reseteada para ${ADMIN_EMAIL}`);
    } else {
        // Buscar la escuela y el rol ADMIN
        const school = await prisma.school.findFirst();
        if (!school) {
            console.error('❌ No hay ninguna escuela en la BD. Corré el seed primero.');
            process.exit(1);
        }

        let adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
        if (!adminRole) {
            adminRole = await prisma.role.create({
                data: { name: 'ADMIN', description: 'Acceso total', schoolId: school.id, isPosRole: true },
            });
        }

        const user = await prisma.user.create({
            data: {
                name: ADMIN_NAME,
                email: ADMIN_EMAIL,
                password: hash,
                isActive: true,
                schoolId: school.id,
                roles: {
                    create: [{ roleId: adminRole.id }],
                },
            },
        });

        console.log(`✅ Usuario admin creado (ID: ${user.id})`);
    }

    console.log(`\n📋 Credenciales:`);
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`\n⚠️  Cambiá la contraseña después del primer login.`);

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
});
