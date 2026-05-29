const fs = require('fs');

const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

// Helper to assert replacements
function replaceOrError(oldStr, newStr, name) {
  if (!code.includes(oldStr)) {
    throw new Error(`Could not find old text for: ${name}`);
  }
  code = code.replace(oldStr, newStr);
  console.log(`Successfully replaced: ${name}`);
}

// ----------------------------------------------------
// 1. PrintA4Overlay (Goods Received Note / GRN)
// ----------------------------------------------------
const oldPrintA4 = `const PrintA4Overlay = () => {
  const { printingA4Receipt, setPrintingA4Receipt, handlePrintRequest, handleGeneratePDF, currentUser } = React.useContext(AppContext);

  if (!printingA4Receipt) return null;
  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Goods Received Note</h3></div>
        <div className="flex items-center space-x-3">
           <button onClick={() => setPrintingA4Receipt(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
           <button onClick={() => handleGeneratePDF('a4-print-area', \`\${printingA4Receipt.id}-GRN.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
           <button onClick={handlePrintRequest} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">Print</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
          <LetterheadHeader 
            docType="GRN" 
            title={printingA4Receipt.company} 
            subtitle="Goods Received Note" 
            rightNode={<><p className="text-sm uppercase font-semibold">GRN ID</p><p className="text-2xl font-bold font-mono">{printingA4Receipt.id}</p></>} 
          />
          <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
            <div>
              <p className="text-xs uppercase font-bold border-b pb-1 mb-2">Customer Info</p><p className="font-bold text-lg">{printingA4Receipt.customer}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                 <div><p className="text-xs uppercase font-bold">Consignor</p><p className="font-semibold">{printingA4Receipt.consignor || 'N/A'}</p></div>
                 <div><p className="text-xs uppercase font-bold">Consignee</p><p className="font-semibold">{printingA4Receipt.consignee || 'N/A'}</p></div>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase font-bold border-b pb-1 mb-2">Details</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Generated Date:</span> <span className="font-semibold">{new Date().toLocaleDateString('en-GB')}</span></div>
                <div className="flex justify-between"><span>Type:</span> <span className="font-semibold">{printingA4Receipt.transactionType}</span></div>
                <div className="flex justify-between"><span>Routing:</span> <span className="font-semibold">{printingA4Receipt.pol || '-'} to {printingA4Receipt.pod || '-'}</span></div>
                <div className="flex justify-between"><span>MBL/Booking No:</span> <span className="font-semibold">{printingA4Receipt.blNo || '-'} / {printingA4Receipt.bookingNo || '-'}</span></div>
                <div className="flex justify-between"><span>Shipper DO Ref:</span> <span className="font-semibold">{printingA4Receipt.shipperDoNo || '-'}</span></div>
              </div>
            </div>
          </div>
          {printingA4Receipt.grnRemarks && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200">
              <p className="text-xs uppercase font-bold mb-1">Remarks</p>
              <p className="text-sm whitespace-pre-wrap">{printingA4Receipt.grnRemarks}</p>
            </div>
          )}
          <div className="mb-8">
            <table className="w-full text-left text-sm border-collapse">
              <thead><tr className="bg-slate-100"><th className="p-2 border">Description</th><th className="p-2 border text-center">Qty</th><th className="p-2 border text-right">Unit Wgt(kg)</th><th className="p-2 border text-right">Total Wgt(kg)</th><th className="p-2 border text-right">CBM</th></tr></thead>
              <tbody>
                {(printingA4Receipt.lines || []).map((line, idx) => (
                  <tr key={idx}><td className="p-2 border">{line.product}</td><td className="p-2 border text-center">{line.qty} {line.uom}</td><td className="p-2 border text-right">{line.weight}</td><td className="p-2 border text-right">{((parseFloat(line.weight) || 0) * (parseInt(line.qty) || 0)).toFixed(2)}</td><td className="p-2 border text-right">{(line.cbm || 0).toFixed(3)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-12 text-sm">
            <p className="text-xs text-slate-500 text-center mb-12 italic">
              This is a computer-generated document, no signature is required. <br />
              Generated by {currentUser?.username || 'System'}
            </p>

            <div className="flex justify-between border-t border-slate-300 pt-8 mt-4 px-8 items-end">
               <div className="w-1/2">
                 <p className="font-bold underline mb-4">Acknowledgement</p>
                 <p className="mb-2 font-mono">NAME: ________________________________</p>
                 <p className="mb-2 font-mono">NRIC: ________________________________</p>
                 <p className="mb-2 font-mono">DATE: ________________________________</p>
               </div>
               <div className="w-1/2 flex justify-end">
                  <div className="border-4 border-red-600 p-3 text-center bg-white w-56 -rotate-3 opacity-80">
                    <p className="text-red-600 font-black text-sm uppercase leading-tight">Quantity Check without Content Inspection</p>
                    <div className="mt-2 text-red-600 font-bold border-t border-red-600 pt-1 text-[10px]">{printingA4Receipt.company} Digital Validation</div>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};`;

const newPrintA4 = `const PrintA4Overlay = () => {
  const { printingA4Receipt, setPrintingA4Receipt, handlePrintRequest, handleGeneratePDF, currentUser } = React.useContext(AppContext);

  if (!printingA4Receipt) return null;
  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Goods Received Note</h3></div>
        <div className="flex items-center space-x-3">
           <button onClick={() => setPrintingA4Receipt(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
           <button onClick={() => handleGeneratePDF('a4-print-area', \`\${printingA4Receipt.id}-GRN.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
           <button onClick={handlePrintRequest} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">Print</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
          
          <table className="print-layout-table w-full border-none border-collapse text-left text-sm">
            <thead className="display-table-header-group">
              <tr>
                <td className="border-none p-0">
                  <LetterheadHeader 
                    docType="GRN" 
                    title={printingA4Receipt.company} 
                    subtitle="Goods Received Note" 
                    rightNode={<><p className="text-sm uppercase font-semibold">GRN ID</p><p className="text-2xl font-bold font-mono">{printingA4Receipt.id}</p></>} 
                  />
                  <div className="grid grid-cols-2 gap-8 mb-4 text-sm mt-4">
                    <div>
                      <p className="text-xs uppercase font-bold border-b pb-1 mb-2">Customer Info</p><p className="font-bold text-lg">{printingA4Receipt.customer}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                         <div><p className="text-xs uppercase font-bold">Consignor</p><p className="font-semibold">{printingA4Receipt.consignor || 'N/A'}</p></div>
                         <div><p className="text-xs uppercase font-bold">Consignee</p><p className="font-semibold">{printingA4Receipt.consignee || 'N/A'}</p></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase font-bold border-b pb-1 mb-2">Details</p>
                      <div className="space-y-2">
                        <div className="flex justify-between"><span>Generated Date:</span> <span className="font-semibold">{new Date().toLocaleDateString('en-GB')}</span></div>
                        <div className="flex justify-between"><span>Type:</span> <span className="font-semibold">{printingA4Receipt.transactionType}</span></div>
                        <div className="flex justify-between"><span>Routing:</span> <span className="font-semibold">{printingA4Receipt.pol || '-'} to {printingA4Receipt.pod || '-'}</span></div>
                        <div className="flex justify-between"><span>MBL/Booking No:</span> <span className="font-semibold">{printingA4Receipt.blNo || '-'} / {printingA4Receipt.bookingNo || '-'}</span></div>
                        <div className="flex justify-between"><span>Shipper DO Ref:</span> <span className="font-semibold">{printingA4Receipt.shipperDoNo || '-'}</span></div>
                      </div>
                    </div>
                  </div>
                  {printingA4Receipt.grnRemarks && (
                    <div className="mb-4 p-4 bg-slate-50 border border-slate-200">
                      <p className="text-xs uppercase font-bold mb-1">Remarks</p>
                      <p className="text-sm whitespace-pre-wrap">{printingA4Receipt.grnRemarks}</p>
                    </div>
                  )}
                  <div className="h-4"></div>
                </td>
              </tr>
            </thead>
            <tbody className="display-table-row-group">
              <tr>
                <td className="border-none p-0 align-top text-left">
                  <div className="mb-8">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead><tr className="bg-slate-100"><th className="p-2 border">Description</th><th className="p-2 border text-center">Qty</th><th className="p-2 border text-right">Unit Wgt(kg)</th><th className="p-2 border text-right">Total Wgt(kg)</th><th className="p-2 border text-right">CBM</th></tr></thead>
                      <tbody>
                        {(printingA4Receipt.lines || []).map((line, idx) => (
                          <tr key={idx}><td className="p-2 border">{line.product}</td><td className="p-2 border text-center">{line.qty} {line.uom}</td><td className="p-2 border text-right">{line.weight}</td><td className="p-2 border text-right">{((parseFloat(line.weight) || 0) * (parseInt(line.qty) || 0)).toFixed(2)}</td><td className="p-2 border text-right">{(line.cbm || 0).toFixed(3)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot className="display-table-footer-group">
              <tr>
                <td className="border-none p-0 pt-8">
                  <div className="text-sm">
                    <p className="text-xs text-slate-500 text-center mb-12 italic">
                      This is a computer-generated document, no signature is required. <br />
                      Generated by {currentUser?.username || 'System'}
                    </p>

                    <div className="flex justify-between border-t border-slate-300 pt-8 mt-4 px-8 items-end print-avoid-break">
                       <div className="w-1/2">
                         <p className="font-bold underline mb-4">Acknowledgement</p>
                         <p className="mb-2 font-mono">NAME: ________________________________</p>
                         <p className="mb-2 font-mono">NRIC: ________________________________</p>
                         <p className="mb-2 font-mono">DATE: ________________________________</p>
                       </div>
                       <div className="w-1/2 flex justify-end">
                          <div className="border-4 border-red-600 p-3 text-center bg-white w-56 -rotate-3 opacity-80">
                            <p className="text-red-600 font-black text-sm uppercase leading-tight">Quantity Check without Content Inspection</p>
                            <div className="mt-2 text-red-600 font-bold border-t border-red-600 pt-1 text-[10px]">{printingA4Receipt.company} Digital Validation</div>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100 uppercase tracking-widest font-mono">
                      <div>GRN No: {printingA4Receipt.id}</div>
                      <div className="print-page-number"></div>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

        </div>
      </div>
    </div>
  );
};`;

replaceOrError(oldPrintA4, newPrintA4, 'PrintA4Overlay');

// ----------------------------------------------------
// 2. PrintPackingListOverlay
// ----------------------------------------------------
const oldPrintPackingList = `const PrintPackingListOverlay = () => {
  const { printingPackingList, setPrintingPackingList, handlePrintRequest, handleGeneratePDF, companies, pickups, receipts } = React.useContext(AppContext);

  if (!printingPackingList) return null;
  const m = printingPackingList;

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Packing List</h3></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setPrintingPackingList(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', \`\${m.id}-PL.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Print</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
          <LetterheadHeader 
            docType="PackingList" 
            subtitle="Container Packing List"
            rightNode={<><p className="text-sm uppercase font-semibold">Manifest No</p><p className="text-xl font-bold font-mono">{m.id}</p></>}
          />
          
          <div className="grid grid-cols-2 gap-4 mb-6 border border-slate-200 p-4 font-mono text-sm">
            <div>
              <p><strong>MANIFEST NO:</strong> {m.id}</p>
              <p><strong>TYPE:</strong> <span className={\`px-2 rounded-sm border \${m.type === 'FCL' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-teal-50 border-teal-200 text-teal-700'}\`}>{m.type || 'LCL'}</span></p>
              <p><strong>DATE:</strong> {formatDate(m.date)}</p>
              <p><strong>ROUTE:</strong> {m.pol} to {m.pod}</p>
            </div>
            <div>
              <p><strong>CONTAINER NO:</strong> {m.containerNo || 'TBA'}</p>
              <p><strong>SEAL NO:</strong> {m.sealNo || 'TBA'}</p>
              {m.type === 'FCL' && m.fclCustomer && <p><strong>CUSTOMER:</strong> {m.fclCustomer}</p>}
              <p><strong>LINER BOOKING NO:</strong> {m.bookingNo || 'TBA'}</p>
              <p><strong>MASTER BL NO:</strong> {m.blNo || 'TBA'}</p>
              <p><strong>JOB NO:</strong> {m.jobNo || 'TBA'}</p>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-y-2 border-black">
                {m.type === 'FCL' ? (
                  <>
                    <th className="p-2">Client Details</th>
                    <th className="p-2">HS Code</th>
                    <th className="p-2">Product Description</th>
                    <th className="p-2 text-center">Qty / UOM</th>
                    <th className="p-2 text-right">WGT (kg)</th>
                  </>
                ) : (
                  <>
                    <th className="p-2">Client Details</th>
                    <th className="p-2">Pick Up</th>
                    <th className="p-2">Group J</th>
                    <th className="p-2">Product Description</th>
                    <th className="p-2 text-center">Qty / UOM</th>
                    <th className="p-2 text-right">CBM</th>
                    <th className="p-2 text-right">WGT (kg)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {m.type === 'FCL' ? (
                (m.fclProducts || []).map((p, i) => (
                  <tr key={i}>
                    <td className="p-2 font-semibold text-slate-800">
                      Cust: {m.fclCustomer || '-'}<br/>Cne: {m.consignee || '-'}<br/>Cnr: {m.consignor || '-'}<br/>
                    </td>
                    <td className="p-2 font-mono text-slate-600">{p.hsCode}</td>
                    <td className="p-2">{p.description}</td>
                    <td className="p-2 text-center">{p.qty} {p.uom}</td>
                    <td className="p-2 text-right">{parseFloat(p.weight || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                (m.lines || []).map((l, i) => {
                  const receipt = (receipts || []).find(r => r.id === l.receiptId);
                  const isPickedUp = (pickups || []).some(p => p.linkedSid === l.receiptId) ? 'Yes' : '';
                  const isGroupJ = (companies || []).find(c => c.name === l.customer)?.groupJSSTExempted;
                  return (
                  <tr key={i}>
                    <td className="p-2 font-semibold text-slate-800">
                       Cust: {l.customer || '-'}<br/>Cne: {receipt?.consignee || '-'}<br/>Cnr: {receipt?.consignor || '-'}<br/>
                       <span className="font-mono font-normal text-[10px] text-slate-500 mt-1 block">Ref: {l.receiptId}</span>
                    </td>
                    <td className="p-2 font-bold text-slate-700">{isPickedUp}</td>
                    <td className="p-2 font-bold text-purple-700">{isGroupJ ? 'Yes' : ''}</td>
                    <td className="p-2">{l.product}</td><td className="p-2 text-center">{l.loadQty} {l.uom}</td><td className="p-2 text-right">{(l.loadQty * (l.unitCbm || 0)).toFixed(3)}</td><td className="p-2 text-right">{(l.loadQty * (l.unitWeight || 0)).toFixed(2)}</td>
                  </tr>
                )})
              )}
            </tbody>
            <tfoot className="border-t-2 border-black font-bold text-sm bg-slate-50">
              {m.type === 'FCL' ? (
                <tr>
                  <td colSpan={3} className="p-3 text-right">TOTAL CARGO LOADED:</td>
                  <td className="p-3 text-center">{(m.fclProducts || []).reduce((s,p)=>s+(parseFloat(p.qty)||0),0)}</td>
                  <td className="p-3 text-right">{(m.fclProducts || []).reduce((s,p)=>s+(parseFloat(p.weight)||0),0).toFixed(2)}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} className="p-3 text-right">TOTAL CARGO LOADED:</td>
                  <td className="p-3 text-center">{(m.lines || []).reduce((s,l)=>s+(l.loadQty||0),0)}</td>
                  <td className="p-3 text-right">{(m.totalCBM || 0).toFixed(3)}</td>
                  <td className="p-3 text-right">{(m.totalWeight || 0).toFixed(2)}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};`;

const newPrintPackingList = `const PrintPackingListOverlay = () => {
  const { printingPackingList, setPrintingPackingList, handlePrintRequest, handleGeneratePDF, companies, pickups, receipts } = React.useContext(AppContext);

  if (!printingPackingList) return null;
  const m = printingPackingList;

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Packing List</h3></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setPrintingPackingList(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', \`\${m.id}-PL.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Print</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
          
          <table className="print-layout-table w-full border-none border-collapse text-left text-sm">
            <thead className="display-table-header-group">
              <tr>
                <td className="border-none p-0">
                  <LetterheadHeader 
                    docType="PackingList" 
                    subtitle="Container Packing List"
                    rightNode={<><p className="text-sm uppercase font-semibold">Manifest No</p><p className="text-xl font-bold font-mono">{m.id}</p></>}
                  />
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 border border-slate-200 p-4 font-mono text-xs bg-slate-50 mt-4">
                    <div>
                      <p><strong>MANIFEST NO:</strong> {m.id}</p>
                      <p><strong>TYPE:</strong> <span className={\`px-2 rounded-sm border \${m.type === 'FCL' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-teal-50 border-teal-200 text-teal-700'}\`}>{m.type || 'LCL'}</span></p>
                      <p><strong>DATE:</strong> {formatDate(m.date)}</p>
                      <p><strong>ROUTE:</strong> {m.pol} to {m.pod}</p>
                    </div>
                    <div>
                      <p><strong>CONTAINER NO:</strong> {m.containerNo || 'TBA'}</p>
                      <p><strong>SEAL NO:</strong> {m.sealNo || 'TBA'}</p>
                      {m.type === 'FCL' && m.fclCustomer && <p><strong>CUSTOMER:</strong> {m.fclCustomer}</p>}
                      <p><strong>LINER BOOKING NO:</strong> {m.bookingNo || 'TBA'}</p>
                      <p><strong>MASTER BL NO:</strong> {m.blNo || 'TBA'}</p>
                      <p><strong>JOB NO:</strong> {m.jobNo || 'TBA'}</p>
                    </div>
                  </div>
                  <div className="h-2"></div>
                </td>
              </tr>
            </thead>
            <tbody className="display-table-row-group">
              <tr>
                <td className="border-none p-0 align-top">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-y-2 border-black">
                        {m.type === 'FCL' ? (
                          <>
                            <th className="p-2">Client Details</th>
                            <th className="p-2">HS Code</th>
                            <th className="p-2">Product Description</th>
                            <th className="p-2 text-center">Qty / UOM</th>
                            <th className="p-2 text-right">WGT (kg)</th>
                          </>
                        ) : (
                          <>
                            <th className="p-2">Client Details</th>
                            <th className="p-2">Pick Up</th>
                            <th className="p-2">Group J</th>
                            <th className="p-2">Product Description</th>
                            <th className="p-2 text-center">Qty / UOM</th>
                            <th className="p-2 text-right">CBM</th>
                            <th className="p-2 text-right">WGT (kg)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {m.type === 'FCL' ? (
                        (m.fclProducts || []).map((p, i) => (
                          <tr key={i}>
                            <td className="p-2 font-semibold text-slate-800">
                              Cust: {m.fclCustomer || '-'}<br/>Cne: {m.consignee || '-'}<br/>Cnr: {m.consignor || '-'}<br/>
                            </td>
                            <td className="p-2 font-mono text-slate-600">{p.hsCode}</td>
                            <td className="p-2">{p.description}</td>
                            <td className="p-2 text-center">{p.qty} {p.uom}</td>
                            <td className="p-2 text-right">{parseFloat(p.weight || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        (m.lines || []).map((l, i) => {
                          const receipt = (receipts || []).find(r => r.id === l.receiptId);
                          const isPickedUp = (pickups || []).some(p => p.linkedSid === l.receiptId) ? 'Yes' : '';
                          const isGroupJ = (companies || []).find(c => c.name === l.customer)?.groupJSSTExempted;
                          return (
                          <tr key={i}>
                            <td className="p-2 font-semibold text-slate-800">
                               Cust: {l.customer || '-'}<br/>Cne: {receipt?.consignee || '-'}<br/>Cnr: {receipt?.consignor || '-'}<br/>
                               <span className="font-mono font-normal text-[10px] text-slate-500 mt-1 block">Ref: {l.receiptId}</span>
                            </td>
                            <td className="p-2 font-bold text-slate-700">{isPickedUp}</td>
                            <td className="p-2 font-bold text-purple-700">{isGroupJ ? 'Yes' : ''}</td>
                            <td className="p-2">{l.product}</td><td className="p-2 text-center">{l.loadQty} {l.uom}</td><td className="p-2 text-right">{(l.loadQty * (l.unitCbm || 0)).toFixed(3)}</td><td className="p-2 text-right">{(l.loadQty * (l.unitWeight || 0)).toFixed(2)}</td>
                          </tr>
                        )})
                      )}
                    </tbody>
                    <tfoot className="border-t-2 border-black font-bold text-sm bg-slate-50">
                      {m.type === 'FCL' ? (
                        <tr>
                          <td colSpan={3} className="p-3 text-right">TOTAL CARGO LOADED:</td>
                          <td className="p-3 text-center">{(m.fclProducts || []).reduce((s,p)=>s+(parseFloat(p.qty)||0),0)}</td>
                          <td className="p-3 text-right">{(m.fclProducts || []).reduce((s,p)=>s+(parseFloat(p.weight)||0),0).toFixed(2)}</td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-3 text-right">TOTAL CARGO LOADED:</td>
                          <td className="p-3 text-center">{(m.lines || []).reduce((s,l)=>s+(l.loadQty||0),0)}</td>
                          <td className="p-3 text-right">{(m.totalCBM || 0).toFixed(3)}</td>
                          <td className="p-3 text-right">{(m.totalWeight || 0).toFixed(2)}</td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </td>
              </tr>
            </tbody>
            <tfoot className="display-table-footer-group">
              <tr>
                <td className="border-none p-0 pt-8">
                  <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-100 pt-4 uppercase tracking-widest font-mono">
                    <div>Manifest Ref: {m.id}</div>
                    <div className="print-page-number"></div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

        </div>
      </div>
    </div>
  );
};`;

replaceOrError(oldPrintPackingList, newPrintPackingList, 'PrintPackingListOverlay');


// ----------------------------------------------------
// 3. PrintDeliveryOrdersOverlay
// ----------------------------------------------------
// Let's replace the whole PrintDeliveryOrdersOverlay body to use the flowing non-absolute columns.
const oldPrintDO = `const PrintDeliveryOrdersOverlay = () => {
  const { printingDeliveryOrders, setPrintingDeliveryOrders, handlePrintRequest, handleGeneratePDF, receipts, companies } = React.useContext(AppContext);

  if (!printingDeliveryOrders) return null;
  const m = printingDeliveryOrders;

  const doGroups: Record<string, any> = {};
  if (m.type === 'FCL') {
    const compConsignor = (companies || []).find(c => c.name === m.consignor);
    const compConsignee = (companies || []).find(c => c.name === m.consignee);
    const savedDeliveryAddress = compConsignee?.deliveryAddresses?.[0] ? formatAddress(compConsignee.deliveryAddresses[0]) : '';
    const key = \`FCL_\${m.id}\`;
    let totalQty = 0;
    let totalWgt = 0;
    const mappedLines = (m.fclProducts || []).map(p => {
      const q = parseFloat(p.qty) || 0;
      const wbg = parseFloat(p.weight) || 0;
      totalQty += q;
      totalWgt += wbg;
      return {
        product: p.description,
        loadQty: q,
        uom: p.uom,
        unitCbm: 0,
        unitWeight: wbg,
        hblNo: m.blNo || '-',
        receiptId: 'FCL',
        shipperDoNo: '-'
      };
    });
    
    doGroups[key] = {
      customer: m.fclCustomer,
      consignee: m.consignee,
      address: savedDeliveryAddress,
      consignor: m.consignor,
      lines: mappedLines,
      consignorContact: compConsignor?.contactNumber || '',
      consignorAddress: formatAddress(compConsignor),
      consigneeContact: compConsignee?.contactNumber || '',
      totalQty, totalCBM: 0, totalWgt, shipperDoNos: [], hblNos: [m.blNo || '-'].filter(Boolean)
    };
  } else {
    (m.lines || []).forEach(line => {
      const receipt = (receipts || []).find(r => r.id === line.receiptId);
      if (receipt) {
        const key = \`\${receipt.customer}_\${receipt.consigneeDeliveryAddress || 'DEFAULT'}\`;
        if (!doGroups[key]) {
          const compConsignor = (companies || []).find(c => c.name === receipt.consignor);
          const compConsignee = (companies || []).find(c => c.name === receipt.consignee);
          const savedDeliveryAddress = compConsignee?.deliveryAddresses?.find(da => da.address === receipt.consigneeDeliveryAddress || formatAddress(da) === receipt.consigneeDeliveryAddress) || receipt.consigneeDeliveryAddress;

          doGroups[key] = {
            customer: receipt.customer, 
            consignee: receipt.consignee, 
            address: formatAddress(savedDeliveryAddress), 
            consignor: receipt.consignor, 
            lines: [],
            consignorContact: compConsignor?.contactNumber || '',
            consignorAddress: formatAddress(compConsignor),
            consigneeContact: compConsignee?.contactNumber || '',
            totalQty: 0, totalCBM: 0, totalWgt: 0, shipperDoNos: [], hblNos: []
          };
        }
        doGroups[key].lines.push({ ...line, shipperDoNo: receipt.shipperDoNo });
        doGroups[key].totalQty += parseInt(line.loadQty || 0);
        doGroups[key].totalCBM += (parseInt(line.loadQty || 0) * parseFloat(line.unitCbm || 0));
        doGroups[key].totalWgt += (parseInt(line.loadQty || 0) * parseFloat(line.unitWeight || 0));
        
        const lineHbl = line.hblNo || m.blNo;
        if (lineHbl && !doGroups[key].hblNos.includes(lineHbl)) {
          doGroups[key].hblNos.push(lineHbl);
        }
        if (receipt.shipperDoNo && !doGroups[key].shipperDoNos.includes(receipt.shipperDoNo)) {
          doGroups[key].shipperDoNos.push(receipt.shipperDoNo);
        }
      }
    });
  }
  const groups = Object.values(doGroups);

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Delivery Orders</h3><p className="text-sm text-slate-500">Generated {groups.length} distinct D/O pages based on destinations.</p></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setPrintingDeliveryOrders(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', \`\${m.id}-DO.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors">Print All D/Os</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20 space-y-8">
        {groups.map((group, gIdx) => {
          const manifestNoWithoutMNF = m.id.replace(/^MNF-?/, '');
          const doNumber = \`DO-\${manifestNoWithoutMNF}/\${String(gIdx+1).padStart(3, '0')}\`;

          return (
            <div key={gIdx} className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
              <LetterheadHeader 
                docType="DeliveryOrders" 
                subtitle="DELIVERY ORDER"
              />
              
              <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
                <div className="border p-3 border-slate-300 rounded">
                  <p className="text-xs uppercase font-bold text-slate-500 mb-2">Deliver To (Consignee):</p>
                  <p className="font-bold text-lg uppercase">{group.consignee || group.customer}</p>
                  <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-tight">{group.address}</p>
                  <p className="text-slate-600 mt-2"><span className="font-semibold">Tel:</span> {group.consigneeContact || '-'}</p>
                </div>
                <div className="border p-3 border-slate-300 rounded flex flex-col justify-between">
                  <div>
                    <p className="text-xs uppercase font-bold text-slate-500 mb-2">Sender (Consignor):</p>
                    <p className="font-bold text-lg uppercase">{group.consignor}</p>
                    <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-tight">{group.consignorAddress}</p>
                    <p className="text-slate-600 mt-2"><span className="font-semibold">Tel:</span> {group.consignorContact || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col font-mono text-xs border border-slate-300 rounded bg-slate-50 mb-6 divide-y divide-slate-300">
                <div className="grid grid-cols-[1fr_2fr_2fr] divide-x divide-slate-300">
                  <div className="p-3"><span className="text-slate-500 block mb-1">DATE:</span> <strong className="text-sm">{formatDate(new Date())}</strong></div>
                  <div className="p-3"><span className="text-slate-500 block mb-1">MANIFEST NUMBER:</span> <strong className="text-sm">{m.id}</strong></div>
                  <div className="p-3"><span className="text-slate-500 block mb-1">DO NUMBER:</span> <strong className="text-sm">{doNumber}</strong></div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-300">
                  <div className="p-3"><span className="text-slate-500 block mb-1">CONTAINER NUMBER:</span> <strong className="text-sm">{m.containerNo || '-'}</strong></div>
                  <div className="p-3"><span className="text-slate-500 block mb-1">MASTER BL NUMBER:</span> <strong className="text-sm break-all">{m.blNo || '-'}</strong></div>
                </div>
              </div>

              <table className="w-full text-left text-sm border-collapse mb-10">
                <thead><tr className="bg-slate-100 border-y-2 border-black"><th className="p-2">Item Description</th><th className="p-2 text-center">Qty / UOM</th><th className="p-2 text-right">CBM</th><th className="p-2 text-right">WGT</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {group.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="p-2">
                        {l.product} 
                        <span className="text-[10px] text-slate-500 block mt-0.5">HBL: {l.hblNo || '-'}</span>
                        <span className="text-[10px] text-slate-500 block">Ref: {l.receiptId} | {l.shipperDoNo || '-'}</span>
                      </td>
                      <td className="p-2 text-center font-bold">{l.loadQty} {l.uom}</td>
                      <td className="p-2 text-right font-mono">{((l.loadQty || 0) * (l.unitCbm || 0)).toFixed(3)}</td>
                      <td className="p-2 text-right font-mono">{((l.loadQty || 0) * (l.unitWeight || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-y-2 border-black font-bold bg-slate-50">
                  <tr><td className="p-3 text-right">TOTAL DELIVERY:</td><td className="p-3 text-center text-lg">{group.totalQty}</td><td className="p-3 text-right">{(group.totalCBM || 0).toFixed(3)}</td><td className="p-3 text-right">{(group.totalWgt || 0).toFixed(2)}</td></tr>
                </tfoot>
              </table>

              <div className="grid grid-cols-2 gap-12 mt-auto pt-10 text-sm absolute bottom-10 left-10 right-10">
                <div className="pt-2">
                  <p className="font-bold text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">Driver / Transporter</p>
                  <div className="space-y-4">
                    <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Transporter:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                    <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Driver Name:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                    <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">NRIC:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="font-bold text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">Consignee Received Acknowledgement</p>
                  <div className="space-y-4">
                    <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Company Stamp:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                    <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Receiver Name:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                    <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Date:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};`;

const newPrintDO = `const PrintDeliveryOrdersOverlay = () => {
  const { printingDeliveryOrders, setPrintingDeliveryOrders, handlePrintRequest, handleGeneratePDF, receipts, companies } = React.useContext(AppContext);

  if (!printingDeliveryOrders) return null;
  const m = printingDeliveryOrders;

  const doGroups: Record<string, any> = {};
  if (m.type === 'FCL') {
    const compConsignor = (companies || []).find(c => c.name === m.consignor);
    const compConsignee = (companies || []).find(c => c.name === m.consignee);
    const savedDeliveryAddress = compConsignee?.deliveryAddresses?.[0] ? formatAddress(compConsignee.deliveryAddresses[0]) : '';
    const key = \`FCL_\${m.id}\`;
    let totalQty = 0;
    let totalWgt = 0;
    const mappedLines = (m.fclProducts || []).map(p => {
      const q = parseFloat(p.qty) || 0;
      const wbg = parseFloat(p.weight) || 0;
      totalQty += q;
      totalWgt += wbg;
      return {
        product: p.description,
        loadQty: q,
        uom: p.uom,
        unitCbm: 0,
        unitWeight: wbg,
        hblNo: m.blNo || '-',
        receiptId: 'FCL',
        shipperDoNo: '-'
      };
    });
    
    doGroups[key] = {
      customer: m.fclCustomer,
      consignee: m.consignee,
      address: savedDeliveryAddress,
      consignor: m.consignor,
      lines: mappedLines,
      consignorContact: compConsignor?.contactNumber || '',
      consignorAddress: formatAddress(compConsignor),
      consigneeContact: compConsignee?.contactNumber || '',
      totalQty, totalCBM: 0, totalWgt, shipperDoNos: [], hblNos: [m.blNo || '-'].filter(Boolean)
    };
  } else {
    (m.lines || []).forEach(line => {
      const receipt = (receipts || []).find(r => r.id === line.receiptId);
      if (receipt) {
        const key = \`\${receipt.customer}_\\\\${receipt.consigneeDeliveryAddress || 'DEFAULT'}\`;
        const lookupKey = \`\${receipt.customer}_\${receipt.consigneeDeliveryAddress || 'DEFAULT'}\`;
        if (!doGroups[lookupKey]) {
          const compConsignor = (companies || []).find(c => c.name === receipt.consignor);
          const compConsignee = (companies || []).find(c => c.name === receipt.consignee);
          const savedDeliveryAddress = compConsignee?.deliveryAddresses?.find(da => da.address === receipt.consigneeDeliveryAddress || formatAddress(da) === receipt.consigneeDeliveryAddress) || receipt.consigneeDeliveryAddress;

          doGroups[lookupKey] = {
            customer: receipt.customer, 
            consignee: receipt.consignee, 
            address: formatAddress(savedDeliveryAddress), 
            consignor: receipt.consignor, 
            lines: [],
            consignorContact: compConsignor?.contactNumber || '',
            consignorAddress: formatAddress(compConsignor),
            consigneeContact: compConsignee?.contactNumber || '',
            totalQty: 0, totalCBM: 0, totalWgt: 0, shipperDoNos: [], hblNos: []
          };
        }
        doGroups[lookupKey].lines.push({ ...line, shipperDoNo: receipt.shipperDoNo });
        doGroups[lookupKey].totalQty += parseInt(line.loadQty || 0);
        doGroups[lookupKey].totalCBM += (parseInt(line.loadQty || 0) * parseFloat(line.unitCbm || 0));
        doGroups[lookupKey].totalWgt += (parseInt(line.loadQty || 0) * parseFloat(line.unitWeight || 0));
        
        const lineHbl = line.hblNo || m.blNo;
        if (lineHbl && !doGroups[lookupKey].hblNos.includes(lineHbl)) {
          doGroups[lookupKey].hblNos.push(lineHbl);
        }
        if (receipt.shipperDoNo && !doGroups[lookupKey].shipperDoNos.includes(receipt.shipperDoNo)) {
          doGroups[lookupKey].shipperDoNos.push(receipt.shipperDoNo);
        }
      }
    });
  }
  const groups = Object.values(doGroups);

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Delivery Orders</h3><p className="text-sm text-slate-500">Generated {groups.length} distinct D/O pages based on destinations.</p></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setPrintingDeliveryOrders(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', \`\${m.id}-DO.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors">Print All D/Os</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20 space-y-8 text-left">
        {groups.map((group, gIdx) => {
          const manifestNoWithoutMNF = m.id.replace(/^MNF-?/, '');
          const doNumber = \`DO-\${manifestNoWithoutMNF}/\${String(gIdx+1).padStart(3, '0')}\`;

          return (
            <div key={gIdx} className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
              
              <table className="print-layout-table w-full border-none border-collapse text-left text-sm">
                <thead className="display-table-header-group">
                  <tr>
                    <td className="border-none p-0">
                      <LetterheadHeader 
                        docType="DeliveryOrders" 
                        subtitle="DELIVERY ORDER"
                      />
                      
                      <div className="grid grid-cols-2 gap-8 mb-4 mt-4 text-xs">
                        <div className="border p-3 border-slate-300 rounded bg-slate-50">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Deliver To (Consignee):</p>
                          <p className="font-bold text-sm uppercase">{group.consignee || group.customer}</p>
                          <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-tight">{group.address}</p>
                          <p className="text-slate-600 mt-2"><span className="font-semibold">Tel:</span> {group.consigneeContact || '-'}</p>
                        </div>
                        <div className="border p-3 border-slate-300 rounded flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Sender (Consignor):</p>
                            <p className="font-bold text-sm uppercase">{group.consignor}</p>
                            <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-tight">{group.consignorAddress}</p>
                            <p className="text-slate-600 mt-2"><span className="font-semibold">Tel:</span> {group.consignorContact || '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col font-mono text-[10px] border border-slate-300 rounded bg-slate-50 mb-4 divide-y divide-slate-300">
                        <div className="grid grid-cols-[1fr_2fr_2fr] divide-x divide-slate-300">
                          <div className="p-2"><span className="text-slate-500 block">DATE:</span> <strong className="text-xs">{formatDate(new Date())}</strong></div>
                          <div className="p-2"><span className="text-slate-500 block">MANIFEST NUMBER:</span> <strong className="text-xs">{m.id}</strong></div>
                          <div className="p-2"><span className="text-slate-500 block">DO NUMBER:</span> <strong className="text-xs">{doNumber}</strong></div>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-slate-300">
                          <div className="p-2"><span className="text-slate-500 block">CONTAINER NUMBER:</span> <strong className="text-xs">{m.containerNo || '-'}</strong></div>
                          <div className="p-2"><span className="text-slate-500 block">MASTER BL NUMBER:</span> <strong className="text-xs break-all">{m.blNo || '-'}</strong></div>
                        </div>
                      </div>
                      <div className="h-2"></div>
                    </td>
                  </tr>
                </thead>
                <tbody className="display-table-row-group">
                  <tr>
                    <td className="border-none p-0 align-top">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead><tr className="bg-slate-100 border-y border-slate-300"><th className="p-2 border">Item Description</th><th className="p-2 text-center border">Qty / UOM</th><th className="p-2 text-right border">CBM</th><th className="p-2 text-right border">WGT</th></tr></thead>
                        <tbody className="divide-y divide-slate-200">
                          {group.lines.map((l, i) => (
                            <tr key={i}>
                              <td className="p-2 border">
                                {l.product} 
                                <span className="text-[10px] text-slate-500 block mt-0.5">HBL: {l.hblNo || '-'}</span>
                                <span className="text-[10px] text-slate-500 block">Ref: {l.receiptId} | {l.shipperDoNo || '-'}</span>
                              </td>
                              <td className="p-2 text-center font-bold border">{l.loadQty} {l.uom}</td>
                              <td className="p-2 text-right font-mono border">{((l.loadQty || 0) * (l.unitCbm || 0)).toFixed(3)}</td>
                              <td className="p-2 text-right font-mono border">{((l.loadQty || 0) * (l.unitWeight || 0)).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-slate-300 font-bold bg-slate-50">
                          <tr><td className="p-3 text-right">TOTAL DELIVERY:</td><td className="p-3 text-center text-lg">{group.totalQty}</td><td className="p-3 text-right">{(group.totalCBM || 0).toFixed(3)}</td><td className="p-3 text-right">{(group.totalWgt || 0).toFixed(2)}</td></tr>
                        </tfoot>
                      </table>
                    </td>
                  </tr>
                </tbody>
                <tfoot className="display-table-footer-group">
                  <tr>
                    <td className="border-none p-0 pt-8">
                      <div className="grid grid-cols-2 gap-12 text-xs print-avoid-break">
                        <div className="pt-2">
                          <p className="font-bold text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">Driver / Transporter</p>
                          <div className="space-y-4">
                            <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Transporter:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                            <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Driver Name:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                            <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">NRIC:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                          </div>
                        </div>
                        <div className="pt-2">
                          <p className="font-bold text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">Consignee Received Acknowledgement</p>
                          <div className="space-y-4">
                            <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Company Stamp:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                            <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Receiver Name:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                            <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Date:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-100 mt-8 pt-4 uppercase tracking-widest font-mono">
                        <div>DO No: {doNumber}</div>
                        <div className="print-page-number"></div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>

            </div>
          );
        })}
      </div>
    </div>
  );
};`;

replaceOrError(oldPrintDO, newPrintDO, 'PrintDeliveryOrdersOverlay');


// ----------------------------------------------------
// 4. PrintPickupNoteOverlay
// ----------------------------------------------------
const oldPrintPickup = `const PrintPickupNoteOverlay = () => {
  const { printingPickupNote, setPrintingPickupNote, handlePrintRequest, handleGeneratePDF, companies, currentUser, formatDate } = React.useContext(AppContext);

  if (!printingPickupNote) return null;
  const pickupsToPrint = Array.isArray(printingPickupNote) ? printingPickupNote : [printingPickupNote];

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Pickup Note</h3></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setPrintingPickupNote(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', \`Pickup-Note.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-indigo-800 text-white rounded hover:bg-indigo-900 transition-colors">Print Pickup Note</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20 space-y-8">
        {pickupsToPrint.map((p, pIndex) => {
          const dropOffCompanyName = (companies || []).find(c => c.id === p.dropOffCompanyId)?.name || 'N/A';
          return (
            <div key={p.id || pIndex} className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
              
              <LetterheadHeader 
                docType="PickupNote" 
                subtitle="PICKUP NOTE"
                rightNode={
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold text-indigo-700">{p.id}</p>
                    <p className="font-mono text-sm font-semibold">{formatDate(p.date)}</p>
                  </div>
                }
              />

              <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                <div className="border p-3 border-slate-300 rounded">
                  <p className="text-xs uppercase font-bold text-slate-500 mb-1">PickUp From (Consignor)</p>
                  <p className="font-bold text-base uppercase text-slate-800">{p.consignorName || '-'}</p>
                  <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{p.pickupAddress}</p>
                  {p.picContact && <p className="text-slate-600 mt-2 font-semibold">PIC/Contact: {p.picContact}</p>}
                </div>
                <div className="border p-3 border-slate-300 rounded bg-indigo-50/50">
                  <p className="text-xs uppercase font-bold text-slate-500 mb-1">Drop Off Location</p>
                  <p className="font-bold text-base uppercase text-slate-800">{dropOffCompanyName}</p>
                  <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed font-medium">{p.dropOffAddress}</p>
                  {p.dropOffContact && <p className="text-slate-600 mt-2 font-semibold">PIC/Contact: {p.dropOffContact}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                <div className="border p-3 border-slate-300 rounded">
                  <p className="text-xs uppercase font-bold text-slate-500 mb-1">Customer</p>
                  <p className="font-bold text-slate-800">{p.customerName || '-'}</p>
                </div>
                <div className="border p-3 border-slate-300 rounded">
                  <p className="text-xs uppercase font-bold text-slate-500 mb-1">Consignee</p>
                  <p className="font-bold text-slate-800">{p.consigneeName || '-'}</p>
                </div>
              </div>

              <div className="mb-6 p-3 border border-slate-300 rounded text-sm bg-slate-50">
                <p className="text-xs uppercase font-bold text-slate-500 mb-2">Transporter Details</p>
                <p className="font-bold text-slate-800">{p.pickupPartyName || '-'}</p>
                <p className="text-slate-600">Truck: {p.truckDetails || '-'} &nbsp;|&nbsp; Driver Contact: {p.driverContact || '-'} &nbsp;|&nbsp; IC: {p.driverIC || '-'}</p>
              </div>

              <table className="w-full text-left text-sm border-collapse border border-slate-400 mb-6">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 p-2 font-bold w-12 text-center text-slate-700">No.</th>
                    <th className="border border-slate-300 p-2 font-bold text-slate-700">Product / Commodity</th>
                    <th className="border border-slate-300 p-2 font-bold text-center w-20 text-slate-700">Qty</th>
                    <th className="border border-slate-300 p-2 font-bold text-center w-20 text-slate-700">UOM</th>
                    <th className="border border-slate-300 p-2 font-bold text-right w-24 text-slate-700">Weight</th>
                    <th className="border border-slate-300 p-2 font-bold text-right w-24 text-slate-700">CBM</th>
                  </tr>
                </thead>
                <tbody>
                  {(p.lines || []).map((line, idx) => {
                    const rowGWeight = (parseFloat(line.weight) || 0) * (parseInt(line.qty) || 0);
                    return (
                    <tr key={idx}>
                      <td className="border border-slate-300 p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-medium">{line.product}</td>
                      <td className="border border-slate-300 p-2 text-center">{line.qty}</td>
                      <td className="border border-slate-300 p-2 text-center text-xs">{line.uom}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">{rowGWeight ? \`\${rowGWeight} kg\` : '-'}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">{line.cbm ? line.cbm.toFixed(3) : '-'}</td>
                    </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan="2" className="border border-slate-300 p-2 text-right">TOTAL</td>
                    <td className="border border-slate-300 p-2 text-center">{(p.lines || []).reduce((sum, l) => sum + (parseInt(l.qty) || 0), 0)}</td>
                    <td className="border border-slate-300 p-2"></td>
                    <td className="border border-slate-300 p-2 text-right">{(p.lines || []).reduce((sum, l) => sum + ((parseFloat(l.weight) || 0) * (parseInt(l.qty) || 0)), 0).toFixed(2)} kg</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">{(p.lines || []).reduce((sum, l) => sum + (l.cbm || 0), 0).toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>

              {p.remarks && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  <p className="font-bold mb-1">Special Remarks:</p>
                  <p className="whitespace-pre-wrap">{p.remarks}</p>
                </div>
              )}

              <div className="mt-auto pt-8 text-center text-xs">
                <p className="text-xl text-slate-600 mb-2 font-medium">Generated by: <span className="font-bold text-2xl text-slate-900">{currentUser?.username || 'System'}</span></p>
                <p className="text-sm font-semibold text-slate-500 italic">This is computer generated, no signature required.</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};`;

const newPrintPickup = `const PrintPickupNoteOverlay = () => {
  const { printingPickupNote, setPrintingPickupNote, handlePrintRequest, handleGeneratePDF, companies, currentUser, formatDate } = React.useContext(AppContext);

  if (!printingPickupNote) return null;
  const pickupsToPrint = Array.isArray(printingPickupNote) ? printingPickupNote : [printingPickupNote];

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Pickup Note</h3></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setPrintingPickupNote(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', \`Pickup-Note.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-indigo-800 text-white rounded hover:bg-indigo-900 transition-colors">Print Pickup Note</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20 space-y-8 text-left">
        {pickupsToPrint.map((p, pIndex) => {
          const dropOffCompanyName = (companies || []).find(c => c.id === p.dropOffCompanyId)?.name || 'N/A';
          return (
            <div key={p.id || pIndex} className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
              
              <table className="print-layout-table w-full border-none border-collapse text-left text-sm">
                <thead className="display-table-header-group">
                  <tr>
                    <td className="border-none p-0">
                      <LetterheadHeader 
                        docType="PickupNote" 
                        subtitle="PICKUP NOTE"
                        rightNode={
                          <div className="text-right">
                            <p className="font-mono text-lg font-bold text-indigo-700">{p.id}</p>
                            <p className="font-mono text-sm font-semibold">{formatDate(p.date)}</p>
                          </div>
                        }
                      />

                      <div className="grid grid-cols-2 gap-6 mb-4 mt-4 text-xs">
                        <div className="border p-3 border-slate-300 rounded">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">PickUp From (Consignor)</p>
                          <p className="font-bold text-sm uppercase text-slate-800">{p.consignorName || '-'}</p>
                          <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{p.pickupAddress}</p>
                          {p.picContact && <p className="text-slate-600 mt-2 font-semibold">PIC/Contact: {p.picContact}</p>}
                        </div>
                        <div className="border p-3 border-slate-300 rounded bg-indigo-50/50">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Drop Off Location</p>
                          <p className="font-bold text-sm uppercase text-slate-800">{dropOffCompanyName}</p>
                          <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed font-medium">{p.dropOffAddress}</p>
                          {p.dropOffContact && <p className="text-slate-600 mt-2 font-semibold">PIC/Contact: {p.dropOffContact}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 mb-4 text-xs">
                        <div className="border p-3 border-slate-300 rounded">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Customer</p>
                          <p className="font-bold text-slate-800">{p.customerName || '-'}</p>
                        </div>
                        <div className="border p-3 border-slate-300 rounded">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Consignee</p>
                          <p className="font-bold text-slate-800">{p.consigneeName || '-'}</p>
                        </div>
                      </div>

                      <div className="mb-4 p-3 border border-slate-300 rounded text-xs bg-slate-50">
                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Transporter Details</p>
                        <p className="font-bold text-slate-800">{p.pickupPartyName || '-'}</p>
                        <p className="text-slate-600">Truck: {p.truckDetails || '-'} &nbsp;|&nbsp; Driver Contact: {p.driverContact || '-'} &nbsp;|&nbsp; IC: {p.driverIC || '-'}</p>
                      </div>
                      <div className="h-2"></div>
                    </td>
                  </tr>
                </thead>
                <tbody className="display-table-row-group">
                  <tr>
                    <td className="border-none p-0 align-top">
                      <table className="w-full text-left text-xs border-collapse border border-slate-400 mb-6">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="border border-slate-300 p-2 font-bold w-12 text-center text-slate-700">No.</th>
                            <th className="border border-slate-300 p-2 font-bold text-slate-700">Product / Commodity</th>
                            <th className="border border-slate-300 p-2 font-bold text-center w-20 text-slate-700">Qty</th>
                            <th className="border border-slate-300 p-2 font-bold text-center w-20 text-slate-700">UOM</th>
                            <th className="border border-slate-300 p-2 font-bold text-right w-24 text-slate-700">Weight</th>
                            <th className="border border-slate-300 p-2 font-bold text-right w-24 text-slate-700">CBM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(p.lines || []).map((line, idx) => {
                            const rowGWeight = (parseFloat(line.weight) || 0) * (parseInt(line.qty) || 0);
                            return (
                            <tr key={idx}>
                              <td className="border border-slate-300 p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="border border-slate-300 p-2 font-medium">{line.product}</td>
                              <td className="border border-slate-300 p-2 text-center">{line.qty}</td>
                              <td className="border border-slate-300 p-2 text-center text-xs">{line.uom}</td>
                              <td className="border border-slate-300 p-2 text-right font-mono">{rowGWeight ? \`\${rowGWeight} kg\` : '-'}</td>
                              <td className="border border-slate-300 p-2 text-right font-mono">{line.cbm ? line.cbm.toFixed(3) : '-'}</td>
                            </tr>
                            );
                          })}
                          <tr className="bg-slate-50 font-bold">
                            <td colSpan="2" className="border border-slate-300 p-2 text-right">TOTAL</td>
                            <td className="border border-slate-300 p-2 text-center">{(p.lines || []).reduce((sum, l) => sum + (parseInt(l.qty) || 0), 0)}</td>
                            <td className="border border-slate-300 p-2"></td>
                            <td className="border border-slate-300 p-2 text-right">{(p.lines || []).reduce((sum, l) => sum + ((parseFloat(l.weight) || 0) * (parseInt(l.qty) || 0)), 0).toFixed(2)} kg</td>
                            <td className="border border-slate-300 p-2 text-right font-mono">{(p.lines || []).reduce((sum, l) => sum + (l.cbm || 0), 0).toFixed(3)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
                <tfoot className="display-table-footer-group">
                  <tr>
                    <td className="border-none p-0 pt-6">
                      {p.remarks && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                          <p className="font-bold mb-1">Remarks:</p>
                          <p className="whitespace-pre-wrap">{p.remarks}</p>
                        </div>
                      )}

                      <div className="text-center text-xs pt-4 print-avoid-break">
                        <p className="text-sm text-slate-600 mb-1 font-medium">Generated by: <span className="font-bold text-base text-slate-900">{currentUser?.username || 'System'}</span></p>
                        <p className="text-xs font-semibold text-slate-500 italic">This is computer generated, no signature required.</p>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100 uppercase tracking-widest font-mono">
                        <div>Pickup Ref: {p.id}</div>
                        <div className="print-page-number"></div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>

            </div>
          );
        })}
      </div>
    </div>
  );
};`;

replaceOrError(oldPrintPickup, newPrintPickup, 'PrintPickupNoteOverlay');


// ----------------------------------------------------
// 5. PrintBookingFormOverlay
// ----------------------------------------------------
const oldPrintBooking = `const PrintBookingFormOverlay = () => {
  const { printingBookingForm, setPrintingBookingForm, handlePrintRequest, handleGeneratePDF, formatDate } = React.useContext(AppContext);

  if (!printingBookingForm) return null;
  const b = printingBookingForm;
  
  const typeCounts = {};
  (b.containers || []).forEach(c => {
    const key = \`\${c.containerTypeId || 'Unknown'} (\${c.usageType === 'FCL' ? 'FCL' : 'LCL'})\`;
    typeCounts[key] = (typeCounts[key] || 0) + 1;
  });
  
  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Booking Form</h3></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setPrintingBookingForm(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', \`\${b.id}-Booking.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Print To Liner</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col p-10 box-border" style={{ width: '210mm', minHeight: '297mm' }}>
          <LetterheadHeader 
            docType="BookingForm" 
            subtitle="Container Booking Request"
            rightNode={<><p className="text-sm uppercase font-semibold">Booking Ref</p><p className="text-2xl font-bold font-mono">{b.id}</p></>}
          />
          
          <div className="space-y-6 text-lg">
             <div className="flex justify-between border-b pb-2"><span className="font-bold text-slate-600">Booking Ref (CBN)</span> <span className="font-semibold text-xl">{b.id}</span></div>
             <div className="flex justify-between border-b pb-2"><span className="font-bold text-slate-600">Route</span> <span className="font-semibold">{b.pol || '-'} to {b.pod || '-'}</span></div>
             <div className="flex justify-between border-b pb-2"><span className="font-bold text-slate-600">Expected Sailing Date</span> <span className="font-semibold">{b.expectedSailingDate ? formatDate(b.expectedSailingDate) : '-'}</span></div>
             <div className="flex justify-between border-b pb-2"><span className="font-bold text-slate-600">Vessel & Voyage</span> <span className="font-semibold">{b.vessel || '-'} {b.voyage || '-'}</span></div>
             
             <div className="pt-8">
               <h3 className="font-bold text-xl mb-4 border-b pb-2">Containers Required</h3>
               <ul className="list-disc pl-6 space-y-2 font-semibold">
                 {Object.entries(typeCounts).map(([type, cnt]) => (
                   <li key={type} className="text-2xl">{cnt} x {type}</li>
                 ))}
                 {Object.keys(typeCounts).length === 0 && <li className="text-slate-500 italic">No container types specified.</li>}
               </ul>
             </div>
          </div>
          
          <div className="mt-auto pt-20">
              <p className="text-slate-600 text-sm">Please process the booking request for the above requirements to the related liner immediately.</p>
          </div>
        </div>
      </div>
    </div>
  );
};`;

const newPrintBooking = `const PrintBookingFormOverlay = () => {
  const { printingBookingForm, setPrintingBookingForm, handlePrintRequest, handleGeneratePDF, formatDate } = React.useContext(AppContext);

  if (!printingBookingForm) return null;
  const b = printingBookingForm;
  
  const typeCounts = {};
  (b.containers || []).forEach(c => {
    const key = \`\${c.containerTypeId || 'Unknown'} (\${c.usageType === 'FCL' ? 'FCL' : 'LCL'})\`;
    typeCounts[key] = (typeCounts[key] || 0) + 1;
  });
  
  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Booking Form</h3></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setPrintingBookingForm(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', \`\${b.id}-Booking.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Print To Liner</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20 text-left">
        <div className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col p-10 box-border" style={{ width: '210mm', minHeight: '297mm' }}>
          
          <table className="print-layout-table w-full border-none border-collapse text-left text-sm">
            <thead className="display-table-header-group">
              <tr>
                <td className="border-none p-0">
                  <LetterheadHeader 
                    docType="BookingForm" 
                    subtitle="Container Booking Request"
                    rightNode={<><p className="text-xs uppercase font-semibold">Booking Ref</p><p className="text-xl font-bold font-mono">{b.id}</p></>}
                  />
                  <div className="h-4"></div>
                </td>
              </tr>
            </thead>
            <tbody className="display-table-row-group">
              <tr>
                <td className="border-none p-0 align-top">
                  <div className="space-y-4 text-base">
                     <div className="flex justify-between border-b pb-1"><span className="font-bold text-slate-600">Booking Ref (CBN)</span> <span className="font-semibold text-lg">{b.id}</span></div>
                     <div className="flex justify-between border-b pb-1"><span className="font-bold text-slate-600">Route</span> <span className="font-semibold">{b.pol || '-'} to {b.pod || '-'}</span></div>
                     <div className="flex justify-between border-b pb-1"><span className="font-bold text-slate-600">Expected Sailing Date</span> <span className="font-semibold">{b.expectedSailingDate ? formatDate(b.expectedSailingDate) : '-'}</span></div>
                     <div className="flex justify-between border-b pb-1"><span className="font-bold text-slate-600">Vessel & Voyage</span> <span className="font-semibold">{b.vessel || '-'} {b.voyage || '-'}</span></div>
                     
                     <div className="pt-6">
                       <h3 className="font-bold text-base mb-2 border-b pb-1">Containers Required</h3>
                       <ul className="list-disc pl-6 space-y-1 font-semibold">
                         {Object.entries(typeCounts).map(([type, cnt]) => (
                           <li key={type} className="text-lg">{cnt} x {type}</li>
                         ))}
                         {Object.keys(typeCounts).length === 0 && <li className="text-slate-500 italic text-sm">No container types specified.</li>}
                       </ul>
                     </div>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot className="display-table-footer-group">
              <tr>
                <td className="border-none p-0 pt-12">
                  <div>
                      <p className="text-slate-600 text-xs">Please process the booking request for the above requirements to the related liner immediately.</p>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100 uppercase tracking-widest font-mono">
                    <div>Booking Ref: {b.id}</div>
                    <div className="print-page-number"></div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

        </div>
      </div>
    </div>
  );
};`;

replaceOrError(oldPrintBooking, newPrintBooking, 'PrintBookingFormOverlay');


// ----------------------------------------------------
// 6. PrintReturnNoteOverlay
// ----------------------------------------------------
const oldPrintReturn = `const PrintReturnNoteOverlay = () => {
  const { printingReturnNote, setPrintingReturnNote, handlePrintRequest, handleGeneratePDF, receipts, formatDate } = React.useContext(AppContext);

  if (!printingReturnNote) return null;
  const ret = printingReturnNote;
  const receipt = (receipts || []).find(r => r.id === ret.receiptId) || {};

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Return Note</h3></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setPrintingReturnNote(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', \`\${ret.id}-ReturnNote.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">Print Return Note</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
          
          <LetterheadHeader 
            docType="ReturnNote" 
            subtitle="RETURN NOTE"
            rightNode={
              <div className="text-right">
                <p className="font-mono text-lg font-bold text-orange-700">{ret.id}</p>
                <p className="font-mono text-sm font-semibold">{formatDate(ret.date)}</p>
              </div>
            }
          />

          <div className="grid grid-cols-3 gap-6 mb-6 text-sm">
            <div className="border p-3 border-slate-300 rounded bg-slate-50">
              <p className="text-xs uppercase font-bold text-slate-500 mb-1">Customer</p>
              <p className="font-bold text-base uppercase text-slate-800">{receipt.customer || '-'}</p>
              <p className="text-slate-600 mt-2"><span className="font-semibold text-xs">Orig Shipment:</span> <br/>{ret.receiptId}</p>
            </div>
            <div className="border p-3 border-slate-300 rounded">
              <p className="text-xs uppercase font-bold text-slate-500 mb-1">Consignee</p>
              <p className="font-bold text-base uppercase text-slate-800">{receipt.consignee || '-'}</p>
            </div>
            <div className="border p-3 border-slate-300 rounded">
              <p className="text-xs uppercase font-bold text-slate-500 mb-1">Consignor</p>
              <p className="font-bold text-base uppercase text-slate-800">{receipt.consignor || '-'}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs uppercase font-bold text-slate-500 mb-1">Reason for Return:</p>
            <div className="p-3 border border-slate-300 rounded bg-orange-50 text-orange-900 font-medium">
              {ret.reason || 'No reason provided.'}
            </div>
          </div>

          <table className="w-full text-left text-sm border-collapse mb-10">
            <thead>
              <tr className="bg-slate-100 border-y-2 border-black">
                <th className="p-2">Item Description</th>
                <th className="p-2 text-center">UOM</th>
                <th className="p-2 text-center">Orig. Qty</th>
                <th className="p-2 text-center text-orange-700">Return Qty</th>
                <th className="p-2 text-right">Deduct CBM</th>
                <th className="p-2 text-right">Deduct WGT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(ret.lines || []).map((l, i) => (
                <tr key={i}>
                  <td className="p-2">{l.product}</td>
                  <td className="p-2 text-center">{l.uom}</td>
                  <td className="p-2 text-center">{l.originalQty}</td>
                  <td className="p-2 text-center font-bold text-orange-700">{l.returnQty}</td>
                  <td className="p-2 text-right font-mono">{((l.returnQty || 0) * (l.unitCbm || 0)).toFixed(3)}</td>
                  <td className="p-2 text-right font-mono">{((l.returnQty || 0) * (l.unitWeight || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-y-2 border-black font-bold bg-slate-50">
              <tr>
                <td colSpan={3} className="p-3 text-right text-slate-700">TOTAL RETURNED:</td>
                <td className="p-3 text-center text-lg text-orange-700">{ret.totalReturnQty}</td>
                <td className="p-3 text-right text-slate-700">{(ret.totalReturnCBM || 0).toFixed(3)}</td>
                <td className="p-3 text-right text-slate-700">{(ret.totalReturnWeight || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="grid grid-cols-2 gap-12 mt-auto pt-10 text-sm absolute bottom-10 left-10 right-10">
            <div className="pt-2">
              <p className="font-bold text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">
                Return and Issued By:<br/> <span className="text-lg text-blue-800 font-black">{receipt.company || 'OmniMesh'}</span>
              </p>
              <div className="space-y-4 mt-6">
                <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Company Stamp:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Signature:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Date:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
              </div>
            </div>
            <div className="pt-2">
              <p className="font-bold text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">
                Received By / On behalf of:<br/> <span className="text-lg text-orange-800 font-black uppercase">{receipt.customer || 'Customer'}</span>
              </p>
              <div className="space-y-4 mt-6">
                <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Company Stamp:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Receiver Name:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Signature:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Date:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};`;

const newPrintReturn = `const PrintReturnNoteOverlay = () => {
  const { printingReturnNote, setPrintingReturnNote, handlePrintRequest, handleGeneratePDF, receipts, formatDate } = React.useContext(AppContext);

  if (!printingReturnNote) return null;
  const ret = printingReturnNote;
  const receipt = (receipts || []).find(r => r.id === ret.receiptId) || {};

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex flex-col sm:flex-row items-center sm:justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print gap-4">
        <div><h3 className="font-bold text-lg text-slate-800">Print Return Note</h3></div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setPrintingReturnNote(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', \`\${ret.id}-ReturnNote.pdf\`, 'a4', 10)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">Print Return Note</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20 text-left">
        <div className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
          
          <table className="print-layout-table w-full border-none border-collapse text-left text-sm">
            <thead className="display-table-header-group">
              <tr>
                <td className="border-none p-0">
                  <LetterheadHeader 
                    docType="ReturnNote" 
                    subtitle="RETURN NOTE"
                    rightNode={
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold text-orange-700">{ret.id}</p>
                        <p className="font-mono text-sm font-semibold">{formatDate(ret.date)}</p>
                      </div>
                    }
                  />

                  <div className="grid grid-cols-3 gap-6 mb-4 mt-4 text-xs">
                    <div className="border p-3 border-slate-300 rounded bg-slate-50">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Customer</p>
                      <p className="font-bold text-sm uppercase text-slate-800">{receipt.customer || '-'}</p>
                      <p className="text-slate-600 mt-2"><span className="font-semibold text-[10px]">Orig Shipment:</span> <br/>{ret.receiptId}</p>
                    </div>
                    <div className="border p-3 border-slate-300 rounded">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Consignee</p>
                      <p className="font-bold text-sm uppercase text-slate-800">{receipt.consignee || '-'}</p>
                    </div>
                    <div className="border p-3 border-slate-300 rounded">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Consignor</p>
                      <p className="font-bold text-sm uppercase text-slate-800">{receipt.consignor || '-'}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Reason for Return:</p>
                    <div className="p-3 border border-slate-300 rounded bg-orange-50 text-orange-900 font-medium text-xs">
                      {ret.reason || 'No reason provided.'}
                    </div>
                  </div>
                  <div className="h-2"></div>
                </td>
              </tr>
            </thead>
            <tbody className="display-table-row-group">
              <tr>
                <td className="border-none p-0 align-top">
                  <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-6 font-mono">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-400">
                        <th className="p-2 border">Item Description</th>
                        <th className="p-2 text-center border">UOM</th>
                        <th className="p-2 text-center border">Orig. Qty</th>
                        <th className="p-2 text-center border text-orange-700">Return Qty</th>
                        <th className="p-2 text-right border">Deduct CBM</th>
                        <th className="p-2 text-right border">Deduct WGT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(ret.lines || []).map((l, i) => (
                        <tr key={i}>
                          <td className="p-2 border">{l.product}</td>
                          <td className="p-2 text-center border">{l.uom}</td>
                          <td className="p-2 text-center border">{l.originalQty}</td>
                          <td className="p-2 text-center border font-bold text-orange-700">{l.returnQty}</td>
                          <td className="p-2 text-right border">{( (l.returnQty || 0) * (l.unitCbm || 0) ).toFixed(3)}</td>
                          <td className="p-2 text-right border">{( (l.returnQty || 0) * (l.unitWeight || 0) ).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-400 font-bold bg-slate-50">
                      <tr>
                        <td colSpan={3} className="p-3 text-right text-slate-700 font-sans">TOTAL RETURNED:</td>
                        <td className="p-3 text-center text-lg text-orange-700 font-sans">{ret.totalReturnQty}</td>
                        <td className="p-3 text-right text-slate-700">{(ret.totalReturnCBM || 0).toFixed(3)}</td>
                        <td className="p-3 text-right text-slate-700">{(ret.totalReturnWeight || 0).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </td>
              </tr>
            </tbody>
            <tfoot className="display-table-footer-group">
              <tr>
                <td className="border-none p-0 pt-8 mt-4">
                  <div className="grid grid-cols-2 gap-12 text-xs print-avoid-break">
                    <div className="pt-2">
                      <p className="font-bold text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">
                        Return and Issued By:<br/> <span className="text-sm text-blue-800 font-black">{receipt.company || 'OmniMesh'}</span>
                      </p>
                      <div className="space-y-4 mt-6">
                        <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Company Stamp:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                        <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Signature:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                        <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Date:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <p className="font-bold text-slate-800 border-b-2 border-slate-200 pb-1 mb-4">
                        Received By / On behalf of:<br/> <span className="text-sm text-orange-800 font-black uppercase">{receipt.customer || 'Customer'}</span>
                      </p>
                      <div className="space-y-4 mt-6">
                        <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Company Stamp:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                        <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Receiver Name:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                        <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Signature:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                        <div className="flex items-end"><span className="w-32 font-semibold text-slate-600">Date:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 mt-8 pt-4 border-t border-slate-100 uppercase tracking-widest font-mono">
                    <div>Return Note: {ret.id}</div>
                    <div className="print-page-number"></div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

        </div>
      </div>
    </div>
  );
};`;

replaceOrError(oldPrintReturn, newPrintReturn, 'PrintReturnNoteOverlay');

fs.writeFileSync(path, code);
console.log('App.tsx upgraded successfully!');
