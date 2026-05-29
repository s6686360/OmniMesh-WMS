const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// ReceiptForm destructuring
code = code.replace(
  "showMessage, generateShipmentId, receiptCountersMap, setReceiptCountersMap, setPrintingReceipt,",
  "showMessage, generateShipmentId, receiptCountersMap, setReceiptCountersMap, setPrintingReceipt, setPrintingA4Receipt,"
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed A4 again');
