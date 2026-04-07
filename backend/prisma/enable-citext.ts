import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔧 Enabling citext extension...');
        await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "citext";');
        console.log('✅ Extension enabled successfully.');
    } catch (error) {
        console.error('❌ Error enabling extension:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
