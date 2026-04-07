// scripts/smoke.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
    try {
        const schools = await prisma.school.findMany({ take: 1 });
        console.log('OK Prisma. Ejemplo School:', schools);
    } catch (e) {
        console.error('Smoke test ERROR:', e);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
})();
