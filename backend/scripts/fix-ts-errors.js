const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const testDir = path.join(__dirname, '../test');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const { search, replace } of replacements) {
        // using split join to replace all instances
        if (typeof search === 'string') {
            content = content.split(search).join(replace);
        } else {
            content = content.replace(search, replace);
        }
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

// 1. accounts.service.ts
replaceInFile(path.join(srcDir, 'accounts/accounts.service.ts'), [
    { search: 'findUnique({ where: { childId } })', replace: 'findFirst({ where: { childId } })' },
    { search: 'if (!acc) acc = await this.prisma.account.create({ data: { childId } });', replace: 'if (!acc) { const owner = await this.prisma.owner.findFirst({ where: { schoolId: child.schoolId } }); acc = await this.prisma.account.create({ data: { childId, ownerId: owner?.id || 1 } }); }' }
]);

// 2. categories.service.ts
replaceInFile(path.join(srcDir, 'categories/categories.service.ts'), [
    { search: 'data: createCategoryDto,', replace: 'data: { ...createCategoryDto, ownerId: 1 },' }
]);

// 3. children.service.ts
replaceInFile(path.join(srcDir, 'children/children.service.ts'), [
    { search: 'account: {', replace: 'accounts: {' },
    { search: 'account: true', replace: 'accounts: true' },
    { search: 'create: {\\n                        balanceCents: 0\\n                    }', replace: 'create: { balanceCents: 0, ownerId: 1 }' }
]);

// 4. limits.service.ts
replaceInFile(path.join(srcDir, 'limits/limits.service.ts'), [
    { search: 'findUnique({ where: { childId } })', replace: 'findFirst({ where: { childId } })' },
    { search: 'account: {', replace: 'accounts: {' }
]);

// 5. payments.service.ts
replaceInFile(path.join(srcDir, 'payments/payments.service.ts'), [
    { search: 'account: true', replace: 'accounts: true' },
    { search: 'card.child.account', replace: 'card.child.accounts?.[0]' },
    { search: 'accountId: account.id,', replace: 'accountId: account.id, ownerId: account.ownerId,' }
]);

// 6. products.service.ts
replaceInFile(path.join(srcDir, 'products/products.service.ts'), [
    { search: 'data: {', replace: 'data: { ownerId: 1,' },
    { search: 'findUnique({', replace: 'findFirst({' },
    { search: 'where: { barcode_ownerId: { barcode }', replace: 'where: { barcode' } // In case findFirst is used
]);

// 7. suppliers.service.ts
replaceInFile(path.join(srcDir, 'suppliers/suppliers.service.ts'), [
    { search: 'data: createSupplierDto,', replace: 'data: { ...createSupplierDto, ownerId: 1 },' }
]);

// 8. users.service.ts
replaceInFile(path.join(srcDir, 'users/users.service.ts'), [
    { search: 'account: {', replace: 'accounts: {' },
    { search: 'account: true', replace: 'accounts: true' },
    { search: 'create: { balanceCents: 0 }', replace: 'create: { balanceCents: 0, ownerId: 1 }' }
]);

// 9. pos.service.ts (remnants of transaction creation missing ownerId for createPendingTransaction)
replaceInFile(path.join(srcDir, 'pos/pos.service.ts'), [
    { search: 'terminalId,\\n                    accountId: accountId,', replace: 'terminalId, accountId: accountId, ownerId: 1,' }
]);

// 10. test/pos.e2e-spec.ts
replaceInFile(path.join(testDir, 'pos.e2e-spec.ts'), [
    { search: 'account: {', replace: 'accounts: {' },
    { search: 'account: true', replace: 'accounts: true' },
    { search: '.account!', replace: '.accounts[0]!' },
    { search: 'role:', replace: 'roles:' },
    { search: 'create: { balanceCents: 500000 }', replace: 'create: { balanceCents: 500000, ownerId: 1 }' }
]);

// 11. prisma/seed.ts
replaceInFile(path.join(__dirname, '../prisma/seed.ts'), [
    { search: 'schoolId: school.id,', replace: 'schoolId: school.id, ownerId: 1,' },
    { search: 'priceCents: 15000,', replace: 'priceCents: 15000, ownerId: 1,' }
]);
