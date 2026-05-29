import React from 'react';
import { X, Printer } from 'lucide-react';

export const PrintCommercialInvoiceOverlay = ({ AppContext }) => {
  const { 
    printingCommercialInvoice, setPrintingCommercialInvoice, handlePrintRequest, 
    companies, formatAddress,
    formatPrintDate
} = React.useContext(AppContext);

  if (!printingCommercialInvoice) return null;

  const ci = printingCommercialInvoice;
  const declCompany = (companies || []).find(c => c.id === ci.declCompanyId) || { name: 'Unknown Company' };

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      <style>{`
        @media print { 
          html, body, #root { height: auto !important; overflow: visible !important; background: white !important; }
          body * { visibility: hidden; } 
          .no-print { display: none !important; } 
          .print-safe-modal { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; height: auto !important; overflow: visible !important; background: transparent !important; padding: 0 !important; } 
          #a4-print-area, #a4-print-area * { visibility: visible; } 
          #a4-print-area { position: absolute; left: 0; top: 0; width: 100%; display: block; margin: 0; padding: 0; } 
          .a4-page { width: 100% !important; height: auto !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; background: white; page-break-after: always; box-sizing: border-box; } 
          @page { size: A4 portrait; margin: 15mm; } 
        }
      `}</style>
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div>
           <h3 className="font-bold text-lg text-slate-800">Print Commercial Invoice / Packing List</h3>
           <p className="text-slate-500 text-sm">Review document before printing.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setPrintingCommercialInvoice(null)} className="px-4 py-2 border rounded font-medium text-slate-600 hover:bg-slate-50">Close</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-emerald-600 text-white rounded font-medium shadow-sm hover:bg-emerald-700 flex items-center">
            <Printer className="w-4 h-4 mr-2" /> Print CI/PL
          </button>
        </div>
      </div>

      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col w-[210mm] min-h-[297mm] p-[15mm] box-border mb-8">
          
          {/* Header */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b-2 border-slate-800">
             <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider">{declCompany.name}</h1>
                <div className="text-xs text-slate-600 mt-2 space-y-0.5 whitespace-pre-wrap">
                  {formatAddress({ 
                    line1: declCompany.companyAddress, 
                    line2: `${declCompany.companyPostalCode || ''} ${declCompany.companyCity || ''}`,
                    line3: `${declCompany.companyState || ''} ${declCompany.companyCountry || ''}`
                  })}
                  {declCompany.companyContactNumber && <div>Tel: {declCompany.companyContactNumber}</div>}
                  {declCompany.roc && <div>ROC/Registration: {declCompany.roc || declCompany.registrationNo}</div>}
                </div>
             </div>
             <div className="text-right">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-widest mb-2">Invoice</h2>
                <div className="text-sm space-y-1">
                   <div><span className="font-semibold text-slate-600">Invoice No:</span> <span className="font-bold">{ci.id}</span></div>
                   <div><span className="font-semibold text-slate-600">Date:</span> <span className="font-bold">{ci.invoiceDate}</span></div>
                   {ci.poNumber && <div><span className="font-semibold text-slate-600">PO No:</span> <span className="font-bold">{ci.poNumber}</span></div>}
                </div>
             </div>
          </div>

          <div className="text-center font-bold text-lg mb-6 tracking-widest uppercase">Commercial Invoice / Packing List</div>

          {/* Parties & Routing */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
            <div className="p-3 border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Shipper / Exporter</div>
              <div className="font-bold text-sm">{declCompany.name}</div>
              <div className="text-xs text-slate-600 whitespace-pre-wrap mt-1">
                {formatAddress({ 
                  line1: declCompany.companyAddress, 
                  line2: `${declCompany.companyPostalCode || ''} ${declCompany.companyCity || ''} ${declCompany.companyState || ''}`,
                  line3: declCompany.companyCountry || ''
                })}
              </div>
            </div>
            <div className="p-3 border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">For Account & Risk Of (Consignee)</div>
              {/* Typically extracted from Receipt if we had a consignee object, but we'll leave placeholder or use text */}
              <div className="font-bold text-sm">To Order</div>
            </div>
          </div>

          <div className="grid grid-cols-4 border border-slate-800 mb-8 divide-x divide-slate-800 text-sm">
             <div className="p-2 flex flex-col">
               <span className="text-[10px] font-bold text-slate-500 uppercase">Vessel / Voyage</span>
               <span className="font-semibold mt-1">{ci.vessel || '-'} {ci.voyage || ''}</span>
             </div>
             <div className="p-2 flex flex-col">
               <span className="text-[10px] font-bold text-slate-500 uppercase">Port of Loading</span>
               <span className="font-semibold mt-1">{ci.pol || '-'}</span>
             </div>
             <div className="p-2 flex flex-col">
               <span className="text-[10px] font-bold text-slate-500 uppercase">Port of Discharge</span>
               <span className="font-semibold mt-1">{ci.pod || '-'}</span>
             </div>
             <div className="p-2 flex flex-col">
               <span className="text-[10px] font-bold text-slate-500 uppercase">Incoterms</span>
               <span className="font-semibold mt-1">{ci.incoterm || '-'}</span>
             </div>
          </div>

          {/* Body */}
          <table className="w-full text-left border border-slate-800 text-sm mb-6">
            <thead className="bg-slate-100 border-b border-slate-800">
              <tr>
                <th className="p-2 font-bold border-r border-slate-800 w-12 text-center">No.</th>
                <th className="p-2 font-bold border-r border-slate-800">Description of Goods</th>
                <th className="p-2 font-bold border-r border-slate-800 text-center w-24">HS Code</th>
                <th className="p-2 font-bold border-r border-slate-800 text-right w-24">Quantity</th>
                <th className="p-2 font-bold border-r border-slate-800 text-right w-24">CBM</th>
                <th className="p-2 font-bold text-right w-32">Total Val ({ci.currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-400">
              {(ci.lines || []).map((line, idx) => {
                 return (
                   <tr key={idx}>
                     <td className="p-2 border-r border-slate-800 text-center">{idx + 1}</td>
                     <td className="p-2 border-r border-slate-800 whitespace-pre-wrap">{line.product}</td>
                     <td className="p-2 border-r border-slate-800 text-center font-mono text-xs">{line.hsCode || '-'}</td>
                     <td className="p-2 border-r border-slate-800 text-right">{line.qty} <span className="text-xs text-slate-500">{line.uom}</span></td>
                     <td className="p-2 border-r border-slate-800 text-right">{(parseFloat(line.cbm) || 0).toFixed(3)}</td>
                     <td className="p-2 text-right">{(parseFloat(line.totalValue) || 0).toFixed(2)}</td>
                   </tr>
                 );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-800">
                <td colSpan="3" className="p-2 border-r border-slate-800 text-right font-bold uppercase text-xs">Total:</td>
                <td className="p-2 border-r border-slate-800 text-right font-bold">
                   {(ci.lines || []).reduce((sum, line) => sum + (parseFloat(line.qty) || 0), 0)}
                </td>
                <td className="p-2 border-r border-slate-800 text-right font-bold">
                   {(ci.lines || []).reduce((sum, line) => sum + (parseFloat(line.cbm) || 0), 0).toFixed(3)}
                </td>
                <td className="p-2 text-right font-bold text-base bg-slate-100">
                   {ci.currency} {(ci.totalValue || 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="grid grid-cols-2 gap-8 mt-16 text-sm">
             <div>
                <p className="mb-12 font-bold">For and on behalf of:<br/>{declCompany.name}</p>
                <div className="border-t border-slate-800 pt-2 font-medium">Authorized Signature</div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
