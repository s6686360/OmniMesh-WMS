import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from './App';
import { Search, FileText, CheckCircle, Calculator, Info, FileStack, ArrowRight, ChevronRight, ChevronDown } from 'lucide-react';

export const CostRecoveryView = () => {
  const { manifests, containerBookings, receipts, vendorBills, companies, masterTariffs, showMessage, openRecordInNewWindow } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('manifests'); // 'manifests' or 'fcl'
  const [selectedJob, setSelectedJob] = useState('');
  
  // Aggregate vendor bills for Jobs
  const getJobCosts = (type, item) => {
    let totalMYR = 0;
    let apportionments = {}; // receiptId -> total cost apportioned
    let bills = [];

    // Include all vendor bills (even DRAFT) to reflect latest assigned costs instantly
    const approvedBills = vendorBills || [];
    
    // Determine which receipt IDs belong to this Job for receipt-level apportionments
    let jobReceiptIds = new Set();
    if (type === 'MANIFEST') {
      const shipments = item.type === 'FCL' 
        ? (receipts || []).filter(r => r.manifestId === item.id || (r.bookingId === (item.bookingId?.split('::')[0] || item.bookingId) && !(manifests || []).some(m => m.type !== 'FCL' && m.lines?.some(l => l.receiptId === r.id))))
        : (receipts || []).filter(r => item.lines?.some(l => l.receiptId === r.id));
      shipments.forEach(s => jobReceiptIds.add(s.id));
    } else if (type === 'BOOKING') {
      const relatedManifests = (manifests || []).filter(m => m.bookingId?.startsWith(item.id + '::') || m.bookingId === item.id);
      const shipments = (receipts || []).filter(r => r.bookingId === item.id || relatedManifests.some(m => m.id === r.manifestId));
      shipments.forEach(s => jobReceiptIds.add(s.id));
    }

    approvedBills.forEach(b => {
      let costForJob = 0;
      let relevantLines = [];
      
      // Calculate costs belonging to this Manifest/Booking directly via BL logic
      if (b.referenceType === 'BL') {
         const blManifests = manifests.filter(m => m.blNo === b.referenceId || (m.bookingId && containerBookings?.find(cb => cb.id === (m.bookingId?.split('::')[0] || m.bookingId))?.blNo === b.referenceId));
         
         let appliesToJob = false;
         if (type === 'MANIFEST') {
             appliesToJob = blManifests.some(m => m.id === item.id);
         } else if (type === 'BOOKING') {
             appliesToJob = (item.blNo === b.referenceId) || blManifests.some(m => m.bookingId?.startsWith(item.id + '::') || m.bookingId === item.id);
         }
         
         if (appliesToJob) {
             const cbmTotalPool = blManifests.reduce((sum, mnf) => {
               const mnfCbm = mnf.type === 'FCL' ? parseFloat(mnf.totalCBM || 0) : (mnf.lines || []).reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitCbm || 0)), 0);
               return sum + (mnfCbm || 1);
             }, 0);
             const wgtTotalPool = blManifests.reduce((sum, mnf) => {
               const mnfWgt = mnf.type === 'FCL' ? parseFloat(mnf.totalWeight || 0) : (mnf.lines || []).reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitWeight || 0)), 0);
               return sum + (mnfWgt || 1);
             }, 0);
             
             b.lines?.forEach(line => {
                let lineCostForJob = 0;
                let baseLineTotal = (line.total || 0) * (b.exchangeRate || 1.0);
                
                const targetIds = (line.targetContainerId && line.targetContainerId !== 'ALL' && line.targetContainerId !== 'ALL_EQUAL') ? line.targetContainerId.split(',') : [];
                const isAll = targetIds.length === 0;

                const specificManifests = isAll ? blManifests : blManifests.filter(m => targetIds.includes(m.id));
                const specificCbmTotal = specificManifests.reduce((sum, mnf) => sum + (mnf.type === 'FCL' ? parseFloat(mnf.totalCBM || 0) : (mnf.lines || []).reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitCbm || 0)), 0)) || 1, 0);
                const specificWgtTotal = specificManifests.reduce((sum, mnf) => sum + (mnf.type === 'FCL' ? parseFloat(mnf.totalWeight || 0) : (mnf.lines || []).reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitWeight || 0)), 0)) || 1, 0);
                
                if (type === 'MANIFEST') {
                   if (!isAll && !targetIds.includes(item.id)) return; // This line doesn't apply to this manifest
                   
                   if (line.targetContainerId === item.id) {
                      lineCostForJob = baseLineTotal;
                   } else if (line.targetContainerId === 'ALL_EQUAL' || line.splitMethod === 'EQUAL') {
                      if (specificManifests.length > 0) lineCostForJob = baseLineTotal / specificManifests.length;
                   } else if (line.splitMethod === 'WEIGHT') {
                      const myWgt = item.type === 'FCL' ? parseFloat(item.totalWeight || 0) : (item.lines || []).reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitWeight || 0)), 0);
                      lineCostForJob = baseLineTotal * ((myWgt || 1) / specificWgtTotal);
                   } else { // ALL or default (CBM)
                      const myCbm = item.type === 'FCL' ? parseFloat(item.totalCBM || 0) : (item.lines || []).reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitCbm || 0)), 0);
                      lineCostForJob = baseLineTotal * ((myCbm || 1) / specificCbmTotal);
                   }
                } else if (type === 'BOOKING') {
                   // Summarize for all manifests under this booking
                   specificManifests.filter(m => m.bookingId?.startsWith(item.id + '::') || m.bookingId === item.id).forEach(mnf => {
                       if (line.targetContainerId === mnf.id) {
                          lineCostForJob += baseLineTotal;
                       } else if (line.targetContainerId === 'ALL_EQUAL' || line.splitMethod === 'EQUAL') {
                          if (specificManifests.length > 0) lineCostForJob += baseLineTotal / specificManifests.length;
                       } else if (line.splitMethod === 'WEIGHT') {
                          const myWgt = mnf.type === 'FCL' ? parseFloat(mnf.totalWeight || 0) : (mnf.lines || []).reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitWeight || 0)), 0);
                          lineCostForJob += baseLineTotal * ((myWgt || 1) / specificWgtTotal);
                       } else { // CBM
                          const myCbm = mnf.type === 'FCL' ? parseFloat(mnf.totalCBM || 0) : (mnf.lines || []).reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitCbm || 0)), 0);
                          lineCostForJob += baseLineTotal * ((myCbm || 1) / specificCbmTotal);
                       }
                   });
                }
                
                costForJob += lineCostForJob;
                if (lineCostForJob > 0) {
                    relevantLines.push({ ...line, assignedLineCost: lineCostForJob });
                }
                
                // Dynamically distribute lineCostForJob among receipt IDs in this job
                if (lineCostForJob > 0) {
                    const myReceipts = Array.from(jobReceiptIds) as string[];
                    if (myReceipts.length > 0) {
                        let tCbm = 0; let tWgt = 0;
                        const rMetrics = myReceipts.map(rid => {
                            let rcbm = 0; let rwgt = 0;
                            if (type === 'MANIFEST') {
                                if (item.type === 'FCL') {
                                    rcbm = parseFloat(item.totalCBM || 0) / myReceipts.length;
                                    rwgt = parseFloat(item.totalWeight || 0) / myReceipts.length;
                                } else {
                                    const rls = (item.lines || []).filter(ml => ml.receiptId === rid);
                                    rcbm = rls.reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitCbm || 0)), 0);
                                    rwgt = rls.reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitWeight || 0)), 0);
                                }
                            } else if (type === 'BOOKING') {
                                specificManifests.filter(m => m.bookingId?.startsWith(item.id + '::') || m.bookingId === item.id).forEach(mnf => {
                                    if (mnf.type === 'FCL') {
                                        const hasR = (receipts || []).find(r => r.id === rid && (r.manifestId === mnf.id || (r.bookingId === (mnf.bookingId?.split('::')[0] || mnf.bookingId))));
                                        if (hasR) {
                                            rcbm += parseFloat(mnf.totalCBM || 0);
                                            rwgt += parseFloat(mnf.totalWeight || 0);
                                        }
                                    } else {
                                        const rls = (mnf.lines || []).filter(ml => ml.receiptId === rid);
                                        rcbm += rls.reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitCbm || 0)), 0);
                                        rwgt += rls.reduce((s, ml) => s + (parseFloat(ml.loadQty || 0) * parseFloat(ml.unitWeight || 0)), 0);
                                    }
                                });
                            }
                            tCbm += rcbm;
                            tWgt += rwgt;
                            return { rid, rcbm, rwgt };
                        });

                        rMetrics.forEach(rm => {
                            let share = 1 / myReceipts.length; // default EQUAL
                            if (line.splitMethod === 'WEIGHT') {
                                share = tWgt > 0 ? (rm.rwgt / tWgt) : share;
                            } else if (line.splitMethod === 'EQUAL') {
                                share = 1 / myReceipts.length;
                            } else { // default CBM
                                share = tCbm > 0 ? (rm.rcbm / tCbm) : share;
                            }
                            apportionments[rm.rid] = (apportionments[rm.rid] || 0) + (lineCostForJob * share);
                        });
                    }
                }
             });
         }
      } else {
          // Fallback to receipt-level exact matches
          b.lines?.forEach(l => {
              if (l.targetContainerId && l.targetContainerId !== 'ALL' && l.targetContainerId !== 'ALL_EQUAL') {
                  const sids = l.targetContainerId.split(',');
                  let matchSids = sids.filter(id => jobReceiptIds.has(id));
                  if (matchSids.length > 0) {
                      const costPer = (l.total || 0) * (b.exchangeRate || 1.0) / sids.length;
                      let lineCostForJob = 0;
                      matchSids.forEach(sid => {
                          apportionments[sid] = (apportionments[sid] || 0) + costPer;
                          costForJob += costPer;
                          lineCostForJob += costPer;
                      });
                      if (lineCostForJob > 0) relevantLines.push({ ...l, assignedLineCost: lineCostForJob });
                  }
              }
          });
      }
      
      if (costForJob > 0) {
        bills.push({ ...b, assignedCost: costForJob, relevantLines });
        totalMYR += costForJob;
      }
    });

    return { bills, totalMYR, apportionments };
  };

  const getManifestSummary = (m) => {
    const costs = getJobCosts('MANIFEST', m);
    // For LCL manifests, shipments are in m.lines. For FCL, it's usually one customer (fclCustomer)
    const shipments = m.type === 'FCL' 
      ? (receipts || []).filter(r => r.manifestId === m.id || (r.bookingId === (m.bookingId?.split('::')[0] || m.bookingId) && !(manifests || []).some(mnf => mnf.type !== 'FCL' && mnf.lines?.some(l => l.receiptId === r.id)))) // Try to find linked receipts
      : (receipts || []).filter(r => m.lines?.some(l => l.receiptId === r.id));

    
    // Total stats
    const shipmentCount = shipments.length;
    // Calculate total CBM/Weight dynamically from manifest lines to ensure accuracy
    let totalCBM = 0;
    let totalWgt = 0;
    if (m.type === 'FCL') {
      totalCBM = parseFloat(m.totalCBM || 0);
      totalWgt = parseFloat(m.totalWeight || 0);
    } else {
      totalCBM = (m.lines || []).reduce((sum, ml) => sum + (parseFloat(ml.loadQty || 0) * (parseFloat(ml.unitCbm || 0))), 0);
      totalWgt = (m.lines || []).reduce((sum, ml) => sum + (parseFloat(ml.loadQty || 0) * (parseFloat(ml.unitWeight || 0))), 0);
    }
    
    const avgCostPerCBM = totalCBM > 0 ? costs.totalMYR / totalCBM : 0;

    return { ...m, costs, shipments, shipmentCount, totalWgt, totalCBM, avgCostPerCBM };
  };

  const getFclSummary = (b) => {
    const costs = getJobCosts('BOOKING', b);
    // Find manifests for this booking
    const relatedManifests = (manifests || []).filter(m => m.bookingId?.startsWith(b.id + '::') || m.bookingId === b.id);
    const shipments = (receipts || []).filter(r => r.bookingId === b.id || relatedManifests.some(m => m.id === r.manifestId));
    
    const shipmentCount = shipments.length;
    const totalWgt = relatedManifests.reduce((sum, m) => sum + (parseFloat(m.totalWeight) || 0), 0);
    const totalCBM = relatedManifests.reduce((sum, m) => sum + (parseFloat(m.totalCBM) || 0), 0);
    const avgCostPerCBM = totalCBM > 0 ? costs.totalMYR / totalCBM : 0;

    return { ...b, costs, shipments, shipmentCount, totalWgt, totalCBM, avgCostPerCBM, type: 'FCL_BOOKING' };
  };

  const jobSummaries = useMemo(() => {
    if (activeTab === 'manifests') {
      return (manifests || [])
        .filter(m => m.type !== 'FCL')
        .map(getManifestSummary)
        .filter(s => s.costs.totalMYR > 0 || s.shipmentCount > 0);
    }
    if (activeTab === 'fcl') {
      const fclBookings = (containerBookings || []).map(getFclSummary).filter(s => s.costs.totalMYR > 0 || s.shipmentCount > 0);
      const standaloneFclManifests = (manifests || [])
        .filter(m => m.type === 'FCL' && (!m.bookingId || !containerBookings?.find(b => m.bookingId.startsWith(b.id))))
        .map(getManifestSummary)
        .filter(s => s.costs.totalMYR > 0 || s.shipmentCount > 0);
      
      return [...fclBookings, ...standaloneFclManifests];
    }
    return [];
  }, [manifests, containerBookings, vendorBills, receipts, activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Container P&L</h2>
          <p className="text-slate-500 text-sm mt-1">Analyze operation costs vs expected returns and trigger billing.</p>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg w-full max-w-sm mb-4">
        <button onClick={() => { setActiveTab('manifests'); setSelectedJob(''); }} className={`flex-1 py-1.5 focus:outline-none rounded-md text-sm font-medium transition-colors ${activeTab === 'manifests' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>LCL Manifests</button>
        <button onClick={() => { setActiveTab('fcl'); setSelectedJob(''); }} className={`flex-1 py-1.5 focus:outline-none rounded-md text-sm font-medium transition-colors ${activeTab === 'fcl' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>FCL Bookings</button>
      </div>

      {!selectedJob ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobSummaries.map(job => (
             <div key={job.id} onClick={() => setSelectedJob(job.id)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition">{job.manifestNo || job.bookingNo || job.id}</h3>
                    <p className="text-xs text-slate-500 uppercase">{job.vessel || 'Vessel TBA'} • {job.voyage || 'Voyage TBA'}</p>
                  </div>
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{job.shipmentCount} Shipments</span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Route Info</p>
                     <p className="text-sm font-medium text-slate-700">{job.pol} &rarr; {job.pod}</p>
                   </div>
                   <div>
                     <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Volume</p>
                     <p className="text-sm font-medium text-slate-700">{job.totalCBM?.toFixed(2)} CBM / {job.totalWgt?.toFixed(1)} KG</p>
                   </div>
                   <div className="col-span-2 mt-1">
                     <p className="text-[10px] uppercase font-bold text-red-500 mb-0.5">Total Vendor Costs</p>
                     <p className="text-lg font-black text-red-600">MYR {job.costs.totalMYR.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                   </div>
                </div>
             </div>
          ))}
          {jobSummaries.length === 0 && (
             <div className="col-span-3 p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                No jobs with apportioned costs or shipments found.
             </div>
          )}
        </div>
      ) : (
        <JobCostDetail job={jobSummaries.find(s => s.id === selectedJob)} onBack={() => setSelectedJob('')} />
      )}
    </div>
  );
};

const JobCostDetail = ({ job, onBack }) => {
  const { receipts, masterTariffs, companies, showMessage, openRecordInNewWindow } = useContext(AppContext);
  const [expandedBills, setExpandedBills] = useState({});
  
  if (!job) return null;

  const toggleExpand = (id) => {
    setExpandedBills(prev => ({ ...prev, [id]: !prev[id] }));
  };

  let totalEstRevenue = 0;
  let totalMargin = 0;
  let totalVolume = 0;

  const shipmentRows = job.shipments.map(s => {
    // Calculate volume based on LOADED quantity in this manifest, not total SID volume
    let vol = 0;
    let wgt = 0;
    
    if (job.type === 'FCL' || job.type === 'FCL_BOOKING') {
      vol = s.lines?.reduce((s2, l2) => s2 + parseFloat(l2.cbm || 0), 0) || 0;
      wgt = s.lines?.reduce((s2, l2) => s2 + parseFloat(l2.weight || 0), 0) || 0;
    } else {
      // Match with manifest lines to get actual loaded volume for this SID in this manifest
      const manifestLines = (job.lines || []).filter(ml => ml.receiptId === s.id);
      vol = manifestLines.reduce((sum, ml) => sum + (parseFloat(ml.loadQty || 0) * (parseFloat(ml.unitCbm) || 0)), 0);
      wgt = manifestLines.reduce((sum, ml) => sum + (parseFloat(ml.loadQty || 0) * (parseFloat(ml.unitWeight) || 0)), 0);
    }

    const allocatedCost = job.costs.apportionments[s.id] || 0;
    
    // Real Master Tariff lookup
    // If the container is FCL but they want to refer to LCL tariff (as user suggested), 
    // we might need to decide which tariffType to look for.
    // For now, following user's hint "refer to LCL tariff".
    const matchingTariff = (masterTariffs || []).find(t => 
      (t.tariffType === 'LCL' || t.tariffType === 'FCL' || t.tariffType === 'Sea') && 
      String(t.pol || '').trim().toUpperCase() === String(job.pol || '').trim().toUpperCase() && 
      String(t.pod || '').trim().toUpperCase() === String(job.pod || '').trim().toUpperCase()
    );

    let estRevenue = 0;
    let hasMatch = false;
    let rateVal = 0;

    if (matchingTariff && matchingTariff.rates) {
      // Try to find a rate for this specific customer
      const customerCompany = (companies || []).find(c => c.name === s.customer || c.id === s.companyId || c.id === s.customerId);
      const customerId = customerCompany?.id;
      
      const customerRate = matchingTariff.rates.find(r => customerId && r.customerIds?.includes(customerId));
      const generalRate = matchingTariff.rates.find(r => !r.customerIds || r.customerIds.length === 0);
      
      const rateToUse = customerRate || generalRate;
      if (rateToUse) {
        hasMatch = true;
        rateVal = parseFloat(rateToUse.rate) || 0;
        if (rateToUse.unit === 'CBM') estRevenue = vol * rateVal;
        else if (rateToUse.unit === 'KG') estRevenue = wgt * rateVal;
        else estRevenue = rateVal; // UNIT or TRIP flat
      }
    } 
    
    if (!hasMatch) {
      // Fallback to placeholder if nothing configured yet
      rateVal = 120;
      estRevenue = vol * rateVal;
    }

    const margin = estRevenue - allocatedCost;
    const profitPerCBM = vol > 0 ? (estRevenue - allocatedCost) / vol : 0;

    totalEstRevenue += estRevenue;
    totalMargin += margin;
    totalVolume += vol;

    return (
      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
        <td className="p-3 font-mono font-bold text-indigo-600">{s.id}</td>
        <td className="p-3 font-medium text-slate-800">{s.customer || '-'}</td>
        <td className="p-3 text-slate-600 text-sm">{vol.toFixed(2)} CBM<br/><span className="text-xs text-slate-400">{wgt.toFixed(1)} KG</span></td>
        <td className="p-3 text-right text-slate-600 text-xs font-semibold">
           {vol > 0 ? (allocatedCost / vol).toFixed(2) : '-'}
        </td>
        <td className="p-3 text-right font-medium text-red-600">MYR {allocatedCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td className="p-3 text-right font-medium text-indigo-600">
          MYR {rateVal.toLocaleString(undefined, {minimumFractionDigits: 2})}
          {!hasMatch && (
            <div className="group relative inline-block ml-1">
              <span className="block text-[8px] text-amber-500 uppercase font-bold cursor-help">No Configured Tariff</span>
              <div className="absolute bottom-full right-0 mb-2 w-56 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 normal-case font-normal text-left">
                Searching for: {matchingTariff ? 'Rate match' : 'Tariff'}<br/>
                Type: {job.type === 'FCL' ? 'FCL/LCL' : 'LCL'}<br/>
                POL: "{job.pol}" | POD: "{job.pod}"<br/>
                <span className="text-amber-300">Tip: Check POL/POD exact matches and Customer Rates in Master Data.</span>
              </div>
            </div>
          )}
        </td>
        <td className="p-3 text-right font-medium text-indigo-600">MYR {estRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td className={`p-3 text-right font-bold ${profitPerCBM >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
           {profitPerCBM >= 0 ? '+' : ''}{profitPerCBM.toLocaleString(undefined, {minimumFractionDigits: 2})} MYR
        </td>
        <td className={`p-3 text-right font-bold tracking-tight ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
           {margin >= 0 ? '+' : ''}{margin.toLocaleString(undefined, {minimumFractionDigits: 2})} MYR
        </td>
        <td className="p-3 text-center">
           <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs font-bold border border-slate-200">Unbilled</span>
        </td>
      </tr>
    )
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center space-x-4">
           <button onClick={onBack} className="p-2 bg-white text-slate-600 hover:text-indigo-600 rounded-full border border-slate-200 shadow-sm transition"><ArrowRight className="w-4 h-4 rotate-180" /></button>
           <div>
             <h3 className="text-xl font-bold text-slate-800">{job.manifestNo || job.bookingNo || job.id}</h3>
             <p className="text-sm text-slate-500">{job.pol} &rarr; {job.pod} • {job.vessel} {job.voyage}</p>
           </div>
        </div>
        <div className="flex flex-col gap-4 text-right">
           <div className="flex justify-end gap-6 border-b border-slate-200 pb-4">
              <div>
                 <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Avg Selling/CBM</p>
                 <p className="text-sm font-semibold text-indigo-600">MYR {totalVolume > 0 ? (totalEstRevenue / totalVolume).toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}</p>
              </div>
              <div>
                 <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Avg Cost/CBM</p>
                 <p className="text-sm font-semibold text-red-500">MYR {totalVolume > 0 ? (job.costs.totalMYR / totalVolume).toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}</p>
              </div>
              <div>
                 <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Avg Margin/CBM</p>
                 <p className={`text-sm font-semibold ${(totalEstRevenue - job.costs.totalMYR) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>MYR {totalVolume > 0 ? ((totalEstRevenue - job.costs.totalMYR) / totalVolume).toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}</p>
              </div>
              <div>
                 <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Gross Profit Margin</p>
                 <p className={`text-sm font-black ${(totalEstRevenue - job.costs.totalMYR) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {totalEstRevenue > 0 ? (((totalEstRevenue - job.costs.totalMYR) / totalEstRevenue) * 100).toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}%
                 </p>
              </div>
           </div>
           <div className="flex justify-end gap-6 items-end">
              <div>
                 <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Total Revenue</p>
                 <p className="text-lg font-black text-indigo-600">MYR {totalEstRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
              <div>
                 <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Total Cost</p>
                 <p className="text-lg font-black text-red-600">MYR {job.costs.totalMYR.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
              <div className="pl-6 border-l border-slate-200">
                 <p className="text-xs uppercase font-bold text-slate-500 mb-1">Total Margin</p>
                 <p className={`text-2xl font-black ${totalMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>MYR {totalMargin.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
           </div>
        </div>
      </div>
      
      <div className="p-6 overflow-x-auto">
         <div className="flex justify-between items-center mb-4">
           <div className="flex items-center space-x-2">
             <h4 className="font-bold text-slate-800 text-lg">Shipment Cost Breakdown & Billing</h4>
             <div className="group relative">
               <Info className="w-4 h-4 text-slate-400 cursor-help" />
               <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                 <strong>Selling Price/CBM:</strong> The standard selling rates configured in Master data for this route (POL/POD). It represents your expected revenue baseline.
               </div>
             </div>
           </div>
           <button onClick={() => showMessage("Billing Module Integration Pending.")} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2 text-sm">
             <FileStack className="w-4 h-4" /> <span>Generate Customer Bills</span>
           </button>
         </div>

         <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300 text-slate-600">
                <th className="p-3 font-semibold pb-2">Shipment (SID)</th>
                <th className="p-3 font-semibold pb-2">Customer</th>
                <th className="p-3 font-semibold pb-2">Volume</th>
                <th className="p-3 font-semibold pb-2 text-right">Avg. Cost/CBM</th>
                <th className="p-3 font-semibold pb-2 text-right text-red-600">Apportioned Cost</th>
                <th className="p-3 font-semibold pb-2 text-right text-indigo-600">Tariff Price/CBM</th>
                <th className="p-3 font-semibold pb-2 text-right text-indigo-700">Total Selling</th>
                <th className="p-3 font-semibold pb-2 text-right text-emerald-600">Profit/CBM</th>
                <th className="p-3 font-semibold pb-2 text-right">Est. Margin</th>
                <th className="p-3 font-semibold pb-2 text-center">Billing Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {shipmentRows}
            </tbody>
         </table>
      </div>

      <div className="p-6 border-t border-slate-200">
         <h4 className="font-bold text-slate-800 text-lg mb-4 flex items-center"><FileText className="w-5 h-5 mr-2 text-indigo-500"/> Related Vendor Bills</h4>
         {job.costs.bills && job.costs.bills.length > 0 ? (
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead>
                   <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                     <th className="p-3 font-semibold pb-2">Bill No</th>
                     <th className="p-3 font-semibold pb-2">Vendor</th>
                     <th className="p-3 font-semibold pb-2">Date</th>
                          <th className="p-3 font-semibold pb-2 text-right text-indigo-700">Assigned Cost (MYR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {job.costs.bills.map((b: any) => {
                            const comp = (companies || []).find(c => c.id === b.vendorId);
                            const hasMultipleLines = b.relevantLines && b.relevantLines.length > 0;
                            const isExpanded = expandedBills[b.id];
                            return (
                            <React.Fragment key={b.id}>
                            <tr className="hover:bg-slate-50 transition">
                              <td className="p-3 flex items-center gap-2">
                               {hasMultipleLines ? (
                                 <button onClick={() => toggleExpand(b.id)} className="p-1 hover:bg-indigo-50 text-indigo-500 rounded transition-colors">
                                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                 </button>
                               ) : (
                                 <div className="w-6" />
                               )}
                                <span className="font-mono font-medium text-indigo-600 underline cursor-pointer" onClick={() => openRecordInNewWindow('vendor-bills', b.id)}>{b.invoiceNo || b.id}</span>
                              </td>
                              <td className="p-3 text-slate-700">{comp ? comp.name : (b.vendorId || '-')}</td>
                              <td className="p-3 text-slate-500">{b.date || '-'}</td>
                              <td className="p-3 text-right font-bold text-indigo-600">MYR {b.assignedCost?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}</td>
                            </tr>
                            {isExpanded && hasMultipleLines && (
                               <tr className="bg-slate-50/50">
                                 <td colSpan={4} className="p-0">
                                   <div className="pl-12 pr-4 py-3 border-b border-slate-100">
                                     <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden bg-white">
                                       <thead className="bg-slate-100">
                                         <tr className="text-slate-600 border-b border-slate-200">
                                           <th className="font-semibold p-2">Description</th>
                                           <th className="font-semibold p-2 max-w-[150px]">Apportionment</th>
                                           <th className="font-semibold p-2">Qty</th>
                                           <th className="font-semibold p-2 text-right">Unit Price</th>
                                           <th className="font-semibold p-2 text-right text-indigo-600">Assigned Line Cost</th>
                                         </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                         {b.relevantLines.map((l: any, idx: number) => (
                                           <tr key={idx} className="hover:bg-slate-50">
                                             <td className="p-2 text-slate-700">{l.description || '-'}</td>
                                             <td className="p-2 text-slate-500 truncate max-w-[150px] text-[10px] uppercase">{l.splitMethod} ({l.targetContainerId === 'ALL' ? 'All (Pool)' : l.targetContainerId === 'ALL_EQUAL' ? 'All (Equal)' : 'Specific'})</td>
                                             <td className="p-2 text-slate-600">{l.qty || 0} {l.uom || 'Unit'}</td>
                                             <td className="p-2 text-slate-600 font-mono text-right">{l.unitPrice?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                             <td className="p-2 text-right font-medium text-indigo-600 font-mono">{l.assignedLineCost?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
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
         ) : (
            <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded">No vendor bills are currently linked or apportioned to this job.</p>
         )}
      </div>
    </div>
  );
};
