const fs = require('fs');
const data = JSON.parse(fs.readFileSync('eslint.json', 'utf8'));

let out = '\\n--- Unused Variables in app/actions/ ---\\n';
data.forEach(file => {
    if (file.filePath.includes('/app/actions/') || file.filePath.includes('\\\\app\\\\actions\\\\')) {
        const unused = file.messages.filter(m => m.ruleId === '@typescript-eslint/no-unused-vars' || m.ruleId === 'no-unused-vars');
        if (unused.length > 0) {
            out += `File: ${file.filePath}\\n`;
            unused.forEach(m => out += `  Line ${m.line}: ${m.message}\\n`);
        }
    }
});

out += '\\n--- Img Tags (no-img-element) ---\\n';
data.forEach(file => {
    const imgErrors = file.messages.filter(m => m.ruleId === '@next/next/no-img-element');
    if (imgErrors.length > 0) {
        out += `File: ${file.filePath}\\n`;
        imgErrors.forEach(m => out += `  Line ${m.line}: ${m.message}\\n`);
    }
});

fs.writeFileSync('eslint-parsed.utf8.txt', out, 'utf8');
console.log('Done writing utf8 file');
