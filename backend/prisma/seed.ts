import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('✨ Iniciando Seed...');

        // 1. ESCUELA
        const school = await prisma.school.create({
            data: { name: 'Colegio KioEdu' },
        });
        console.log('✅ School OK');

        // 1.5. OWNER
        const owner = await prisma.owner.create({
            data: { name: 'Dueño Principal', schoolId: school.id },
        });
        console.log('✅ Owner OK');

        // 2. ROLES
        const rolesData = [
            { name: 'ADMIN', description: 'Acceso total', schoolId: school.id, isPosRole: true },
            { name: 'CASHIER', description: 'Cajero POS', schoolId: school.id, isPosRole: true },
            { name: 'ENCARGADO', description: 'Gestión stock/reportes', schoolId: school.id, isPosRole: true },
            { name: 'PARENT', description: 'Padre/Tutor', schoolId: school.id, isPosRole: false },
        ];

        const createdRoles: Record<string, any> = {};
        for (const r of rolesData) {
            createdRoles[r.name] = await prisma.role.create({ data: r });
        }
        console.log('✅ Roles OK');

        // 3. PERMISSIONS
        const permissionsData = [
            { action: 'manage', subject: 'pos', description: 'Acceso total al POS' },
            { action: 'sale', subject: 'pos', description: 'Realizar ventas' },
            { action: 'refund', subject: 'pos', description: 'Realizar reembolsos' },
            { action: 'session', subject: 'pos', description: 'Abrir/Cerrar caja' },
            { action: 'manage', subject: 'products', description: 'CRUD de productos y stock' },
            { action: 'view', subject: 'products', description: 'Ver inventario' },
            { action: 'manage', subject: 'users', description: 'CRUD de usuarios' },
            { action: 'manage', subject: 'roles', description: 'Configurar roles y permisos' },
            { action: 'manage', subject: 'students', description: 'Gestión de alumnos y saldos' },
            { action: 'view', subject: 'reports', description: 'Ver reportes y dashboard' },
            { action: 'view', subject: 'audit', description: 'Ver log de auditoría' },
            { action: 'manage', subject: 'settings', description: 'Configuración general' },
        ];

        const createdPermissions: Record<string, number> = {};
        for (const p of permissionsData) {
            const perm = await prisma.permission.create({ data: p });
            createdPermissions[`${p.action}:${p.subject}`] = perm.id;
        }
        console.log('✅ Permissions OK');

        // 4. ROLE-PERMISSION MAPPING
        const adminPerms = Object.values(createdPermissions);
        const encargadoPerms = [
            createdPermissions['sale:pos'],
            createdPermissions['session:pos'],
            createdPermissions['manage:products'],
            createdPermissions['view:products'],
            createdPermissions['manage:students'],
            createdPermissions['view:reports'],
            createdPermissions['view:audit'],
        ];
        const cashierPerms = [
            createdPermissions['sale:pos'],
            createdPermissions['session:pos'],
            createdPermissions['manage:students'],
        ];

        const roleAssignments = [
            { role: 'ADMIN', perms: adminPerms },
            { role: 'ENCARGADO', perms: encargadoPerms },
            { role: 'CASHIER', perms: cashierPerms },
        ];

        for (const assign of roleAssignments) {
            const role = createdRoles[assign.role];
            if (role) {
                await prisma.rolePermission.createMany({
                    data: assign.perms.map(pId => ({
                        roleId: role.id,
                        permissionId: pId
                    }))
                });
            }
        }
        console.log('✅ Role-Permission Mapping OK');

        // 5. KIOSCO
        await prisma.kiosk.create({
            data: {
                schoolId: school.id, ownerId: owner.id,
                name: 'Kiosco Principal',
                apiKey: 'KIOSK_DEMO_KEY_123',
            },
        });
        console.log('✅ Kiosk OK');

        // 6. SUPERADMIN
        const adminEmail = 'admin@KioEdu.com';
        const adminPassword = 'SuperAdmin123!';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        const adminUser = await prisma.user.create({
            data: {
                name: 'Super Admin',
                email: adminEmail,
                password: hashedPassword,
                isActive: true,
                schoolId: school.id,
            },
        });

        const adminRole = createdRoles['ADMIN'];
        if (adminRole) {
            await prisma.userRole.create({
                data: {
                    userId: adminUser.id,
                    roleId: adminRole.id,
                },
            });
        }
        console.log('✅ Super Admin OK');

        // 7. PRODUCTOS
        const products = [
            { name: 'Alfajor Guaymallen', barcode: '7791234567890', price: 600, stock: 50, min: 10 },
            { name: 'Coca Cola 500ml', barcode: '7790000000001', price: 1200, stock: 5, min: 5 },
            { name: 'Sandwich Miga', barcode: '2000000000001', price: 1500, stock: 10, min: 5 },
            { name: 'Agua Mineral', barcode: '7790000000002', price: 800, stock: 24, min: 5 },
        ];

        for (const p of products) {
            await prisma.product.create({
                data: {
                    ownerId: owner.id,
                    name: p.name,
                    barcode: p.barcode,
                    priceCents: p.price * 100,
                    stockQuantity: p.stock,
                    minStockLevel: p.min,
                    isActive: true,
                    batches: {
                        create: [{ quantity: p.stock, expirationDate: new Date('2025-12-31') }]
                    }
                }
            });
        }
        console.log('✅ Productos OK');

        console.log('🌱 SEED FINALIZADO CON ÉXITO');

    } catch (error) {
        console.error('❌ ERROR DURANTE EL SEED:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();