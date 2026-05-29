const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/'a4'/g, "'letter'");
fs.writeFileSync('src/App.tsx', code, 'utf8');

let code2 = fs.readFileSync('src/PrintCommercialInvoiceOverlay.tsx', 'utf8');
code2 = code2.replace(/'a4'/g, "'letter'");
fs.writeFileSync('src/PrintCommercialInvoiceOverlay.tsx', code2, 'utf8');
