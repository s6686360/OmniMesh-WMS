const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// ReceiptForm destructuring
code = code.replace(
  "setPrintingReceipt, generateReceiptNumber, setReceiptCounter,",
  "setPrintingReceipt, setPrintingA4Receipt, generateReceiptNumber, setReceiptCounter,"
);

// ReturnNoteForm destructuring
code = code.replace(
  "receipts, manifests, showMessage, generateReturnNo, setReturnCounter, returnCounter, logActivity, uoms",
  "receipts, manifests, showMessage, generateReturnNo, setReturnCounter, returnCounter, logActivity, uoms, setPrintingReturnNote"
);

fs.writeFileSync('src/App.tsx', code);

// CommercialInvoiceForm fix missing Printer icon
let ciCode = fs.readFileSync('src/CommercialInvoiceForm.tsx', 'utf8');
ciCode = ciCode.replace(
  "import { X, Save, Plus, Trash2, FileText, CheckCircle, PackagePlus, List, Ship, MapPin } from 'lucide-react';",
  "import { X, Save, Plus, Trash2, FileText, CheckCircle, PackagePlus, List, Ship, MapPin, Printer } from 'lucide-react';"
);

fs.writeFileSync('src/CommercialInvoiceForm.tsx', ciCode);

console.log('Fixed missing imports');
