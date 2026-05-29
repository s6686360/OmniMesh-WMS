const fs = require('fs');
let files = ['src/App.tsx', 'src/PrintCommercialInvoiceOverlay.tsx'];
for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/overflow-y-auto pt-10/g, 'overflow-auto pt-10 px-4 sm:px-0');
    fs.writeFileSync(file, code, 'utf8');
}
