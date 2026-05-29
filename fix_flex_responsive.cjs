const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard flex form tails
code = code.replace(
  /className="flex items-center justify-between mt-4"/g,
  'className="flex flex-col sm:flex-row items-center sm:justify-between w-full mt-4 gap-4"'
);

code = code.replace(
  /className="flex justify-between items-center mt-6"/g,
  'className="flex flex-col sm:flex-row items-center sm:justify-between w-full mt-6 gap-4"'
);

code = code.replace(
  /className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200"/g,
  'className="flex flex-col sm:flex-row items-center sm:justify-between w-full pt-6 mt-6 border-t border-slate-200 gap-4"'
);

code = code.replace(
  /className="flex items-center justify-between"/g,
  'className="flex flex-col sm:flex-row items-center sm:justify-between w-full gap-4"'
);

code = code.replace(
  /className="flex justify-between items-center pt-4"/g,
  'className="flex flex-col sm:flex-row items-center sm:justify-between w-full pt-4 gap-4"'
);

// Overlays action bar
code = code.replace(
  /className="bg-white p-4 rounded-lg shadow-xl mb-8 flex items-center justify-between w-\[210mm\] max-w-full sticky top-4 z-40 no-print"/g,
  'className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4"'
);

fs.writeFileSync('src/App.tsx', code);

let codeCi = fs.readFileSync('src/CommercialInvoiceForm.tsx', 'utf8');
codeCi = codeCi.replace(
    /className="flex justify-between items-center pt-4 pb-12"/g,
    'className="flex flex-col sm:flex-row items-center sm:justify-between w-full pt-4 pb-12 gap-4"'
);
fs.writeFileSync('src/CommercialInvoiceForm.tsx', codeCi);

console.log('Flex responsive layout applied');
