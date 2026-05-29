import React, { useState, useMemo } from 'react';
import { Download, Printer, Search, Calendar, Filter, ChevronDown, CheckCircle, X } from 'lucide-react';

export const ReportModule = ({ context }: any) => {
  const { 
    receipts, pickups, containerBookings, haulierBookings, manifests, 
    commercialInvoices, returns, getActiveInventory, companies 
  } = context;

  const [activeReport, setActiveReport] = useState('shipment');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({ customer: '', consignee: '', consignor: '', company: '' });

  const setDatePreset = (preset: string) => {
    const today = new Date();
    let start: Date | null = new Date();
    let end: Date | null = new Date();

    if (preset === 'currentMonth') {
       start.setDate(1);
    } else if (preset === 'lastMonth') {
       start.setMonth(today.getMonth() - 1);
       start.setDate(1);
       end.setDate(0); // last day of previous month
    } else if (preset === 'lastYear') {
       start.setFullYear(today.getFullYear() - 1);
       start.setMonth(0);
       start.setDate(1);
       end.setFullYear(today.getFullYear() - 1);
       end.setMonth(11);
       end.setDate(31);
    } else if (preset === 'clear') {
       start = null;
       end = null;
    }

    setDateRange({
       start: start ? start.toISOString().split('T')[0] : '',
       end: end ? end.toISOString().split('T')[0] : ''
    });
  };

  const withinDateRange = (dateStr: string) => {
    if (!dateStr) return false;
    if (!dateRange.start && !dateRange.end) return true;
    const d = new Date(dateStr).getTime();
    const s = dateRange.start ? new Date(dateRange.start).getTime() : -Infinity;
    const e = dateRange.end ? new Date(dateRange.end).getTime() + 86400000 : Infinity; // Include end day
    return d >= s && d <= e;
  };

  const getFilteredData = (source: any[], dateField: string) => {
    return (source || []).filter(item => {
       if (!withinDateRange(item[dateField])) return false;
       if (filters.customer && item.customer && !item.customer.toLowerCase().includes(filters.customer.toLowerCase())) return false;
       if (filters.customer && item.customerName && !item.customerName.toLowerCase().includes(filters.customer.toLowerCase())) return false;
       
       if (filters.consignee && item.consignee && !item.consignee.toLowerCase().includes(filters.consignee.toLowerCase())) return false;
       if (filters.consignee && item.consigneeName && !item.consigneeName.toLowerCase().includes(filters.consignee.toLowerCase())) return false;
       
       if (filters.consignor && item.consignor && !item.consignor.toLowerCase().includes(filters.consignor.toLowerCase())) return false;
       if (filters.consignor && item.consignorName && !item.consignorName.toLowerCase().includes(filters.consignor.toLowerCase())) return false;

       if (filters.company && item.company && !item.company.toLowerCase().includes(filters.company.toLowerCase())) return false;
       if (filters.company && item.pickupPartyName && !item.pickupPartyName.toLowerCase().includes(filters.company.toLowerCase())) return false;
       
       return true;
    });
  };

  const reportConfig: Record<string, any> = {
     pickup: { title: 'Pickup Report', data: getFilteredData(pickups, 'date'), cols: ['ID', 'Date', 'Customer', 'Consignor', 'Drop-Off', 'Total CBM', 'Total Weight'] },
     shipment: { title: 'Shipment Report', data: getFilteredData(receipts, 'date'), cols: ['ID', 'Date', 'Customer', 'Consignee', 'Consignor', 'Dest', 'Total CBM', 'Total Weight'] },
     container_booking: { title: 'Container Booking Report', data: getFilteredData(containerBookings, 'date'), cols: ['ID', 'Date', 'Liner', 'Vessel', 'Voyage', 'POL', 'POD'] },
     haulier_booking: { title: 'Haulier Booking Report', data: getFilteredData(haulierBookings, 'date'), cols: ['ID', 'Date', 'Haulier', 'Trans. Type', 'Pickup Local'] },
     manifest: { title: 'Manifest Report', data: getFilteredData(manifests, 'date'), cols: ['ID', 'Date', 'Route', 'Liner', 'No of Shipments', 'Total CBM', 'Total Weight'] },
     cipl: { title: 'Commercial Invoices Report', data: getFilteredData(commercialInvoices, 'invoiceDate'), cols: ['ID', 'Date', 'PO Number', 'Value', 'Booking ID'] },
     return_note: { title: 'Return Note Report', data: getFilteredData(returns, 'date'), cols: ['ID', 'Date', 'Receipt ID', 'Reason', 'Total CBM Return', 'Total Weight Return'] },
     inventory: { title: 'Active Inventory Report', data: getActiveInventory().filter((a: any) => a.currentQty > 0), cols: ['Receipt ID', 'Product', 'Current Qty', 'Total CBM', 'Total Weight', 'Date Received'] }
  };

  const getRowData = (type: string, row: any) => {
      switch(type) {
         case 'pickup': return [row.id, row.date?.split('T')[0], row.customerName, row.consignorName, row.dropOffAddress, row.totalCBM?.toFixed(2) || '-', row.totalWeight?.toFixed(2) || '-'];
         case 'shipment': return [row.id, row.date?.split('T')[0], row.customer, row.consignee, row.consignor, `${row.pol}-${row.pod}`, row.totalCBM?.toFixed(2) || '-', row.totalWeight?.toFixed(2) || '-'];
         case 'container_booking': return [row.id, row.date?.split('T')[0], row.linerBrokerId, row.vesselName, row.voyageNumber, row.pol, row.pod];
         case 'haulier_booking': return [row.id, row.date?.split('T')[0], row.haulierId, row.transportType, row.pickupLocation];
         case 'manifest': return [row.id, row.date?.split('T')[0], `${row.pol}-${row.pod}`, row.linerBrokerId, row.lines?.length || 0, row.totalCBM?.toFixed(2) || '-', row.totalWeight?.toFixed(2) || '-'];
         case 'cipl': return [row.id, row.invoiceDate, row.poNumber, row.totalValue, row.bookingId];
         case 'return_note': return [row.id, row.date?.split('T')[0], row.receiptId, row.reason, row.totalReturnCbm?.toFixed(2) || '-', row.totalReturnWeight?.toFixed(2) || '-'];
         case 'inventory': return [row.receiptId, row.product, row.currentQty, (row.currentQty * row.unitCbm).toFixed(2), (row.currentQty * row.unitWeight).toFixed(2), row.date?.split('T')[0]];
         default: return [];
      }
  };

  const activeConf = reportConfig[activeReport];

  const exportToCSV = () => {
     let csv = activeConf.cols.join(',') + '\n';
     
     activeConf.data.forEach((row: any) => {
        const rowData = getRowData(activeReport, row);
        csv += rowData.map((v: any) => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(',') + '\n';
     });
     
     const blob = new Blob([csv], { type: 'text/csv' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `${activeReport}_report_${new Date().getTime()}.csv`;
     a.click();
  };

  const printReport = () => {
      const el = document.getElementById('report-print-area');
      if (!el) return;
      const printContents = el.innerHTML;
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); 
  };


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
       <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reports Center</h1>
            <p className="text-sm text-slate-500">Generate, view, and export operational reports.</p>
          </div>
          <div className="flex space-x-3">
             <button onClick={exportToCSV} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-semibold transition-colors"><Download className="w-4 h-4"/> <span>Export CSV</span></button>
             <button onClick={printReport} className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-semibold transition-colors"><Printer className="w-4 h-4"/> <span>Print A4</span></button>
          </div>
       </div>

       <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
             <div className="md:col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">Report Type</label>
                <select value={activeReport} onChange={e=>setActiveReport(e.target.value)} className="w-full p-2 border border-slate-300 rounded font-medium">
                   {Object.entries(reportConfig).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}
                </select>
             </div>
             <div className="md:col-span-3">
                <label className="block text-sm font-bold text-slate-700 mb-2">Date Range Preset</label>
                <div className="flex flex-wrap gap-2">
                   <button onClick={() => setDatePreset('currentMonth')} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm font-semibold hover:bg-blue-100">Current Month</button>
                   <button onClick={() => setDatePreset('lastMonth')} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm font-semibold hover:bg-blue-100">Last 1 Month</button>
                   <button onClick={() => setDatePreset('lastYear')} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm font-semibold hover:bg-blue-100">Last Year</button>
                   <div className="flex space-x-2 items-center ml-4">
                      <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="p-1.5 border border-slate-300 rounded text-sm" />
                      <span className="text-slate-500">to</span>
                      <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="p-1.5 border border-slate-300 rounded text-sm" />
                      <button onClick={() => setDatePreset('clear')} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-md">
             <div><label className="text-xs font-semibold text-slate-600 block mb-1">Company (Partner)</label><input type="text" placeholder="Filter..." value={filters.company} onChange={e=>setFilters(prev=>({...prev, company: e.target.value}))} className="w-full p-1.5 text-sm rounded border border-slate-300"/></div>
             <div><label className="text-xs font-semibold text-slate-600 block mb-1">Customer</label><input type="text" placeholder="Filter..." value={filters.customer} onChange={e=>setFilters(prev=>({...prev, customer: e.target.value}))} className="w-full p-1.5 text-sm rounded border border-slate-300"/></div>
             <div><label className="text-xs font-semibold text-slate-600 block mb-1">Consignee</label><input type="text" placeholder="Filter..." value={filters.consignee} onChange={e=>setFilters(prev=>({...prev, consignee: e.target.value}))} className="w-full p-1.5 text-sm rounded border border-slate-300"/></div>
             <div><label className="text-xs font-semibold text-slate-600 block mb-1">Consignor</label><input type="text" placeholder="Filter..." value={filters.consignor} onChange={e=>setFilters(prev=>({...prev, consignor: e.target.value}))} className="w-full p-1.5 text-sm rounded border border-slate-300"/></div>
          </div>
       </div>

       <div id="report-print-area" className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 overflow-x-auto min-h-[400px] w-[8.5in] max-w-none">
          <style>{`@media print { @page { size: landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; } }`}</style>
          <div className="mb-4 print:block">
            <h2 className="text-2xl font-bold text-black">{activeConf.title}</h2>
            <p className="text-sm text-black">Record Count: {activeConf.data.length}</p>
          </div>
          <table className="w-full text-left text-sm border-collapse">
             <thead>
               <tr className="bg-white border-b border-slate-300">
                 {activeConf.cols.map((col: any, i: number) => <th key={i} className="p-3 font-semibold text-black">{col}</th>)}
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {activeConf.data.length === 0 ? (
                 <tr><td colSpan={activeConf.cols.length} className="p-8 text-center text-black">No data found matching the current filters.</td></tr>
               ) : (
                 activeConf.data.map((row: any, i: number) => (
                   <tr key={row.id || i} className="hover:bg-white">
                     {getRowData(activeReport, row).map((val, cellIdx) => <td key={cellIdx} className="p-3 text-black truncate max-w-[200px]" title={val}>{val}</td>)}
                   </tr>
                 ))
               )}
             </tbody>
          </table>
       </div>
    </div>
  );
};
