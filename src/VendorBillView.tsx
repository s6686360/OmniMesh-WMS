import React, { useState, useContext, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, ArrowLeft, Save, FileText, CheckCircle, Calculator, ChevronDown, ChevronRight, DollarSign, Activity } from 'lucide-react';
import { AppContext } from './App';

export const VendorBillsView = () => {
  const { vendorBills, setVendorBills, companies, manifests, containerBookings, miscChargeTypes, receipts, checkAccess, showMessage, currentUser, logActivity, db, doc, setDoc, deleteDoc } = useContext(AppContext);
  const [viewMode, setViewMode] = useState('list');
  const [editId, setEditId] = useState(null);
  const [expandedBills, setExpandedBills] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const qEditId = params.get('editId');
    if (tab === 'vendor-bills' && qEditId) {
      setEditId(qEditId);
      setViewMode('edit');
    }
  }, []);

  const toggleExpand = (id) => {
    setExpandedBills(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (viewMode === 'edit') {
    return <VendorBillForm editId={editId} onBack={() => { setViewMode('list'); setEditId(null); }} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Vendor Bills</h2>
        {checkAccess('vendor_bills', 'create') && (
          <button onClick={() => { setEditId(null); setViewMode('edit'); }} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition">
            <Plus className="w-5 h-5" /> <span>New Vendor Bill</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {(!vendorBills || vendorBills.length === 0) ? (
          <div className="p-8 text-center text-slate-500">No vendor bills recorded. Click "New Vendor Bill" to add one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="p-3 font-semibold text-sm">Bill ID / Date</th>
                  <th className="p-3 font-semibold text-sm">Vendor</th>
                  <th className="p-3 font-semibold text-sm">Invoice No.</th>
                  <th className="p-3 font-semibold text-sm">Reference</th>
                  <th className="p-3 font-semibold text-sm">Amount</th>
                  <th className="p-3 font-semibold text-sm">Base Eqv.</th>
                  <th className="p-3 font-semibold text-sm">Status</th>
                  <th className="p-3 font-semibold text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorBills.map(bill => {
                  const comp = (companies || []).find(c => c.id === bill.vendorId);
                  const isPosted = bill.status === 'POSTED' || bill.status === 'PAID' || bill.status === 'APPROVED';
                  const hasMultipleLines = bill.lines && bill.lines.length > 1;
                  const isExpanded = expandedBills[bill.id];
                  
                  return (
                    <React.Fragment key={bill.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 flex items-center gap-2">
                        {hasMultipleLines ? (
                          <button onClick={() => toggleExpand(bill.id)} className="p-1 hover:bg-indigo-50 text-indigo-500 rounded transition-colors">
                             <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        ) : (
                          <div className="w-6" /> // spacer
                        )}
                        <div>
                          <div className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => { setEditId(bill.id); setViewMode('edit'); }}>{bill.id}</div>
                          <div className="text-xs text-slate-500">{bill.date}</div>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-slate-800">{comp ? comp.name : (bill.vendorId || 'N/A')}</td>
                      <td className="p-3 text-slate-600">{bill.invoiceNo || 'N/A'}</td>
                      <td className="p-3 text-slate-600">
                         {bill.referenceType !== 'NONE' && bill.referenceId ? `${bill.referenceType}: ${bill.referenceId}` : '-'}
                      </td>
                      <td className="p-3 font-medium">
                        {bill.currency} {bill.totalAmount?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="p-3 text-emerald-600 font-medium">
                        MYR {bill.totalBaseAmount?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="p-3">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${bill.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' : bill.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-700' : bill.status === 'POSTED' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                           {bill.status}
                         </span>
                      </td>
                      <td className="p-3 text-right flex justify-end space-x-2">
                         {bill.status === 'APPROVED' && (
                           <button 
                             onClick={async () => {
                              try {
                                await setDoc(doc(db, 'vendorBills', bill.id), { ...bill, status: 'DRAFT' });
                                logActivity('UPDATE', 'Vendor Bills', bill.id, `Unapproved bill ${bill.id}`);
                                showMessage("Bill unapproved and reverted to DRAFT.");
                              } catch(e) { showMessage("Error unapproving bill."); }
                             }} 
                             className="p-1.5 bg-amber-50 text-amber-700 rounded hover:bg-amber-100"
                             title="Unapprove"
                           >
                             <ArrowLeft className="w-4 h-4" />
                           </button>
                         )}
                         <button onClick={() => { setEditId(bill.id); setViewMode('edit'); }} className="p-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center inline-flex">
                           {isPosted ? <FileText className="w-4 h-4" title="View" /> : <Edit className="w-4 h-4" title="Edit" />}
                         </button>
                      </td>
                    </tr>
                    {isExpanded && hasMultipleLines && (
                       <tr className="bg-slate-50/50">
                         <td colSpan={8} className="p-0">
                           <div className="pl-12 pr-4 py-3 border-b border-slate-100">
                             <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden bg-white">
                               <thead className="bg-slate-100">
                                 <tr className="text-slate-600 border-b border-slate-200">
                                   <th className="font-semibold p-2">Description</th>
                                   <th className="font-semibold p-2 max-w-[150px]">Apportionment</th>
                                   <th className="font-semibold p-2">Qty</th>
                                   <th className="font-semibold p-2 text-right">Unit Price</th>
                                   <th className="font-semibold p-2 text-right">Total</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                 {bill.lines.map((l: any, idx: number) => (
                                   <tr key={idx} className="hover:bg-slate-50">
                                     <td className="p-2 text-slate-700">{l.description || '-'}</td>
                                     <td className="p-2 text-slate-500 truncate max-w-[150px] text-[10px] uppercase">{l.splitMethod} ({l.targetContainerId === 'ALL' ? 'All (Pool)' : l.targetContainerId === 'ALL_EQUAL' ? 'All (Equal)' : 'Specific'})</td>
                                     <td className="p-2 text-slate-600">{l.qty || 0} {l.uom || 'Unit'}</td>
                                     <td className="p-2 text-slate-600 font-mono text-right">{l.unitPrice?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                     <td className="p-2 text-right font-medium text-slate-800 font-mono">{l.total?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
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
    </div>
  );
};

const VendorBillForm = ({ editId, onBack }) => {
  const { vendorBills, setVendorBills, companies, manifests, containerBookings, miscChargeTypes, receipts, checkAccess, showMessage, logActivity, currentUser, fclTemplates, currencies, db, doc, setDoc } = useContext(AppContext);
  
  const [formData, setFormData] = useState({
    id: '', vendorId: '', invoiceNo: '', date: new Date().toISOString().split('T')[0], dueDate: '',
    currency: 'MYR', exchangeRate: 1.0, referenceType: 'NONE', referenceId: '', status: 'DRAFT', remarks: ''
  });
  
  const [lines, setLines] = useState([]);
  const [expandedApportionment, setExpandedApportionment] = useState(null);

  const isEditable = formData.status === 'DRAFT';

  useEffect(() => {
    if (editId) {
      const bill = (vendorBills || []).find(b => b.id === editId);
      if (bill) {
        setFormData({ ...bill });
        setLines(bill.lines || []);
      }
    } else {
      setFormData(prev => ({ ...prev, id: `VB-${Math.floor(Date.now() / 1000)}` }));
      setLines([{ id: `vbl-${Date.now()}`, description: '', qty: 1, uom: 'UNIT', unitPrice: 0, amount: 0, sstPercent: 0, sstAmount: 0, total: 0, splitMethod: 'CBM', apportionments: [] }]);
    }
  }, [editId, vendorBills]);

  const distinctBLs = useMemo(() => {
    const bls = new Set();
    (containerBookings || []).forEach(b => { if (b.blNo) bls.add(b.blNo) });
    (manifests || []).forEach(m => { if (m.blNo) bls.add(m.blNo) });
    return Array.from(bls);
  }, [containerBookings, manifests]);

  const availableContainers = useMemo(() => {
     if (formData.referenceType !== 'BL') return [];
     return (manifests || []).filter(m => m.blNo === formData.referenceId || (m.bookingId && containerBookings?.find(b => b.id === (m.bookingId?.split('::')[0] || m.bookingId))?.blNo === formData.referenceId));
  }, [formData.referenceType, formData.referenceId, manifests, containerBookings]);

  const getTargetLabel = (val) => {
     if (!val || val === 'ALL') return 'All Containers (Pool)';
     if (val === 'ALL_EQUAL') return 'All Containers (Split Equally)';
     const ids = val.split(',');
     if (ids.length === 1) {
        const c = availableContainers.find(x => x.id === ids[0]);
        return c ? (c.containerNo || c.manifestNo) : '1 Container';
     }
     return `${ids.length} Containers`;
  };

  // Derive relevant receipts based on reference
  const relevantReceipts = useMemo(() => {
    if (!formData.referenceId || formData.referenceType === 'NONE') return [];

    if (formData.referenceType === 'BL') {
       const mnfs = manifests?.filter(m => m.blNo === formData.referenceId || (m.bookingId && containerBookings?.find(b => b.id === (m.bookingId?.split('::')[0] || m.bookingId))?.blNo === formData.referenceId));
       let rList = [];
       if (mnfs && mnfs.length > 0) {
         mnfs.forEach(mnf => {
           if (mnf.type === 'FCL') {
             const fclReceipts = (receipts || []).filter(r => r.manifestId === mnf.id || (r.bookingId === (mnf.bookingId?.split('::')[0] || mnf.bookingId) && !(manifests || []).some(m => m.type !== 'FCL' && m.lines?.some(l => l.receiptId === r.id))));
             fclReceipts.forEach(fr => {
               if (!rList.find(existing => existing.id === fr.id)) rList.push(fr);
             });
           } else if (mnf.lines && mnf.lines.length > 0) {
             const mReceipts = (receipts || []).filter(r => mnf.lines.some(l => l.receiptId === r.id));
             // Avoid duplicates if a receipt is somehow in multiple manifests
             mReceipts.forEach(mr => {
               if (!rList.find(existing => existing.id === mr.id)) rList.push(mr);
             });
           }
         });
       }
       return rList;
    }
    return [];
  }, [formData.referenceType, formData.referenceId, manifests, receipts, containerBookings]);

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.type === 'number') value = parseFloat(value) || 0;
    
    setFormData(prev => {
      const newForm = { ...prev, [e.target.name]: value };
      
      // Auto-format Vendor Bill ID based on selected Container Booking / Master B/L
      if (e.target.name === 'referenceId' && newForm.referenceType === 'BL' && !editId && value) {
         let cbn = value;
         const relatedBooking = containerBookings?.find(b => b.blNo === value);
         if (relatedBooking) {
             cbn = relatedBooking.id; 
         } else {
             const mnf = manifests?.find(m => m.blNo === value && m.bookingId);
             if (mnf) {
                 cbn = mnf.bookingId.split('::')[0];
             }
         }
         
         const prefix = `VB-${cbn}-`;
         const count = (vendorBills || []).filter(b => b.id.startsWith(prefix)).length;
         newForm.id = `${prefix}${(count + 1).toString().padStart(2, '0')}`;
      }
      
      return newForm;
    });
  };

  const calculateLineTotal = (amount, tax) => {
    return (parseFloat(amount) || 0) + (parseFloat(tax) || 0);
  };

  const handleLineChange = (id, field, value) => {
    setLines(prev => prev.map(l => {
      if (l.id === id) {
        const up = { ...l, [field]: value };
        
        // Auto-calculate relative fields
        if (field === 'qty' || field === 'unitPrice') {
          up.amount = (parseFloat(up.qty) || 0) * (parseFloat(up.unitPrice) || 0);
        }
        
        if (field === 'amount' || field === 'qty' || field === 'unitPrice' || field === 'sstPercent') {
           up.sstAmount = (parseFloat(up.amount) || 0) * ((parseFloat(up.sstPercent) || 0) / 100);
           up.total = (parseFloat(up.amount) || 0) + up.sstAmount;
        }

        if (field === 'sstAmount') {
           up.total = (parseFloat(up.amount) || 0) + (parseFloat(up.sstAmount) || 0);
        }

        return up;
      }
      return l;
    }));
  };

  const computeApportionment = (line) => {
    if (formData.referenceType === 'NONE' || relevantReceipts.length === 0) return line;
    
    const baseTotal = (line.total || 0) * (formData.exchangeRate || 1.0);
    let newApportions = [];

    // Filter receipts and manifests based on targetContainerId
    let lineReceipts = relevantReceipts;
    let lineManifests = [];
    
    if (formData.referenceType === 'BL') {
      const bnfs = manifests?.filter(m => m.blNo === formData.referenceId || (m.bookingId && containerBookings?.find(b => b.id === (m.bookingId?.split('::')[0] || m.bookingId))?.blNo === formData.referenceId)) || [];
      if (line.targetContainerId && line.targetContainerId !== 'ALL' && line.targetContainerId !== 'ALL_EQUAL') {
        const targetIds = line.targetContainerId.split(',');
        const tgt = bnfs.filter(x => targetIds.includes(x.id));
        if (tgt && tgt.length > 0) {
          lineReceipts = (receipts || []).filter(r => tgt.some(t => t.lines?.some(l => l.receiptId === r.id)));
          // also include FCL receipts
          const fclReceipts = (receipts || []).filter(r => tgt.some(t => t.type === 'FCL' && (r.manifestId === t.id || (r.bookingId === (t.bookingId?.split('::')[0] || t.bookingId) && !(manifests || []).some(m => m.type !== 'FCL' && m.lines?.some(l => l.receiptId === r.id))))));
          
          fclReceipts.forEach(fr => {
             if (!lineReceipts.find(existing => existing.id === fr.id)) lineReceipts.push(fr);
          });
          
          lineManifests = tgt;
        } else {
          lineReceipts = [];
        }
      } else {
        lineManifests = bnfs;
      }
    }

    if (lineReceipts.length === 0) return { ...line, apportionments: [] };

    // If "ALL_EQUAL" is selected as target container, we split cost evenly by containers, then by CBM inside the container
    if (line.targetContainerId === 'ALL_EQUAL' && formData.referenceType === 'BL') {
       if (lineManifests.length > 0) {
         const containerCost = baseTotal / lineManifests.length;
         newApportions = [];
         
         lineManifests.forEach(mnf => {
           const cReceipts = lineReceipts.filter(r => mnf.type === 'FCL' ? (r.manifestId === mnf.id || (r.bookingId === (mnf.bookingId?.split('::')[0] || mnf.bookingId) && !(manifests || []).some(m => m.type !== 'FCL' && m.lines?.some(l => l.receiptId === r.id)))) : mnf.lines?.some(l => l.receiptId === r.id));
           if (cReceipts.length === 0) return;
           
           const containerTotalCBM = mnf.type === 'FCL' ? parseFloat(mnf.totalCBM || 0) : ((mnf.lines || []).reduce((sum, ml) => sum + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitCbm || 0)), 0) || 1);
           
           cReceipts.forEach(r => {
             const rcbm = mnf.type === 'FCL' ? parseFloat(mnf.totalCBM || 0) : ((mnf.lines || []).filter(ml => ml.receiptId === r.id).reduce((sum, ml) => sum + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitCbm || 0)), 0));
             const factor = containerTotalCBM > 0 ? (rcbm / containerTotalCBM) : (1 / cReceipts.length);
             newApportions.push({
               receiptId: r.id,
               baseAmount: containerCost * factor,
               factor: factor * (1 / lineManifests.length),
               cbm: rcbm
             });
           });
         });
       }
    } else if (line.splitMethod === 'EQUAL') {
      const splitAmount = baseTotal / lineReceipts.length;
      newApportions = lineReceipts.map(r => ({ receiptId: r.id, baseAmount: splitAmount, factor: 1 / lineReceipts.length }));
    } else if (line.splitMethod === 'CBM' || line.splitMethod === 'WEIGHT') {
      const isCbm = line.splitMethod === 'CBM';

      let totalVal = 0;
      if (lineManifests.length > 0) {
        lineManifests.forEach(mnf => {
          if (mnf.type === 'FCL') {
             totalVal += isCbm ? parseFloat(mnf.totalCBM || 0) : parseFloat(mnf.totalWeight || 0);
          } else {
             totalVal += (mnf.lines || []).reduce((sum, ml) => {
               const unit = isCbm ? parseFloat(ml.unitCbm || 0) : parseFloat(ml.unitWeight || 0);
               return sum + (parseFloat(ml.loadQty || 0) * unit);
             }, 0);
          }
        });
        if (totalVal === 0) totalVal = 1;
      } else {
        totalVal = lineReceipts.reduce((sum, r) => {
          const sidVal = r.lines?.reduce((s, l) => s + (isCbm ? parseFloat(l.cbm || 0) : parseFloat(l.weight || 0)), 0) || 0;
          return sum + sidVal;
        }, 0) || 1;
      }

      newApportions = lineReceipts.map(r => {
        let val = 0;
        if (lineManifests.length > 0) {
          lineManifests.forEach(mnf => {
            if (mnf.type === 'FCL') {
               // If this receipt belongs to this FCL container (or any FCL behavior, usually 1 FCL receipt)
               if (r.manifestId === mnf.id || (r.bookingId === (mnf.bookingId?.split('::')[0] || mnf.bookingId) && !(manifests || []).some(m => m.type !== 'FCL' && m.lines?.some(l => l.receiptId === r.id)))) {
                  val += isCbm ? parseFloat(mnf.totalCBM || 0) : parseFloat(mnf.totalWeight || 0);
               }
            } else {
               val += (mnf.lines || []).filter(ml => ml.receiptId === r.id).reduce((sum, ml) => {
                 const unit = isCbm ? parseFloat(ml.unitCbm || 0) : parseFloat(ml.unitWeight || 0);
                 return sum + (parseFloat(ml.loadQty || 0) * unit);
               }, 0);
            }
          });
        } else {
          val = r.lines?.reduce((s, l) => s + (isCbm ? parseFloat(l.cbm || 0) : parseFloat(l.weight || 0)), 0) || 0;
        }
        
        const factor = val / totalVal;
        const appObj: any = { receiptId: r.id, baseAmount: baseTotal * factor, factor };
        if (isCbm) appObj.cbm = val; else appObj.wgt = val;
        return appObj;
      });
    } else {
      // MANUAL
      newApportions = lineReceipts.map(r => {
         const existing = line.apportionments?.find(a => a.receiptId === r.id);
         return existing || { receiptId: r.id, baseAmount: 0, factor: 0 };
      });
    }
    
    return { ...line, apportionments: newApportions };
  };

  const handleComputeSplit = () => {
    // Recompute all splits based on current data
    setLines(prev => prev.map(computeApportionment));
    showMessage("Apportionment computed successfully.");
  };

  const toggleApportionment = (id) => {
    if (expandedApportionment === id) setExpandedApportionment(null);
    else setExpandedApportionment(id);
  };

  const saveBill = async (post = false) => {
    if (!formData.vendorId) return showMessage("Vendor is required.");
    if (!formData.invoiceNo) return showMessage("Invoice No is required.");
    if (lines.length === 0) return showMessage("At least one line item is required.");
    if (lines.some(l => !l.description)) return showMessage("All line items must have a description.");

    // Check for duplicate invoice number for this vendor
    const isDuplicate = (vendorBills || []).some(b => 
      b.vendorId === formData.vendorId && 
      b.invoiceNo?.trim().toLowerCase() === formData.invoiceNo?.trim().toLowerCase() && 
      b.id !== editId
    );
    if (isDuplicate) return showMessage(`Invoice No. "${formData.invoiceNo}" already exists for this vendor.`);

    // Recalculate totals
    const totalAmt = lines.reduce((s, l) => s + (l.total || 0), 0);
    const totalBase = totalAmt * (formData.exchangeRate || 1.0);

    let targetId = formData.id;
    if (!editId) {
        if (formData.referenceType === 'BOOKING' && formData.referenceId) {
            const base = `VB-${formData.referenceId}`;
            const existing = (vendorBills || []).filter((b: any) => b.id.startsWith(base));
            targetId = `${base}-${String(existing.length + 1).padStart(2, '0')}`;
        } else if (formData.referenceType === 'BL' && formData.referenceId) {
            const base = `VB-${formData.referenceId}`;
            const existing = (vendorBills || []).filter((b: any) => b.id.startsWith(base));
            targetId = `${base}-${String(existing.length + 1).padStart(2, '0')}`;
        } else {
            targetId = `VB-${Math.floor(Date.now() / 1000)}`;
        }
    }
    
    const finalData = {
      ...formData,
      id: targetId,
      totalAmount: totalAmt,
      totalBaseAmount: totalBase,
      lines: lines,
      status: post ? 'APPROVED' : formData.status // Change POSTED to APPROVED so it can be picked up by Accounting integration
    };

    try {
      await setDoc(doc(db, 'vendorBills', targetId), finalData);
      if (editId) {
        logActivity('UPDATE', 'Vendor Bills', targetId, `Updated bill ${targetId}`);
      } else {
        logActivity('CREATE', 'Vendor Bills', targetId, `Created bill ${targetId}`);
      }
      if (post) logActivity('UPDATE', 'Vendor Bills', targetId, `Approved bill ${targetId}`);

      showMessage(`Bill saved ${post ? 'and approved ' : ''}successfully.`);
      onBack();
    } catch(e) {
      showMessage("Error saving vendor bill.");
    }
  };

  const unapproveBill = async () => {
    try {
      const finalData = { ...formData, status: 'DRAFT' };
      await setDoc(doc(db, 'vendorBills', formData.id), finalData);
      logActivity('UPDATE', 'Vendor Bills', formData.id, `Unapproved bill ${formData.id}`);
      setFormData(finalData);
      showMessage("Bill reverted to DRAFT status.");
    } catch(e) {
      showMessage("Error unapproving bill.");
    }
  };

  const totalInvAmt = lines.reduce((s, l) => s + (l.total || 0), 0);
  const totalSubtotal = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const totalSst = lines.reduce((s, l) => s + (l.sstAmount || 0), 0);
  const totalBaseAmt = totalInvAmt * (formData.exchangeRate || 1);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">{editId ? (isEditable ? 'Edit Vendor Bill' : 'View Vendor Bill') : 'New Vendor Bill'}</h2>
          <span className={`px-2 py-1 rounded text-xs font-bold ${formData.status === 'DRAFT' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700'}`}>{formData.status}</span>
          <span className="text-xs text-slate-400 font-mono tracking-tighter">ID: {formData.id}</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Header Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vendor (Creditor) <span className="text-red-500">*</span></label>
            <select name="vendorId" disabled={!isEditable} value={formData.vendorId} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md">
              <option value="">-- Select Vendor --</option>
              {(companies || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Invoice No. <span className="text-red-500">*</span></label>
            <input type="text" disabled={!isEditable} name="invoiceNo" value={formData.invoiceNo} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <div className="flex space-x-2">
               <select name="currency" disabled={!isEditable} value={formData.currency} onChange={(e) => {
                 const currRate = currencies?.find(c => c.id === e.target.value)?.rate || 1.0;
                 setFormData(prev => ({ ...prev, currency: e.target.value, exchangeRate: currRate }));
               }} className="w-1/2 p-2 border border-slate-300 rounded-md font-bold">
                 <option value="MYR">MYR</option>
                 {(currencies || []).map(c => c.id !== 'MYR' && <option key={c.id} value={c.id}>{c.id}</option>)}
               </select>
               <div className="w-1/2 relative">
                 <span className="absolute left-2 top-2 text-slate-400 text-sm">Rate</span>
                 <input type="number" step="0.0001" disabled={!isEditable} name="exchangeRate" value={formData.exchangeRate} onChange={handleChange} className="w-full p-2 pl-10 border border-slate-300 rounded-md text-sm" title="Rate to MYR Base" />
               </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date</label>
            <input type="date" disabled={!isEditable} name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
            <input type="date" disabled={!isEditable} name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <input type="text" disabled={!isEditable} name="remarks" value={formData.remarks || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 bg-sky-50/50">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center"><Activity className="w-5 h-5 mr-2 text-sky-600" /> Operational Linking (Cost Apportionment Basis)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Link To (Reference Type)</label>
            <select name="referenceType" disabled={!isEditable} value={formData.referenceType} onChange={handleChange} className="w-full p-2 border border-sky-300 rounded-md bg-white">
              <option value="NONE">No Linking (General Overhead)</option>
              <option value="BL">Master B/L</option>
            </select>
          </div>
          {formData.referenceType !== 'NONE' && (
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Master B/L No.</label>
                {formData.referenceType === 'BL' && (
                   <select name="referenceId" disabled={!isEditable} value={formData.referenceId} onChange={handleChange} className="w-full p-2 border border-sky-300 rounded-md bg-white">
                      <option value="">-- Select Master B/L --</option>
                      {distinctBLs.map(bl => <option key={bl} value={bl}>{bl}</option>)}
                   </select>
                )}
             </div>
          )}
        </div>
        {formData.referenceType !== 'NONE' && formData.referenceId && (
           <div className="mt-4 p-3 bg-white border border-sky-200 rounded-lg text-sm text-sky-800 flex justify-between items-center">
             <span>Found <strong>{relevantReceipts.length}</strong> related shipments for apportionment.</span>
             {isEditable && <button onClick={handleComputeSplit} className="px-3 py-1.5 bg-sky-600 text-white rounded font-medium hover:bg-sky-700 transition flex items-center"><Calculator className="w-4 h-4 mr-1" /> Recompute Splits</button>}
           </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-lg font-bold text-slate-800">Line Items</h3>
        </div>
        
        <div className="space-y-4">
          {lines.map((line, idx) => (
            <div key={line.id} className="border border-slate-200 rounded-lg relative focus-within:z-50 hover:z-40">
              <div className="p-4 bg-slate-50 space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Description <span className="text-red-500">*</span></label>
                    <input type="text" disabled={!isEditable} value={line.description} onChange={(e) => handleLineChange(line.id, 'description', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm font-medium" placeholder="E.g. Haulage Fee, Documentation..." />
                  </div>
                  {isEditable && (
                    <button onClick={() => setLines(lines.filter(l => l.id !== line.id))} className="p-2 text-red-500 hover:bg-red-50 rounded bg-white border border-slate-200">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Qty</label>
                    <input type="number" step="0.01" disabled={!isEditable} value={line.qty || 0} onChange={(e) => handleLineChange(line.id, 'qty', parseFloat(e.target.value))} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">UOM</label>
                    <select disabled={!isEditable} value={line.uom || 'UNIT'} onChange={(e) => handleLineChange(line.id, 'uom', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white">
                      <option value="UNIT">UNIT</option>
                      <option value="CBM">CBM</option>
                      <option value="KG">KG</option>
                      <option value="TRIP">TRIP</option>
                      <option value="MONTH">MONTH</option>
                      <option value="SQFT">SQFT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit Price</label>
                    <input type="number" step="0.0001" disabled={!isEditable} value={line.unitPrice || 0} onChange={(e) => handleLineChange(line.id, 'unitPrice', parseFloat(e.target.value))} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Net Amount</label>
                    <input type="number" step="0.01" disabled={!isEditable} value={line.amount || 0} onChange={(e) => handleLineChange(line.id, 'amount', parseFloat(e.target.value))} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SST %</label>
                    <select disabled={!isEditable} value={line.sstPercent || 0} onChange={(e) => handleLineChange(line.id, 'sstPercent', parseFloat(e.target.value))} className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white">
                      <option value="0">0%</option>
                      <option value="6">6%</option>
                      <option value="8">8%</option>
                      <option value="10">10%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SST Amt</label>
                    <input type="number" step="0.01" disabled={!isEditable} value={line.sstAmount || 0} onChange={(e) => handleLineChange(line.id, 'sstAmount', parseFloat(e.target.value))} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 text-right">Total Line</label>
                    <div className="p-2 bg-slate-200 rounded-md text-sm font-bold border border-slate-300 text-slate-700 text-right h-[38px] flex items-center justify-end">
                      {line.total?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-white border-t border-slate-200 flex flex-col space-y-3">
                 <div className="flex justify-between items-center">
                    <div className="flex flex-wrap items-center gap-4">
                       {formData.referenceType === 'BL' && (
                         <div className="flex items-center space-x-2">
                           <span className="text-sm font-semibold text-slate-700">Target Container:</span>
                           <details className="relative group/dropdown">
                               <summary className="p-1.5 border border-slate-300 rounded text-sm bg-slate-50 min-w-[200px] cursor-pointer flex justify-between items-center list-none outline-none">
                                   <span className="truncate max-w-[250px]">{getTargetLabel(line.targetContainerId)}</span>
                                   <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                               </summary>
                               <div className="absolute z-50 left-0 top-full mt-1 w-80 bg-white shadow-xl border border-slate-200 rounded-lg py-1 max-h-[300px] overflow-y-auto">
                                  <label className="flex items-center px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                                      <input type="radio" 
                                             checked={!line.targetContainerId || line.targetContainerId === 'ALL'} 
                                             onChange={() => handleLineChange(line.id, 'targetContainerId', 'ALL')} 
                                             className="mr-2 border-slate-300 text-indigo-600 focus:ring-indigo-600 focus:ring-0"
                                             disabled={!isEditable} />
                                      <span className="font-medium text-slate-800">All Containers (Pool CBM/Wgt)</span>
                                  </label>
                                  <label className="flex items-center px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                                      <input type="radio" 
                                             checked={line.targetContainerId === 'ALL_EQUAL'} 
                                             onChange={() => handleLineChange(line.id, 'targetContainerId', 'ALL_EQUAL')} 
                                             className="mr-2 border-slate-300 text-indigo-600 focus:ring-indigo-600 focus:ring-0"
                                             disabled={!isEditable} />
                                      <span className="font-medium text-slate-800">All Containers (Split Equally)</span>
                                  </label>
                                  
                                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100 bg-slate-50/50 uppercase tracking-wider">Specific Containers</div>
                                  {availableContainers.map(m => {
                                      const selectedIds = (!line.targetContainerId || line.targetContainerId === 'ALL' || line.targetContainerId === 'ALL_EQUAL') ? [] : line.targetContainerId.split(',');
                                      const isChecked = selectedIds.includes(m.id);
                                      
                                      return (
                                        <label key={m.id} className="flex items-start px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                                           <input type="checkbox" 
                                                  disabled={!isEditable}
                                                  checked={isChecked} 
                                                  onChange={(e) => {
                                                      let newArr = [...selectedIds];
                                                      if (e.target.checked) newArr.push(m.id);
                                                      else newArr = newArr.filter(id => id !== m.id);
                                                      
                                                      if (newArr.length === 0) handleLineChange(line.id, 'targetContainerId', 'ALL');
                                                      else handleLineChange(line.id, 'targetContainerId', newArr.join(','));
                                                  }} 
                                                  className="mr-3 mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 focus:ring-0" />
                                           <div className="flex flex-col">
                                              <span className="font-medium text-slate-700">{m.containerNo || m.manifestNo} <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${m.type === 'FCL' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>{m.type || 'LCL'}</span></span>
                                              {m.type === 'FCL' && m.fclCustomer && <span className="text-[10px] text-slate-500 mt-0.5">{m.fclCustomer}</span>}
                                           </div>
                                        </label>
                                      );
                                  })}
                               </div>
                           </details>
                         </div>
                       )}
                       <div className="flex items-center space-x-2">
                         <span className="text-sm font-semibold text-slate-700">Apportionment Method:</span>
                         <select disabled={!isEditable || formData.referenceType === 'NONE' || line.targetContainerId === 'ALL_EQUAL'} value={line.splitMethod} onChange={(e) => { handleLineChange(line.id, 'splitMethod', e.target.value); }} className="p-1 border border-slate-300 rounded text-sm bg-slate-50">
                           <option value="CBM">By CBM</option>
                           <option value="WEIGHT">By Weight</option>
                           <option value="EQUAL">Equally</option>
                           <option value="MANUAL">Manual</option>
                         </select>
                       </div>
                    </div>
                    {line.apportionments?.length > 0 && (
                      <button onClick={() => toggleApportionment(line.id)} className="text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded flex items-center font-medium">
                        {expandedApportionment === line.id ? <ChevronDown className="w-4 h-4 mr-1"/> : <ChevronRight className="w-4 h-4 mr-1"/>}
                        {expandedApportionment === line.id ? 'Hide Splits' : `View Splits (${line.apportionments.length} shipments)`}
                      </button>
                    )}
                 </div>
                 
                 {expandedApportionment === line.id && line.apportionments?.length > 0 && (
                   <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-slate-300 text-slate-600">
                            <th className="pb-2 font-semibold font-mono">Shipment (SID)</th>
                            <th className="pb-2 font-semibold">Consignee</th>
                            <th className="pb-2 font-semibold">Split Factor</th>
                            <th className="pb-2 font-semibold text-right">Apportioned Amt (MYR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {line.apportionments.map(app => {
                            const r = (receipts || []).find(x => x.id === app.receiptId);
                            return (
                              <tr key={app.receiptId}>
                                <td className="py-2 text-indigo-600 font-mono font-medium">{app.receiptId}</td>
                                <td className="py-2 truncate max-w-[200px]" title={r?.consignee}>{r?.consignee || '-'}</td>
                                <td className="py-2 text-slate-500">{(app.factor * 100).toFixed(1)}% {line.splitMethod === 'CBM' ? `(${app.cbm?.toFixed(2)} cbm)` : line.splitMethod === 'WEIGHT' ? `(${app.wgt?.toFixed(2)} kg)` : ''}</td>
                                <td className="py-2 text-right">
                                  {isEditable && line.splitMethod === 'MANUAL' ? (
                                    <input type="number" step="0.01" value={app.baseAmount} onChange={(e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      const newApports = line.apportionments.map(a => a.receiptId === app.receiptId ? {...a, baseAmount: newVal} : a);
                                      handleLineChange(line.id, 'apportionments', newApports);
                                    }} className="w-32 p-1 border border-slate-300 rounded text-right text-sm float-right" />
                                  ) : (
                                    <span className="font-medium text-slate-800">{app.baseAmount?.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-300 text-slate-800 font-bold">
                            <td colSpan={3} className="pt-2 text-right">Total Apportioned:</td>
                            <td className="pt-2 text-right text-emerald-600">MYR {line.apportionments.reduce((s,a) => s + (a.baseAmount || 0), 0).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                          </tr>
                        </tfoot>
                      </table>
                   </div>
                 )}
              </div>
            </div>
          ))}
        </div>
        {isEditable && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setLines([...lines, { id: `vbl-${Date.now()}`, description: '', qty: 1, uom: 'UNIT', unitPrice: 0, amount: 0, sstPercent: 0, sstAmount: 0, total: 0, splitMethod: 'CBM', apportionments: [] }])} className="flex items-center space-x-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 font-medium transition">
              <Plus className="w-4 h-4" /> <span>Add Line Item</span>
            </button>
            <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 rounded-lg pr-2 text-sm text-indigo-700 font-medium">
               <span className="pl-3 py-1.5 border-r border-indigo-200 flex items-center space-x-1"><FileText className="w-4 h-4" /> <span>Draw Cost</span></span>
               <select 
                   className="p-1 text-sm border-0 bg-transparent focus:ring-0 text-indigo-800 font-medium cursor-pointer"
                   onChange={(e) => {
                       const t = fclTemplates?.find(x => x.id === e.target.value);
                       if (t && t.items) {
                           const newLines = t.items.filter(item => !item.vendorId || item.vendorId === formData.vendorId).map((item, idx) => ({
                               id: `vbl-${Date.now()}-${idx}`,
                               description: item.description || '',
                               amount: parseFloat(item.cost) || 0,
                               taxAmount: 0,
                               total: parseFloat(item.cost) || 0,
                               splitMethod: 'CBM',
                               apportionments: []
                           }));
                           const cleanLines = lines.length === 1 && lines[0].description === '' && lines[0].amount === 0 ? [] : lines;
                           setLines([...cleanLines, ...newLines]);
                       }
                       e.target.value = ""; // reset
                   }}
               >
                   <option value="">-- Select Template --</option>
                   {(fclTemplates || []).map(t => (
                       <option key={t.id} value={t.id}>{t.name} ({t.pol} to {t.pod})</option>
                   ))}
               </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex flex-col md:flex-row justify-between items-center text-indigo-900 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-indigo-100/50 pointer-events-none"></div>
        <div className="relative z-10 w-full md:w-2/3 mb-4 md:mb-0">
          <p className="text-sm font-medium text-indigo-700 mb-2 uppercase tracking-wider">Vendor Bill Summary ({formData.currency})</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-indigo-500 font-bold uppercase">Subtotal</p>
              <p className="text-xl font-bold">{totalSubtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div>
              <p className="text-xs text-indigo-500 font-bold uppercase">Total SST</p>
              <p className="text-xl font-bold text-slate-600">{totalSst.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <div>
              <p className="text-xs text-indigo-500 font-bold uppercase">Grand Total</p>
              <div className="flex items-end space-x-2">
                <p className="text-3xl font-black text-indigo-900">{totalInvAmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                {formData.currency !== 'MYR' && (
                  <span className="text-xs text-indigo-600 pb-1 font-bold">~ MYR {totalBaseAmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {isEditable && (
          <div className="relative z-10 flex space-x-3 w-full md:w-auto">
            <button onClick={() => saveBill()} className="flex-1 md:flex-none px-6 py-3 border border-indigo-300 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition shadow-sm bg-white">Save Draft</button>
            <button onClick={() => saveBill(true)} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-lg flex items-center justify-center space-x-2 hover:bg-indigo-700 transition shadow-md font-medium"><CheckCircle className="w-5 h-5 mr-1" /> Approve Bill & Apportion</button>
          </div>
        )}
        {formData.status === 'APPROVED' && (
          <div className="relative z-10 flex space-x-3 w-full md:w-auto">
            <button onClick={unapproveBill} className="flex-1 md:flex-none px-6 py-3 border border-amber-300 text-amber-700 rounded-lg font-medium hover:bg-amber-50 transition shadow-sm bg-white flex items-center justify-center">
               <ArrowLeft className="w-5 h-5 mr-2" /> Unapprove (Revert to Draft)
            </button>
            <div className="bg-white p-3 rounded-lg border border-indigo-100 text-indigo-600 text-sm font-medium flex items-center px-6">
               <CheckCircle className="w-5 h-5 mr-2 text-indigo-600" /> Bill is Approved & Locked
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
