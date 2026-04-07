const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const { search, replace } of replacements) {
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

// 1. Sale HTML
replaceInFile(path.join(srcDir, 'app/features/pos/sale/sale.html'), [
    { search: 'selectedStudent.account?.balanceCents', replace: 'selectedStudent.accounts?.[0]?.balanceCents' }
]);

// 2. Charge Modal HTML
replaceInFile(path.join(srcDir, 'app/features/pos/balance/charge-modal.html'), [
    { search: 'selectedStudent.account?.balanceCents', replace: 'selectedStudent.accounts?.[0]?.balanceCents' }
]);

// 3. Sync Service
replaceInFile(path.join(srcDir, 'app/core/services/sync.service.ts'), [
    { search: 's.account?.balanceCents', replace: 's.accounts?.[0]?.balanceCents' }
]);

console.log('Frontend replacements finished.');
