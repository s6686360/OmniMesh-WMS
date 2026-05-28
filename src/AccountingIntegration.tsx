import React, { useState, useContext } from 'react';
import { AppContext } from './App';
import { FileDown, CheckCircle2, Search, ArrowRight, Eye } from 'lucide-react';

const AccountingIntegration = () => {
  const { vendorBills, manifests, invoices, glCodes, services, csvExportTemplates, showMessage, logActivity, currentUser, db, doc, updateDoc, companies, setDoc } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('AP'); // AP = Vendor Bills, AR = Manifest Billings
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedPostedDocs, setSelectedPostedDocs] = useState<string[]>([]);
  const [isConfirmingPost, setIsConfirmingPost] = useState(false);
  const [unpostDocId, setUnpostDocId] = useState<string | null>(null);
  const [viewPosted, setViewPosted] = useState(false);
  const [expandedBatches, setExpandedBatches] = useState<string[]>([]);

  const availableTemplates = (csvExportTemplates || []).filter(t => t.integrationType === activeTab);

  // Filter unposted docs
  const unpostedVendorBills = (vendorBills || []).filter(b => b.status === 'DRAFT' || b.status === 'POSTED'); // Assuming POSTED means verified internally but not EXPORTED yet? Wait. 
  // Let's treat POSTED as exported if we are adding a new status. Actually the user said "a post status require", meaning when it is "POSTED" it's locked and exported.
  // Wait, let's treat APPROVED as ready to post.
  // Let's filter AP: vendorBills with status = 'APPROVED' (waiting to export/post).
  const readyVendorBills = (vendorBills || []).filter(b => b.status === 'APPROVED');
  const postedVendorBills = (vendorBills || []).filter(b => b.status === 'POSTED');

  // Filter AR: Manifest Billings (or commercial invoices). The user mentioned they don't need invoice function, but export to CSV.
  // We have fclBilling in manifests, and commercial invoices (if they use that).
  const readyManifests = (manifests || []).filter(m => m.fclBilling && m.fclBilling.length > 0 && m.status !== 'POSTED');
  const postedManifests = (manifests || []).filter(m => m.status === 'POSTED');

  const getUnpostedDocs = () => {
    return activeTab === 'AP' ? readyVendorBills : readyManifests;
  };

  const getPostedDocs = () => {
    return activeTab === 'AP' ? postedVendorBills : postedManifests;
  };

  const handleSelectDoc = (id: string) => {
    if (selectedDocs.includes(id)) setSelectedDocs(selectedDocs.filter(d => d !== id));
    else setSelectedDocs([...selectedDocs, id]);
  };

  const selectAll = () => {
    const docs = getUnpostedDocs();
    if (selectedDocs.length === docs.length) setSelectedDocs([]);
    else setSelectedDocs(docs.map(d => d.id));
  };

  const generateExportData = (docsList: any[], tmpl: any) => {
    const generatedRows: any[] = [];
    docsList.forEach(doc => {
      // AP logic
      if (activeTab === 'AP') {
        const lines = doc.lines || [];
        lines.forEach((line: any) => {
           let service = (services || []).find(s => s.code === line.description || s.id === line.serviceId);
           let glCode = service?.expGlCode || '';

           let rowData: any = {};
           tmpl.columns.forEach((col: any) => {
             if (col.fieldType === 'Static') {
               rowData[col.headerName] = col.staticValue || '';
             } else {
               let val: any = '';
               let dataFieldLower = (col.dataField || '').toLowerCase();
               switch(dataFieldLower) {
                 case 'invoiceno': val = doc.invoiceNo; break;
                 case 'date': val = doc.date; break;
                 case 'duedate': val = doc.dueDate; break;
                 case 'customerid': val = doc.vendorId; break;
                 case 'vendorname': val = companies?.find(c => c.id === doc.vendorId)?.name || doc.vendorName || doc.vendorId; break;
                 case 'currency': val = doc.currency; break;
                 case 'exchangerate': val = doc.exchangeRate; break;
                 case 'line.amount': val = line.amount; break;
                 case 'line.taxamount': val = line.taxAmount; break;
                 case 'line.total': val = line.total; break;
                 case 'line.amountmyr': val = (line.amount * (doc.exchangeRate || 1.0)).toFixed(2); break;
                 case 'line.description': val = line.description; break;
                 case 'line.glcode': val = glCode; break;
                 case 'line.servicecode': val = service?.code || ''; break;
                 case 'exportbatchid': val = doc.exportBatchId || ''; break;
               }
               rowData[col.headerName] = val;
             }
           });
           generatedRows.push(rowData);
        });
      }
      else { // AR logic (Manifests)
        const lines = doc.fclBilling || [];
        lines.forEach((line: any) => {
           let service = (services || []).find(s => s.name === line.description || s.code === line.description);
           let glCode = service?.revGlCode || '';

           let rowData: any = {};
           tmpl.columns.forEach((col: any) => {
             if (col.fieldType === 'Static') {
               rowData[col.headerName] = col.staticValue || '';
             } else {
               let val: any = '';
               let dataFieldLower = (col.dataField || '').toLowerCase();
               switch(dataFieldLower) {
                 case 'invoiceno': val = `INV-${doc.id}`; break;
                 case 'date': val = new Date().toISOString().split('T')[0]; break;
                 case 'duedate': val = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]; break;
                 case 'customerid': val = doc.customerId || doc.bookingParams?.customerId || ''; break;
                 case 'vendorname': val = companies?.find(c => c.id === (doc.customerId || doc.bookingParams?.customerId))?.name || (doc.customerId || doc.bookingParams?.customerId); break;
                 case 'currency': val = line.sellingCurrency; break;
                 case 'exchangerate': val = '1.0'; break;
                 case 'line.amount': val = line.selling; break;
                 case 'line.taxamount': val = 0; break;
                 case 'line.total': val = line.selling; break;
                 case 'line.amountmyr': val = line.selling; break;
                 case 'line.description': val = line.description; break;
                 case 'line.glcode': val = glCode; break;
                 case 'line.servicecode': val = service?.code || ''; break;
                 case 'exportbatchid': val = doc.exportBatchId || ''; break;
               }
               rowData[col.headerName] = val;
             }
           });
           if (parseFloat(line.selling) > 0) {
             generatedRows.push(rowData);
           }
        });
      }
    });
    return generatedRows;
  };

  const generatePreview = () => {
    if (!selectedTemplate) return showMessage("Please select an export template first.");
    if (selectedDocs.length === 0) return showMessage("Please select at least one document to preview.");

    const tmpl = availableTemplates.find(t => t.id === selectedTemplate);
    if (!tmpl || !tmpl.columns) return showMessage("Invalid template configuration.");

    const docs = getUnpostedDocs().filter(d => selectedDocs.includes(d.id));
    const generatedRows = generateExportData(docs, tmpl);
    setPreviewData(generatedRows);
  };

  const triggerConfirm = () => {
     if (previewData.length === 0) return showMessage("Please generate preview first.");
     setIsConfirmingPost(true);
  };

  const handlePostAndExport = async () => {
     setIsConfirmingPost(false);
     const collectionName = activeTab === 'AP' ? 'vendorBills' : 'manifests';
     let updatedCount = 0;
     const batchId = `BATCH-${Math.floor(Date.now() / 1000)}`;

     try {
       for (const did of selectedDocs) {
         try {
           await updateDoc(doc(db, collectionName, did), { status: 'POSTED', exportBatchId: batchId });
           updatedCount++;
         } catch(e) {
           console.error("Failed to post doc", did, e);
         }
       }

       logActivity('UPDATE', 'accounting', null, `Posted ${updatedCount} ${activeTab} documents.`);

       const tmpl = availableTemplates.find(t => t.id === selectedTemplate);
       if (tmpl && tmpl.columns) {
         const headers = tmpl.columns.map((c: any) => c.headerName).join(',');
         // Refresh data with batchId for the csv
         const docs = getUnpostedDocs().filter(d => selectedDocs.includes(d.id)).map(d => ({...d, exportBatchId: batchId}));
         const rowsData = generateExportData(docs, tmpl);

         const rows = rowsData.map(r => {
           return tmpl.columns.map((c: any) => `"${r[c.headerName] || ''}"`).join(',');
         });
         const csvContent = [headers, ...rows].join('\n');
         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement("a");
         link.setAttribute("href", url);
         link.setAttribute("download", `${tmpl.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
       }

       showMessage(`Successfully posted & exported ${updatedCount} records.`);
       setPreviewData([]);
       setSelectedDocs([]);
     } catch (err) {
       console.error("Error during posting:", err);
       showMessage("Error occurred during posting.");
     }
  };

  const handleExportPosted = () => {
    if (!selectedTemplate) return showMessage("Please select an export template first.");
    if (selectedPostedDocs.length === 0) return showMessage("Please select at least one batch to export.");

    const tmpl = availableTemplates.find(t => t.id === selectedTemplate);
    if (!tmpl || !tmpl.columns) return showMessage("Invalid template configuration.");

    try {
        const docs = getPostedDocs().filter(d => selectedPostedDocs.includes(d.exportBatchId || 'NO-BATCH'));
        const rowsData = generateExportData(docs, tmpl);
        const headers = tmpl.columns.map((c: any) => c.headerName).join(',');

        const rows = rowsData.map(r => {
          return tmpl.columns.map((c: any) => `"${r[c.headerName] || ''}"`).join(',');
        });
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Reprint_${tmpl.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showMessage(`Successfully exported ${docs.length} records.`);
    } catch (e) {
        showMessage("Error exporting documents");
    }
  };

  const unpostedList = getUnpostedDocs();
  const postedList = getPostedDocs();

  const groupedPostedBatches = React.useMemo(() => {
     const batches = {};
     postedList.forEach(doc => {
        const bId = doc.exportBatchId || 'NO-BATCH';
        if (!batches[bId]) batches[bId] = { bId, docs: [], date: doc.date || doc.createdAt?.slice(0,10), totalAmount: 0 };
        batches[bId].docs.push(doc);
        let amt = activeTab === 'AP' ? (doc.totalAmount || 0) : (doc.fclBilling?.reduce((s:any,l:any) => s+(parseFloat(l.selling)||0), 0) || 0);
        batches[bId].totalAmount += amt;
     });
     return Object.values(batches).sort((a:any, b:any) => a.bId === 'NO-BATCH' ? 1 : b.bId === 'NO-BATCH' ? -1 : b.bId.localeCompare(a.bId));
  }, [postedList, activeTab]);

  const handleSelectAllPosted = () => {
    if (selectedPostedDocs.length === groupedPostedBatches.length) setSelectedPostedDocs([]);
    else setSelectedPostedDocs(groupedPostedBatches.map((b:any) => b.bId));
  };

  const handleTogglePosted = (bId: string) => {
    if (selectedPostedDocs.includes(bId)) setSelectedPostedDocs(selectedPostedDocs.filter(id => id !== bId));
    else setSelectedPostedDocs([...selectedPostedDocs, bId]);
  };

  const toggleBatch = (bId: string) => {
    setExpandedBatches(prev => prev.includes(bId) ? prev.filter(id => id !== bId) : [...prev, bId]);
  };

  const handleUnpostBatch = async () => {
    if (!unpostDocId) return;
    const batchData = groupedPostedBatches.find((b:any) => b.bId === unpostDocId) as any;
    if (!batchData) return;

    const collectionName = activeTab === 'AP' ? 'vendorBills' : 'manifests';
    const revertStatus = activeTab === 'AP' ? 'APPROVED' : 'OPEN';
    try {
      let limit = batchData.docs.length;
      for (const d of batchData.docs) {
        await updateDoc(doc(db, collectionName, d.id), { status: revertStatus, exportBatchId: null });
      }
      logActivity('UPDATE', 'accounting', unpostDocId, `Unposted ${limit} ${activeTab} documents in batch ${unpostDocId}`);
      showMessage(`Batch reverted successfully (${limit} docs).`, "success");
      setUnpostDocId(null);
      setSelectedPostedDocs([]);
    } catch (e) {
      console.error(e);
      showMessage("Failed to revert batch.");
      setUnpostDocId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Accounting Integration</h2>
          <p className="text-slate-500">Post approved documents to Accounting via CSV templates.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button onClick={() => { setActiveTab('AP'); setPreviewData([]); setSelectedDocs([]); setViewPosted(false); }} className={`px-6 py-3 font-medium text-sm ${activeTab === 'AP' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Accounts Payable (Vendor Bills)</button>
        <button onClick={() => { setActiveTab('AR'); setPreviewData([]); setSelectedDocs([]); setViewPosted(false); }} className={`px-6 py-3 font-medium text-sm ${activeTab === 'AR' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Accounts Receivable (Manifest / Invoices)</button>
      </div>

      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-wrap md:flex-nowrap gap-4 items-end mb-6">
          <div className="w-full md:w-1/3">
             <label className="block text-sm font-semibold text-slate-700 mb-1">Select Export Template</label>
             <select value={selectedTemplate} onChange={(e) => { setSelectedTemplate(e.target.value); setPreviewData([]); }} className="w-full p-2 border border-slate-300 rounded cursor-pointer">
               <option value="">-- Choose Template --</option>
               {availableTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
             </select>
             {availableTemplates.length === 0 && <p className="text-xs text-red-500 mt-1">No templates configured for {activeTab}. Check Master Data.</p>}
          </div>
          <button onClick={generatePreview} disabled={!selectedTemplate || selectedDocs.length === 0} className="px-4 py-2 bg-slate-800 text-white font-medium rounded hover:bg-slate-900 disabled:opacity-50 flex items-center space-x-2">
            <Eye className="w-4 h-4" /> <span>Generate Preview</span>
          </button>
        </div>

        {previewData.length > 0 ? (
           <div className="mt-8 border-t border-slate-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-800">CSV Formatted Preview ({previewData.length} lines)</h3>
                 <button onClick={triggerConfirm} className="px-5 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 flex items-center space-x-2 shadow-sm">
                    <FileDown className="w-4 h-4" /> <span>Post & Export to CSV</span>
                 </button>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr>
                      {Object.keys(previewData[0]).map(k => <th key={k} className="p-2 font-medium">{k}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        {Object.values(row).map((val: any, j) => <td key={j} className="p-2 text-slate-600">{val}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2">
                 <button onClick={() => setPreviewData([])} className="text-sm text-slate-500 underline">Cancel Preview</button>
              </div>
           </div>
        ) : viewPosted ? (
           <div>
             <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-4">
                 <h3 className="text-lg font-bold text-slate-800">Posted Documents ({postedList.length})</h3>
                 {selectedPostedDocs.length > 0 && (
                   <button onClick={handleExportPosted} className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded border border-indigo-100 hover:bg-indigo-100 font-medium whitespace-nowrap">Re-export ({selectedPostedDocs.length})</button>
                 )}
               </div>
               <button onClick={() => { setViewPosted(false); setSelectedPostedDocs([]); }} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">View Unposted</button>
             </div>
             {postedList.length === 0 ? (
               <p className="text-slate-500 italic p-4 bg-slate-50 rounded border border-slate-100">No posted documents found.</p>
             ) : (
               <div className="overflow-x-auto border border-slate-200 rounded-lg">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-10 text-center"><input type="checkbox" checked={selectedPostedDocs.length === postedList.length && postedList.length > 0} onChange={handleSelectAllPosted} className="rounded" /></th>
                        <th className="p-3 font-semibold">Document No</th>
                        <th className="p-3 font-semibold">Batch ID</th>
                        <th className="p-3 font-semibold">Date</th>
                        {activeTab === 'AP' && <th className="p-3 font-semibold">Vendor</th>}
                        <th className="p-3 font-semibold text-right">Total Amt</th>
                        <th className="p-3 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedPostedBatches.map((batch:any) => {
                         const isExpanded = expandedBatches.includes(batch.bId);
                         return (
                           <React.Fragment key={batch.bId}>
                             <tr className={`hover:bg-slate-50 cursor-pointer ${selectedPostedDocs.includes(batch.bId) ? 'bg-indigo-50/50' : ''}`} onClick={() => toggleBatch(batch.bId)}>
                               <td className="p-3 text-center" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedPostedDocs.includes(batch.bId)} onChange={() => handleTogglePosted(batch.bId)} className="rounded" /></td>
                               <td className="p-3 font-medium text-slate-700">
                                  <div className="flex items-center gap-2">
                                     <ArrowRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                     Batch of {batch.docs.length} docs
                                  </div>
                               </td>
                               <td className="p-3 text-slate-500 font-mono text-[10px] break-all max-w-[120px] whitespace-normal">{batch.bId}</td>
                               <td className="p-3 text-slate-600">{batch.date}</td>
                               {activeTab === 'AP' && <td className="p-3 text-slate-500 italic text-xs">Multiple Vendors Grouped</td>}
                               <td className="p-3 text-right font-bold text-slate-700">
                                 {activeTab === 'AP' ? `${batch.docs[0]?.currency || ''} ${batch.totalAmount.toFixed(2)}` : batch.totalAmount.toFixed(2)}
                               </td>
                               <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                                 <button onClick={() => setUnpostDocId(batch.bId)} className="text-xs px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 font-medium rounded">Revert/Unpost</button>
                               </td>
                             </tr>
                             {isExpanded && (
                                <tr>
                                  <td colSpan={activeTab === 'AP' ? 7 : 6} className="p-0 border-b border-slate-200 bg-slate-50/50">
                                    <div className="p-4 pl-12 border-l-4 border-indigo-400">
                                       <table className="w-full text-xs text-left text-slate-600">
                                          <thead className="text-slate-400 border-b border-slate-200">
                                            <tr>
                                              <th className="pb-2 font-medium">Document No</th>
                                              <th className="pb-2 font-medium">Date</th>
                                              {activeTab === 'AP' && <th className="pb-2 font-medium">Vendor</th>}
                                              <th className="pb-2 font-medium text-right">Amount</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {batch.docs.map((d: any) => (
                                              <tr key={d.id}>
                                                <td className="py-2 font-medium">{d.invoiceNo || `Manifest: ${d.id}`}</td>
                                                <td className="py-2">{d.date || d.createdAt?.slice(0,10)}</td>
                                                {activeTab === 'AP' && <td className="py-2">{companies?.find((c: any) => c.id === d.vendorId)?.name || d.vendorName || d.vendorId}</td>}
                                                <td className="py-2 text-right font-medium">
                                                   {activeTab === 'AP' ? `${d.currency} ${d.totalAmount?.toFixed(2)}` : `${d.fclBilling?.reduce((s:any,l:any) => s+(parseFloat(l.selling)||0), 0).toFixed(2)}`}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                       </table>
                                    </div>
                                  </td>
                                </tr>
                             )}
                           </React.Fragment>
                         )
                      })}
                    </tbody>
                 </table>
               </div>
             )}
           </div>
        ) : (
           <div>
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-lg font-bold text-slate-800">Unposted Documents ({unpostedList.length})</h3>
               <button onClick={() => setViewPosted(true)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">View Posted ({postedList.length})</button>
             </div>
             {unpostedList.length === 0 ? (
               <p className="text-slate-500 italic p-4 bg-slate-50 rounded border border-slate-100">No approved unposted documents found.</p>
             ) : (
               <div className="overflow-x-auto border border-slate-200 rounded-lg">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-10 text-center"><input type="checkbox" checked={selectedDocs.length === unpostedList.length && unpostedList.length > 0} onChange={selectAll} className="rounded" /></th>
                        <th className="p-3 font-semibold">Document No</th>
                        <th className="p-3 font-semibold">Date</th>
                        {activeTab === 'AP' && <th className="p-3 font-semibold">Vendor</th>}
                        <th className="p-3 font-semibold text-right">Total Amt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unpostedList.map(doc => {
                         const isSelected = selectedDocs.includes(doc.id);
                         return (
                           <tr key={doc.id} className={`hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''}`} onClick={() => handleSelectDoc(doc.id)}>
                             <td className="p-3 text-center"><input type="checkbox" checked={isSelected} readOnly className="rounded text-indigo-600" /></td>
                             <td className="p-3 font-medium text-indigo-700">{doc.invoiceNo || `Manifest: ${doc.id}`}</td>
                             <td className="p-3 text-slate-600">{doc.date || doc.createdAt?.slice(0,10)}</td>
                             {activeTab === 'AP' && <td className="p-3 text-slate-600">{companies?.find(c => c.id === doc.vendorId)?.name || doc.vendorName || doc.vendorId}</td>}
                             <td className="p-3 text-right font-bold text-slate-700">
                               {activeTab === 'AP' ? `${doc.currency} ${doc.totalAmount?.toFixed(2)}` : `${doc.fclBilling?.reduce((s,l) => s+(parseFloat(l.selling)||0), 0).toFixed(2)}`}
                             </td>
                           </tr>
                         )
                      })}
                    </tbody>
                 </table>
               </div>
             )}
           </div>
        )}
      </div>

      {isConfirmingPost && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4">
              <h3 className="font-bold text-slate-800 text-lg">Confirm Action</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">Are you sure you want to POST these records? They will be locked, and a CSV will be exported.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsConfirmingPost(false)} className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handlePostAndExport} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm focus:ring-2 focus:ring-green-500 focus:ring-offset-2">Post & Export</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {unpostDocId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4">
              <h3 className="font-bold text-slate-800 text-lg">Confirm Revert</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">Are you sure you want to revert this batch? {unpostDocId} will be unposted and moved back.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setUnpostDocId(null)} className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleUnpostBatch} className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-2">Revert / Unpost</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingIntegration;
