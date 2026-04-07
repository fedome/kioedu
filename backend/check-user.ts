import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@KioEdu.com' },
        include: { roles: { include: { role: true } } }
    });

    if (!user) {
        console.log('❌ User NOT found');
        return;
    }

    console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        roles: user.roles.map(r => r.role.name)
    });

    const passMatch = await bcrypt.compare('SuperAdmin123!', user.password);
    console.log('🔑 Password match (SuperAdmin123!):', passMatch);

    await prisma.$disconnect();
}

check();
