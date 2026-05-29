import React, { useState } from 'react';
import { FileText, Plus, Edit, Trash2, Printer, Search } from 'lucide-react';

export const CommercialInvoiceList = ({ AppContext }) => {
  const { 
    checkAccess, commercialInvoices, 
    setEditCommercialInvoiceId, setActiveTab, setPrintingCommercialInvoice, showMessage,
    companies, formatDate, db, doc, deleteDoc, handleFirestoreError, OperationType, openRecordInNewWindow
  } = React.useContext(AppContext);

  if (!checkAccess('commercial_invoices', 'view')) {
    return <div className="p-8 text-center text-slate-500">You do not have permission to view commercial invoices.</div>;
  }

  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const filtered = (commercialInvoices || []).filter(ci => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      ci.id.toLowerCase().includes(term) ||
      (ci.manifestIds && ci.manifestIds.some(id => id.toLowerCase().includes(term))) ||
      (ci.hblNo && ci.hblNo.toLowerCase().includes(term)) ||
      (ci.poNumber && ci.poNumber.toLowerCase().includes(term))
    );
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteDoc(doc(db, 'commercialInvoices', deleteId))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `commercialInvoices/${deleteId}`));
      showMessage(`Invoice ${deleteId} deleted.`, 'success');
      setDeleteId(null);
    }
  };

  const getCompanyName = (id) => {
    const c = (companies || []).find(x => x.id === id);
    return c ? c.name : id;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Commercial Invoices</h2>
          <p className="text-slate-500 text-sm mt-1">Manage generated Commercial Invoices & Packing Lists</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input 
              type="text" value={search} onChange={e => setSearch(e.target.value)} 
              placeholder="Search CI..." className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          {checkAccess('commercial_invoices', 'create') && (
            <button onClick={() => { setEditCommercialInvoiceId(null); setActiveTab('new-commercial-invoice'); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center space-x-2">
              <Plus className="w-4 h-4" /> <span>New CI/PL</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-700">Invoice No</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Ref (SID / HBL)</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Type</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Date</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Declared / Info</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-right">Value</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-500">No invoices found.</td></tr>
            ) : (
              Object.entries(
                filtered.reduce((groups, ci) => {
                  const key = `Booking: ${ci.bookingId || '(None)'} / MBL: ${ci.hblNo || '(None)'}`;
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(ci);
                  return groups;
                }, {} as Record<string, typeof filtered>)
              ).map(([groupKey, groupInvoices]) => (
                <React.Fragment key={groupKey}>
                  <tr className="bg-slate-100/80 border-y border-slate-200">
                    <td colSpan={7} className="p-3 font-semibold text-slate-700 text-sm">{groupKey}</td>
                  </tr>
                  {(groupInvoices as typeof filtered).map(ci => (
                    <tr key={ci.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <button 
                            onClick={() => openRecordInNewWindow('new-commercial-invoice', ci.id)}
                            className="text-blue-600 underline hover:text-blue-800 text-left font-bold"
                          >
                            {ci.id}
                          </button>
                          {ci.status === 'DRAFT' && <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] uppercase tracking-wider font-bold">Draft</span>}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {(ci.manifestIds || []).map((mid, idx) => (
                            <button 
                              key={idx}
                              onClick={() => openRecordInNewWindow('new-manifest', mid)}
                              className="font-semibold text-blue-600 underline hover:text-blue-800 px-1 bg-blue-50 rounded"
                            >
                              {mid}
                            </button>
                          ))}
                        </div>
                        <span className="text-xs text-slate-500">HBL: {ci.hblNo || '-'}</span>
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-700">{ci.type || 'LCL'}</td>
                      <td className="p-4 text-sm text-slate-600">{ci.invoiceDate}</td>
                      <td className="p-4 text-xs text-slate-600">
                        <strong className="text-sm font-medium text-slate-800">{getCompanyName(ci.declCompanyId)}</strong>
                        {ci.type === 'FCL' && (
                          <div className="mt-1 space-y-0.5">
                            <div><span className="text-slate-400">Cust:</span> {ci.fclCustomer || '-'}</div>
                            <div><span className="text-slate-400">Cne:</span> {ci.fclConsignee || '-'}</div>
                            <div><span className="text-slate-400">Cnr:</span> {ci.fclConsignor || '-'}</div>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-800 text-right">{ci.currency} {(ci.totalValue || 0).toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center space-x-2">
                          {checkAccess('commercial_invoices', 'print') && (
                            <button onClick={() => setPrintingCommercialInvoice(ci)} className="px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-emerald-100 hover:text-emerald-700 text-xs font-medium flex items-center" title="Print CI/PL">
                              <Printer className="w-3 h-3 mr-1"/> Print
                            </button>
                          )}
                          {checkAccess('commercial_invoices', 'edit') && (
                            <button onClick={() => { setEditCommercialInvoiceId(ci.id); setActiveTab('new-commercial-invoice'); }} className="text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs font-medium">Edit</button>
                          )}
                          {checkAccess('commercial_invoices', 'delete') && (
                            <button onClick={() => setDeleteId(ci.id)} className="text-red-600 hover:text-red-800 px-2 py-1 bg-red-50 hover:bg-red-100 rounded text-xs font-medium">Del</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Invoice?</h3>
              <p className="text-slate-600">Are you sure you want to delete invoice {deleteId}? This cannot be undone.</p>
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">Cancel</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm">Delete Invoice</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
