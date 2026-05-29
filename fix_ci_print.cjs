const fs = require('fs');

let codeCiPrint = fs.readFileSync('src/PrintCommercialInvoiceOverlay.tsx', 'utf8');

codeCiPrint = codeCiPrint.replace(
  /className="bg-white p-4 rounded-lg shadow-xl mb-8 flex items-center justify-between w-\[210mm\] max-w-full sticky top-4 z-40 no-print"/g,
  'className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4"'
);

fs.writeFileSync('src/PrintCommercialInvoiceOverlay.tsx', codeCiPrint);
