const fs = require('fs');

// Pickups and Returns in App.tsx
let codeApp = fs.readFileSync('src/App.tsx', 'utf8');

// Return Note Button
const returnNoteButton = `<div className="flex justify-end mt-6">
              <button onClick={saveReturn} className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-2.5 rounded-lg shadow-sm hover:bg-orange-600 font-medium transition-colors">
                <Undo2 className="w-5 h-5" /><span>{editReturnId ? 'Update Return Note' : 'Confirm Return Note'}</span>
              </button>
            </div>`;

const newReturnNoteButton = `<div className="flex justify-between items-center mt-6">
              <div>
                {editReturnId && checkAccess('returns', 'print') && (
                  <button onClick={() => setPrintingReturnNote(returns.find(r => r.id === editReturnId))} className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                    <Printer className="w-5 h-5" /><span>Print Return Note</span>
                  </button>
                )}
              </div>
              <button onClick={saveReturn} className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-2.5 rounded-lg shadow-sm hover:bg-orange-600 font-medium transition-colors">
                <Undo2 className="w-5 h-5" /><span>{editReturnId ? 'Update Return Note' : 'Confirm Return Note'}</span>
              </button>
            </div>`;

codeApp = codeApp.replace(returnNoteButton, newReturnNoteButton);

// Pickup Request Button
const pickupRequestButton = `<div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-slate-200">
        <button onClick={savePickup} className="flex items-center space-x-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg">
          <Save className="w-5 h-5"/> <span>Save Pickup Request</span>
        </button>
      </div>`;

const newPickupRequestButton = `<div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
        <div>
          {editPickupId && checkAccess('pickups', 'print') && (
            <button onClick={() => setPrintingPickupNote(pickups.find(p => p.id === editPickupId))} className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
              <Printer className="w-5 h-5" /><span>Print Pickup Note</span>
            </button>
          )}
        </div>
        <button onClick={savePickup} className="flex items-center space-x-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg">
          <Save className="w-5 h-5"/> <span>{editPickupId ? 'Update Pickup Request' : 'Save Pickup Request'}</span>
        </button>
      </div>`;

codeApp = codeApp.replace(pickupRequestButton, newPickupRequestButton);

fs.writeFileSync('src/App.tsx', codeApp);


// Commercial Invoice Button
let codeCi = fs.readFileSync('src/CommercialInvoiceForm.tsx', 'utf8');

codeCi = codeCi.replace(
  "db, doc, setDoc, handleFirestoreError, OperationType, formatDate",
  "db, doc, setDoc, handleFirestoreError, OperationType, formatDate, setPrintingCommercialInvoice"
);

const ciButton = `<div className="flex justify-end pt-4 pb-12">
        <button onClick={saveInvoice} className="px-8 py-3 bg-blue-600 text-white rounded-xl shadow-lg border-b-4 border-blue-700 hover:bg-blue-500 font-bold text-lg flex items-center transition-all active:mt-1 active:border-b-0">
          <Save className="w-5 h-5 mr-2"/> {formData.id ? 'Update' : 'Save'} Invoice
        </button>
      </div>`;

const newCiButton = `<div className="flex justify-between items-center pt-4 pb-12">
        <div>
          {editCommercialInvoiceId && checkAccess('commercial_invoices', 'print') && (
            <button onClick={() => setPrintingCommercialInvoice(commercialInvoices.find(c => c.id === editCommercialInvoiceId))} className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 px-4 py-3 rounded-xl font-medium shadow-sm transition-colors">
              <Printer className="w-5 h-5" /><span>Print CI/PL</span>
            </button>
          )}
        </div>
        <button onClick={saveInvoice} className="px-8 py-3 bg-blue-600 text-white rounded-xl shadow-lg border-b-4 border-blue-700 hover:bg-blue-500 font-bold text-lg flex items-center transition-all active:mt-1 active:border-b-0">
          <Save className="w-5 h-5 mr-2"/> {formData.id ? 'Update' : 'Save'} Invoice
        </button>
      </div>`;

codeCi = codeCi.replace(ciButton, newCiButton);

fs.writeFileSync('src/CommercialInvoiceForm.tsx', codeCi);

console.log('Rest of print buttons fixed');
