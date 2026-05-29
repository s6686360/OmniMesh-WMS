const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldReceiptButton = `<button onClick={() => setPrintingReceipt(receipts.find(r => r.id === editReceiptId))} className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
              <Printer className="w-5 h-5" /><span>Print Labels</span>
            </button>`;

const newReceiptButton = `<div className="flex space-x-2">
              <button onClick={() => setPrintingA4Receipt(receipts.find(r => r.id === editReceiptId))} className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                <FileDown className="w-5 h-5" /><span>Print GRN</span>
              </button>
              <button onClick={() => setPrintingReceipt(receipts.find(r => r.id === editReceiptId))} className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                <Printer className="w-5 h-5" /><span>Print Labels</span>
              </button>
            </div>`;

code = code.replace(oldReceiptButton, newReceiptButton);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed A4 GRN print button');
