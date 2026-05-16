import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, FileText, CheckCircle, PackagePlus, List, Ship, MapPin } from 'lucide-react';

export const CommercialInvoiceForm = ({ AppContext }) => {
  const {
    checkAccess, editCommercialInvoiceId, commercialInvoices, 
    setEditCommercialInvoiceId, setActiveTab, showMessage, manifests, generateCommercialInvoiceNo,
    commercialInvoiceCountersMap, companies, receipts, logActivity, ActivityHistory,
    db, doc, setDoc, handleFirestoreError, OperationType, formatDate
  } = React.useContext(AppContext);

  if (!checkAccess('commercial_invoices', 'create') && !checkAccess('commercial_invoices', 'edit')) {
    return <div className="p-8 text-center text-slate-500">You do not have permission to manage commercial invoices.</div>;
  }

  const [formData, setFormData] = useState({
    id: '',
    manifestIds: [],
    hblNo: '',
    bookingId: '',
    declCompanyId: '',
    podConsigneeId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    currency: 'MYR',
    incoterm: 'DAP',
    vessel: '',
    voyage: '',
    pol: '',
    pod: '',
    poNumber: '',
    lines: []
  });

  const [selectingManifests, setSelectingManifests] = useState(!editCommercialInvoiceId);
  const [selectedManifestIds, setSelectedManifestIds] = useState([]);
  const [showMergePrompt, setShowMergePrompt] = useState(false);

  useEffect(() => {
    if (editCommercialInvoiceId) {
      const existing = (commercialInvoices || []).find(ci => ci.id === editCommercialInvoiceId);
      if (existing) {
        setFormData({ ...existing, manifestIds: existing.manifestIds || [existing.receiptId].filter(Boolean) });
        setSelectingManifests(false);
      }
    } else {
      setSelectingManifests(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCommercialInvoiceId]);

  const usedManifestIds = new Set();
  (commercialInvoices || []).forEach(ci => {
    if (ci.id !== editCommercialInvoiceId && ci.manifestIds) {
      ci.manifestIds.forEach(id => usedManifestIds.add(id));
    }
  });
  const availableManifests = (manifests || []).filter(m => !usedManifestIds.has(m.id));

  const toggleManifestSelection = (mId) => {
    const manifestToToggle = availableManifests.find(m => m.id === mId);
    if (!manifestToToggle) return;

    if (selectedManifestIds.includes(mId)) {
      setSelectedManifestIds(selectedManifestIds.filter(id => id !== mId));
    } else {
      // Validate POL, POD, BL match if we already have selected manifests
      if (selectedManifestIds.length > 0) {
        const firstM = availableManifests.find(m => m.id === selectedManifestIds[0]);
        if (firstM) {
          if (firstM.blNo !== manifestToToggle.blNo || firstM.pol !== manifestToToggle.pol || firstM.pod !== manifestToToggle.pod) {
            return showMessage("Selected manifests must have the same POL, POD and Master BL Number.", "error");
          }
        }
      }
      setSelectedManifestIds([...selectedManifestIds, mId]);
    }
  };

  const handleSelectAll = () => {
    if (availableManifests.length === 0) return;
    
    let baseM = null;
    if (selectedManifestIds.length > 0) {
      baseM = availableManifests.find(m => m.id === selectedManifestIds[0]);
    } else {
      baseM = availableManifests[0];
    }
    
    if (!baseM) return;

    const matchingManifestIds = availableManifests
      .filter(m => m.pol === baseM.pol && m.pod === baseM.pod && m.blNo === baseM.blNo)
      .map(m => m.id);

    setSelectedManifestIds(matchingManifestIds);
    if (matchingManifestIds.length === availableManifests.length) {
       showMessage("All manifests matched the criteria and were selected.", "success");
    } else {
       showMessage(`Selected ${matchingManifestIds.length} manifests matching POL, POD and B/L No.`, "success");
    }
  };

  const handleSelectManifests = () => {
    if (selectedManifestIds.length === 0) {
      showMessage("Please select at least one manifest.");
      return;
    }

    const selectedManifestsData = availableManifests.filter(m => selectedManifestIds.includes(m.id));
    
    // Aggregating lines
    let newLines = [];
    selectedManifestsData.forEach(m => {
      if (m.type === 'FCL') {
        const totalCbm = parseFloat(m.totalCBM) || 0;
        const cbmPerProduct = m.fclProducts && m.fclProducts.length > 0 ? (totalCbm / m.fclProducts.length) : 0;
        
        (m.fclProducts || []).forEach((p, idx) => {
          newLines.push({
            manifestId: m.id,
            originalLineId: idx, // Not tied to receipt
            receiptId: 'FCL-' + m.id,
            type: 'FCL',
            product: p.description,
            uom: p.uom || 'Carton',
            qty: p.qty,
            hsCode: p.hsCode || '',
            weight: parseFloat(p.weight) || 0,
            cbm: parseFloat(p.cbm) || cbmPerProduct,
            totalValue: 0,
            customer: m.fclCustomer || '',
            consignee: m.consignee || '',
            consignor: m.consignor || '',
            shipperDoNo: ''
          });
        });
      } else {
        (m.lines || []).forEach(l => {
          const rcpt = (receipts || []).find(r => r.id === l.receiptId) || {};
          newLines.push({
            manifestId: m.id,
            originalLineId: l.originalLineId,
            receiptId: l.receiptId,
            type: 'LCL',
            product: l.product,
            uom: l.uom,
            qty: l.loadQty,
            hsCode: '',
            weight: (l.loadQty || 0) * (l.unitWeight || 0),
            cbm: (l.loadQty || 0) * (l.unitCbm || 0),
            totalValue: 0,
            customer: l.customer || rcpt.customer || '',
            consignee: rcpt.consignee || '',
            consignor: l.consignor || rcpt.consignor || '',
            shipperDoNo: rcpt.shipperDoNo || ''
          });
        });
      }
    });
    
    const firstM = selectedManifestsData[0] || {};
    
    setFormData({
      ...formData,
      manifestIds: selectedManifestIds,
      hblNo: firstM.blNo || '',
      bookingId: firstM.bookingId || '',
      vessel: firstM.vessel || '',
      voyage: firstM.voyage || '',
      pol: firstM.pol || '',
      pod: firstM.pod || '',
      lines: newLines
    });
    setSelectingManifests(false);
  };


  const updateLine = (idx, field, val) => {
    const newLines = [...formData.lines];
    newLines[idx][field] = val;
    setFormData({ ...formData, lines: newLines });
  };

  const declaredCompanies = (companies || []).filter(c => c.isDeclaredCompany);
  const consigneeCompanies = (companies || []).filter(c => c.isConsignee || c.isDeclaredCompany);

  const confirmAndSave = () => {
    // Actually do the merge
    mergeByHsCode(true); // pass true to indicate it's final save
  };

  const executeSave = (mergedLines) => {
    const totalValue = mergedLines.reduce((sum, line) => sum + (parseFloat(line.totalValue) || 0), 0);

    const isNew = !formData.id;
    let finalId = formData.id;

    if (isNew) {
      finalId = generateCommercialInvoiceNo(formData.invoiceDate, formData.declCompanyId, commercialInvoiceCountersMap);
      
      const yy = String(new Date(formData.invoiceDate).getFullYear()).slice(-2);
      const mm = String(new Date(formData.invoiceDate).getMonth() + 1).padStart(2, '0');
      const comp = (companies || []).find(c => c.id === formData.declCompanyId);
      let routeStr = comp && comp.shortform ? comp.shortform : formData.declCompanyId.substring(0, 4);
      routeStr = routeStr.replace(/[^A-Z0-9]/ig, '').toUpperCase();
      const key = `${yy}${mm}-${routeStr}`;
      
      setDoc(doc(db, 'system', 'counters'), { 
        commercialInvoiceCountersMap: { ...commercialInvoiceCountersMap, [key]: (commercialInvoiceCountersMap[key] || 0) + 1 }
      }, { merge: true });
    }

    const newInvoice = {
      ...formData,
      type: (formData.manifestIds || []).some(mId => {
        const m = (manifests || []).find(x => x.id === mId);
        return m && m.type === 'FCL';
      }) ? 'FCL' : 'LCL',
      fclCustomer: (formData.manifestIds || []).reduce((acc, mId) => {
        if (acc) return acc;
        const m = (manifests || []).find(x => x.id === mId);
        return (m && m.type === 'FCL') ? m.fclCustomer : '';
      }, ''),
      fclConsignee: (formData.manifestIds || []).reduce((acc, mId) => {
        if (acc) return acc;
        const m = (manifests || []).find(x => x.id === mId);
        return (m && m.type === 'FCL') ? m.consignee : '';
      }, ''),
      fclConsignor: (formData.manifestIds || []).reduce((acc, mId) => {
        if (acc) return acc;
        const m = (manifests || []).find(x => x.id === mId);
        return (m && m.type === 'FCL') ? m.consignor : '';
      }, ''),
      lines: mergedLines,
      id: finalId,
      totalValue,
      createdAt: isNew ? new Date().toISOString() : (formData.createdAt || new Date().toISOString()),
      updatedAt: new Date().toISOString()
    };

    setDoc(doc(db, 'commercialInvoices', finalId), newInvoice)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `commercialInvoices/${finalId}`));

    if (isNew) {
      logActivity('CREATE', 'Commercial Invoices', finalId, 'Created new commercial invoice');
      showMessage(`Commercial Invoice ${finalId} created successfully.`, 'success');
    } else {
      logActivity('UPDATE', 'Commercial Invoices', finalId, 'Updated commercial invoice');
      showMessage(`Commercial Invoice ${finalId} updated successfully.`, 'success');
    }

    setEditCommercialInvoiceId(null);
    setActiveTab('commercial-invoices-list');
  };

  const saveInvoice = () => {
    if (!formData.declCompanyId) return showMessage('Declared Company is required');
    if (!formData.manifestIds || formData.manifestIds.length === 0) return showMessage('Associated Manifest is required');
    if (formData.lines.length === 0) return showMessage('Must have at least one line');
    
    // Check if any HS code is empty
    if (formData.lines.some(l => !(l.hsCode || '').trim())) {
      return showMessage("All items must have an HS Code assigned before saving.");
    }

    mergeByHsCode(true); // Automatically merge and save
  };

  const mergeByHsCode = (isSaving = false) => {
    const groups: { [key: string]: any } = {};
    formData.lines.forEach(l => {
      const code = (l.hsCode || '').trim();
      if (!groups[code]) {
        groups[code] = {
           product: l.product,
           hsCode: code,
           uom: l.uom || 'Unit',
           qty: 0,
           weight: 0,
           cbm: 0,
           totalValue: 0,
           manifestId: 'MERGED', // we lose individual traceability to simplify
           receiptId: 'MERGED',
           type: l.type,
           customer: l.customer,
           consignee: l.consignee,
           consignor: l.consignor,
           shipperDoNo: l.shipperDoNo
        };
      } else {
        if (groups[code].type !== l.type && l.type) if(!groups[code].type?.includes(l.type)) groups[code].type += `, ${l.type}`;
        if (groups[code].uom !== l.uom) groups[code].uom = 'Unit'; // fallback if mixed UOM
        if (groups[code].product !== l.product) groups[code].product += `, ${l.product}`;
        if (groups[code].customer !== l.customer) groups[code].customer += `, ${l.customer || ''}`;
        if (groups[code].consignee !== l.consignee) groups[code].consignee += `, ${l.consignee || ''}`;
        if (groups[code].consignor !== l.consignor) groups[code].consignor += `, ${l.consignor || ''}`;
        if (groups[code].shipperDoNo !== l.shipperDoNo) groups[code].shipperDoNo += `, ${l.shipperDoNo || ''}`;
      }
      groups[code].qty += (parseFloat(l.qty) || 0);
      groups[code].weight += (parseFloat(l.weight) || 0);
      groups[code].cbm += (parseFloat(l.cbm) || 0);
      groups[code].totalValue += (parseFloat(l.totalValue) || 0);
    });

    const mergedLines = Object.values(groups).map(g => ({
       manifestId: g.manifestId,
       receiptId: g.receiptId,
       product: Array.from(new Set(g.product.split(', ').filter(Boolean))).join(', '),
       customer: Array.from(new Set((g.customer || '').split(', ').filter(Boolean))).join(', '),
       consignee: Array.from(new Set((g.consignee || '').split(', ').filter(Boolean))).join(', '),
       consignor: Array.from(new Set((g.consignor || '').split(', ').filter(Boolean))).join(', '),
       shipperDoNo: Array.from(new Set((g.shipperDoNo || '').split(', ').filter(Boolean))).join(', '),
       uom: g.uom,
       qty: Math.round(g.qty * 100) / 100,
       hsCode: g.hsCode,
       weight: Math.round(g.weight * 100) / 100,
       cbm: Math.round(g.cbm * 1000) / 1000,
       totalValue: Math.round(g.totalValue * 100) / 100,
    }));
    
    setFormData({ ...formData, lines: mergedLines });
    if (isSaving === true) {
      executeSave(mergedLines);
    } else {
      showMessage('Lines merged by HS Code.', 'success');
    }
  };

  if (selectingManifests) {
    const unselectedCount = availableManifests.filter(m => !selectedManifestIds.includes(m.id)).length;

    return (
      <div className="max-w-5xl mx-auto space-y-6 flex flex-col h-full bg-slate-50/50 p-2 rounded-xl">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">Select Manifests for CIPL</h2>
            <p className="text-slate-500 text-sm mt-1">Combine multiple containers / manifests into one Commercial Invoice.</p>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={handleSelectAll} className="px-4 py-2 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg font-medium hover:bg-blue-100 transition shadow-sm flex items-center"><List className="w-4 h-4 mr-1"/> Select All Matching</button>
             <button onClick={() => { setEditCommercialInvoiceId(null); setActiveTab('commercial-invoices-list'); }} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition">Cancel</button>
             <button onClick={handleSelectManifests} className="px-6 py-2 bg-indigo-600 text-white rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition shadow-sm font-medium"><CheckCircle className="w-5 h-5 mr-1" /> Use Selected</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 w-12 text-center text-sm font-semibold text-slate-700"></th>
                <th className="p-4 text-sm font-semibold text-slate-700">Manifest No</th>
                <th className="p-4 text-sm font-semibold text-slate-700">Vessel & Voyage</th>
                <th className="p-4 text-sm font-semibold text-slate-700">Route</th>
                <th className="p-4 text-sm font-semibold text-slate-700">Containers / BL</th>
                <th className="p-4 text-sm font-semibold text-slate-700">Cargo Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {availableManifests.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => toggleManifestSelection(m.id)}>
                  <td className="p-4 text-center">
                    <input type="checkbox" checked={selectedManifestIds.includes(m.id)} readOnly className="w-4 h-4 text-indigo-600 rounded" />
                  </td>
                  <td className="p-4 font-medium text-slate-800">{m.id}<br/><span className="text-xs text-slate-500 font-normal">{formatDate(m.date)}</span></td>
                  <td className="p-4 text-sm text-slate-600">{(m.vessel || m.voyage) ? `${m.vessel} ${m.voyage}` : '-'}</td>
                  <td className="p-4 text-sm text-slate-600">{m.pol} <span className="text-slate-400 mx-1">to</span> {m.pod}</td>
                  <td className="p-4 text-sm text-slate-600">Cnt: <span className="font-semibold">{m.containerNo || '-'}</span><br/>B/L: <span className="font-semibold">{m.blNo || '-'}</span></td>
                  <td className="p-4 text-sm text-slate-600">{m.type === 'FCL' ? (m.fclProducts || []).length : (m.lines || []).length} items</td>
                </tr>
              ))}
              {availableManifests.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No manifests available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{formData.id ? `Edit Invoice: ${formData.id}` : 'New Commercial Invoice'}</h2>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm text-slate-500">Manifests:</span>
            {formData.manifestIds.map(mId => (
               <span key={mId} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{mId}</span>
            ))}
          </div>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => { setEditCommercialInvoiceId(null); setActiveTab('commercial-invoices-list'); }} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-500"/> Invoice Info</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Declared Company (Letterhead) <span className="text-red-500">*</span></label>
            <select value={formData.declCompanyId} onChange={e => setFormData({...formData, declCompanyId: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md bg-slate-50">
              <option value="">-- Select Declared Company --</option>
              {declaredCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">POD Consignee (Declaration Purpose)</label>
            <select value={formData.podConsigneeId} onChange={e => setFormData({...formData, podConsigneeId: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md bg-slate-50">
              <option value="">-- Select POD Consignee --</option>
              {consigneeCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date</label>
              <input type="date" value={formData.invoiceDate} onChange={e => setFormData({...formData, invoiceDate: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Number</label>
              <input type="text" value={formData.poNumber} onChange={e => setFormData({...formData, poNumber: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md">
                <option value="USD">USD - US Dollar</option>
                <option value="MYR">MYR - Malaysian Ringgit</option>
                <option value="EUR">EUR - Euro</option>
                <option value="SGD">SGD - Singapore Dollar</option>
                <option value="CNY">CNY - Chinese Yuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Incoterms</label>
              <input type="text" value={formData.incoterm} onChange={e => setFormData({...formData, incoterm: e.target.value})} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. FOB, CIF" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center"><Ship className="w-5 h-5 mr-2 text-teal-500"/> Shipping Details</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">B/L No.</label>
              <input type="text" value={formData.hblNo} disabled className="w-full p-2 border border-slate-200 rounded-md bg-slate-100/50 text-slate-500 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Booking Number</label>
              <input type="text" value={formData.bookingId || ''} disabled className="w-full p-2 border border-slate-200 rounded-md bg-slate-100/50 text-slate-500 font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">POL</label>
              <input type="text" value={formData.pol} disabled className="w-full p-2 border border-slate-200 rounded-md bg-slate-100/50 text-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">POD</label>
              <input type="text" value={formData.pod} disabled className="w-full p-2 border border-slate-200 rounded-md bg-slate-100/50 text-slate-500" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vessel</label>
              <input type="text" value={formData.vessel} disabled className="w-full p-2 border border-slate-200 rounded-md bg-slate-100/50 text-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voyage</label>
              <input type="text" value={formData.voyage} disabled className="w-full p-2 border border-slate-200 rounded-md bg-slate-100/50 text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
         <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
           <h3 className="text-lg font-bold text-slate-800 flex items-center"><List className="w-5 h-5 mr-2 text-indigo-500"/> Item Declarations</h3>
           <button onClick={mergeByHsCode} className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 flex items-center transition">
             Merge by HS Code
           </button>
         </div>
         
         <div className="overflow-x-auto">
           <table className="w-full text-left min-w-[1200px]">
             <thead className="bg-slate-50 border-y border-slate-200 text-sm">
               <tr>
                 <th className="p-3 font-semibold text-slate-700 w-1/6">Parties & Ref</th>
                 <th className="p-3 font-semibold text-slate-700 w-1/4">Product Description</th>
                 <th className="p-3 font-semibold text-slate-700 text-center w-24">HS Code</th>
                 <th className="p-3 font-semibold text-slate-700 text-right w-24">Qty</th>
                 <th className="p-3 font-semibold text-slate-700 text-center w-20">UoM</th>
                 <th className="p-3 font-semibold text-slate-700 text-right w-24">Wgt (kg)</th>
                 <th className="p-3 font-semibold text-slate-700 text-right w-24">CBM</th>
                 <th className="p-3 font-semibold text-slate-700 text-right w-32">Total Val ({formData.currency})</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {formData.lines.map((line, idx) => {
                 return (
                   <tr key={idx} className="hover:bg-slate-50">
                     <td className="p-2 text-xs text-slate-600 leading-relaxed border-r border-slate-100">
                        {line.type && <div className="mb-1"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${line.type.includes('FCL') ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>{line.type}</span></div>}
                        <div><strong className="text-slate-700 mr-1">SID:</strong>{line.receiptId !== 'MERGED' ? line.receiptId : 'MERGED'}</div>
                        <div><strong className="text-slate-700 mr-1">Customer:</strong>{line.customer || '-'}</div>
                        <div><strong className="text-slate-700 mr-1">Consignor:</strong>{line.consignor || '-'}</div>
                        <div><strong className="text-slate-700 mr-1">Consignee:</strong>{line.consignee || '-'}</div>
                        <div><strong className="text-slate-700 mr-1">DO No:</strong>{line.shipperDoNo || '-'}</div>
                     </td>
                     <td className="p-2">
                       <textarea value={line.product} onChange={e => updateLine(idx, 'product', e.target.value)} rows="4" className="w-full p-1.5 text-sm border border-slate-300 rounded resize-none" />
                     </td>
                     <td className="p-2 align-top">
                       <input type="text" value={line.hsCode} onChange={e => updateLine(idx, 'hsCode', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded text-center font-mono text-xs" placeholder="HS Code" />
                     </td>
                     <td className="p-2 align-top">
                       <input type="number" value={line.qty} onChange={e => updateLine(idx, 'qty', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded text-right bg-slate-50" />
                     </td>
                     <td className="p-2 align-top text-center text-sm font-semibold text-slate-600">
                       <input type="text" value={line.uom} onChange={e => updateLine(idx, 'uom', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded text-center" />
                     </td>
                     <td className="p-2 align-top">
                       <input type="number" value={line.weight} onChange={e => updateLine(idx, 'weight', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded text-right" placeholder="0" />
                     </td>
                     <td className="p-2 align-top">
                       <input type="number" step="0.001" value={line.cbm !== undefined ? line.cbm : ''} onChange={e => updateLine(idx, 'cbm', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded text-right" placeholder="0.000" />
                     </td>
                     <td className="p-2 align-top text-right font-medium text-slate-800 text-sm">
                       <input type="number" value={line.totalValue} onChange={e => updateLine(idx, 'totalValue', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded text-right" placeholder="0.00" step="0.01" />
                     </td>
                   </tr>
                 );
               })}
             </tbody>
             <tfoot className="bg-slate-50 border-t border-slate-200">
               <tr>
                 <td colSpan="5" className="p-3 text-right font-bold text-slate-700">Total:</td>
                 <td className="p-3 text-right font-bold text-slate-700">
                   {formData.lines.reduce((sum, line) => sum + (parseFloat(line.weight) || 0), 0).toFixed(2)}
                 </td>
                 <td className="p-3 text-right font-bold text-slate-700">
                   {formData.lines.reduce((sum, line) => sum + (parseFloat(line.cbm) || 0), 0).toFixed(3)}
                 </td>
                 <td className="p-3 text-right font-bold text-blue-700 text-lg">
                   {formData.currency} {formData.lines.reduce((sum, line) => sum + (parseFloat(line.totalValue) || 0), 0).toFixed(2)}
                 </td>
               </tr>
             </tfoot>
           </table>
         </div>
      </div>
      
      {editCommercialInvoiceId && <ActivityHistory recordId={editCommercialInvoiceId} />}
      
      <div className="flex justify-end pt-4 pb-12">
        <button onClick={saveInvoice} className="px-8 py-3 bg-blue-600 text-white rounded-xl shadow-lg border-b-4 border-blue-700 hover:bg-blue-500 font-bold text-lg flex items-center transition-all active:mt-1 active:border-b-0">
          <Save className="w-5 h-5 mr-2"/> {formData.id ? 'Update' : 'Save'} Invoice
        </button>
      </div>

      {showMergePrompt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">Merge Items Separately?</h3>
                  <p className="text-sm text-slate-500 mt-1">Commercial Invoices are usually grouped by HS Code. Would you like to merge items with identical HS Codes before saving?</p>
               </div>
               <button onClick={() => setShowMergePrompt(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5"/>
               </button>
             </div>
             <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => {setShowMergePrompt(false); executeSave(formData.lines);}} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Save without Merging</button>
                <button onClick={confirmAndSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Merge & Save</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
