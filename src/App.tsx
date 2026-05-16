import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  ArrowRightCircle,
  LayoutDashboard, PackagePlus, List, Undo2, Boxes, Plus, Trash2, Save,
  Search, FileText, Ship, ClipboardList, MapPin, Container, Printer,
  X, Database, Split, FileDown, ArrowUpDown, CheckCircle, AlertCircle,
  LogOut, UserCircle, Lock, ShieldAlert, Settings, Truck, Edit, Link, ChevronLeft, ChevronRight, ChevronDown, Calendar, Bell, Flag, Check, Inbox
} from 'lucide-react';
import { CommercialInvoiceForm } from './CommercialInvoiceForm';
import { CommercialInvoiceList } from './CommercialInvoiceList';
import { ReportModule } from './ReportModule';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Global connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Côte d'Ivoire","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Holy See","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine State","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
].map(c => c.toUpperCase());

interface Window {
  printBookingForm: (b: any) => void;
}
declare global {
  interface Window {
    printBookingForm: (b: any) => void;
  }
}

const MODULE_PERMISSIONS = [
  { id: 'dashboard', name: 'Dashboard', actions: ['view'] },
  { id: 'pickups', name: 'Pickup Requests', actions: ['view', 'create', 'edit', 'cancel', 'print'] },
  { id: 'receipts', name: 'Shipments', actions: ['view', 'create', 'edit', 'cancel', 'print'] },
  { id: 'container_bookings', name: 'Container Bookings', actions: ['view', 'create', 'edit', 'cancel', 'print'] },
  { id: 'haulier_bookings', name: 'Haulier Bookings', actions: ['view', 'create', 'edit', 'cancel', 'print'] },
  { id: 'manifests', name: 'Manifests', actions: ['view', 'create', 'edit', 'delete', 'print'] },
  { id: 'returns', name: 'Returns', actions: ['view', 'create', 'edit', 'cancel', 'print'] },
  { id: 'breakbulks', name: 'Breakbulk', actions: ['view', 'create', 'edit'] },
  { id: 'commercial_invoices', name: 'Commercial Invoices', actions: ['view', 'create', 'edit', 'print'] },
  { id: 'track_cargo', name: 'Track Cargo', actions: ['view'] },
  { id: 'inventory', name: 'Inventory', actions: ['view', 'split'] },
  { id: 'reports', name: 'Reports', actions: ['view'] },
  { id: 'master_data', name: 'Master Data', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'activity_logs', name: 'Activity Logs', actions: ['view'] },
];

const AppContext = React.createContext(null);

const formatAddress = (addrObj) => {
  if (!addrObj || typeof addrObj === 'string') return addrObj || '-';
  const parts = [];
  if (addrObj.companyName) parts.push(addrObj.companyName);
  if (addrObj.line1) parts.push(addrObj.line1);
  if (addrObj.line2) parts.push(addrObj.line2);
  if (addrObj.line3) parts.push(addrObj.line3);
  
  let pcc = '';
  if (addrObj.postalCode || addrObj.city) {
    pcc = `${addrObj.postalCode || ''} ${addrObj.city || ''}`.trim();
  }
  if (pcc) parts.push(pcc);

  let sc = '';
  if (addrObj.state || addrObj.country) {
    sc = `${addrObj.state || ''}${addrObj.state && addrObj.country ? ', ' : ''}${addrObj.country || ''}`.trim();
  }
  if (sc) parts.push(sc);

  return parts.length > 0 ? parts.join('\n') : '-';
};

const DashboardView = () => {
  const { currentUser, checkAccess, getActiveInventory, manifests, receipts, returns, containerBookings, containerTypes, formatDate, pickups, companies } = React.useContext(AppContext);
  const [dashboardTimeframe, setDashboardTimeframe] = useState('Month');

  if (!checkAccess('dashboard', 'view')) return <div className="p-8 text-center text-slate-500">You do not have permission to view the Dashboard.</div>;

  const isWithinTimeframe = (dateStr, tf) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    if (tf === 'Day') return d.toDateString() === now.toDateString();
    if (tf === 'Week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return d >= start && d < end;
    }
    if (tf === 'Month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (tf === 'Year') return d.getFullYear() === now.getFullYear();
    return true;
  };

  const inventory = getActiveInventory();
  const activeCBM = inventory.reduce((sum, item) => sum + ((item.currentQty || 0) * (item.unitCbm || 0)), 0);
  
  const pendingByRoute = {};
  inventory.filter(i => i.transactionType === 'LCL Consolidate' && (i.currentQty || 0) > 0).forEach(item => {
    const route = `${item.pol || '-'} → ${item.pod || '-'}`;
    if (!pendingByRoute[route]) pendingByRoute[route] = { qty: 0, cbm: 0, weight: 0 };
    pendingByRoute[route].qty += item.currentQty || 0;
    pendingByRoute[route].cbm += ((item.currentQty || 0) * (item.unitCbm || 0));
    pendingByRoute[route].weight += ((item.currentQty || 0) * (item.unitWeight || 0));
  });

  const assignedByRoute = {};
  (manifests || []).forEach(mnf => {
    const route = `${mnf.pol || '-'} → ${mnf.pod || '-'}`;
    if (!assignedByRoute[route]) assignedByRoute[route] = { qty: 0, cbm: 0, weight: 0 };
    assignedByRoute[route].qty += (mnf.lines || []).reduce((s, l) => s + (l.loadQty || 0), 0);
    assignedByRoute[route].cbm += (mnf.totalCBM || 0);
    if (mnf.type !== 'FCL') {
        assignedByRoute[route].weight += (mnf.totalWeight || 0);
    }
  });

  const timeframeReceipts = (receipts || []).filter(r => isWithinTimeframe(r.date, dashboardTimeframe));
  const timeframeManifests = (manifests || []).filter(m => isWithinTimeframe(m.date, dashboardTimeframe));
  const receivedCBM = timeframeReceipts.reduce((sum, r) => sum + (r.totalCBM || 0), 0);
  const assignedCBM = timeframeManifests.reduce((sum, m) => sum + (m.totalCBM || 0), 0);
  
  const calendarBookings = React.useMemo(() => {
    const dates = {};
    
    (containerBookings || []).forEach(b => {
      const dateKey = b.expectedSailingDate ? new Date(b.expectedSailingDate).toISOString().split('T')[0] : 'TBA';
      if (!dates[dateKey]) dates[dateKey] = [];
      
      const route = `${b.pol} to ${b.pod}`;
      
      let assignedCbm = 0;
      let assignedWeight = 0;
      
      (manifests || []).filter(m => m.bookingId === b.id).forEach(m => {
          assignedCbm += (m.totalCBM || 0);
          assignedWeight += (m.totalWeight || 0);
      });
      
      let maxCbm = 0;
      let maxWeight = 0;
      let hasLCL = false;
      let hasFCL = false;

      b.containers.forEach(c => {
         if (c.usageType === 'LCL') {
             hasLCL = true;
             maxCbm += (parseFloat(containerTypes?.find(t => t.type === c.containerTypeId)?.maxCbm) || 0);
             maxWeight += (parseFloat(containerTypes?.find(t => t.type === c.containerTypeId)?.maxWeight) || 0);
         } else {
             hasFCL = true;
         }
      });
      
      dates[dateKey].push({
         booking: b,
         route,
         hasLCL,
         hasFCL,
         customer: (companies?.find(c => c.id === b.linerBrokerId)?.name || b.linerBrokerId),
         assignedCbm,
         assignedWeight,
         occCbm: maxCbm > 0 ? ((assignedCbm / maxCbm) * 100).toFixed(1) : 0,
         occWeight: maxWeight > 0 ? ((assignedWeight / maxWeight) * 100).toFixed(1) : 0
      });
    });
    
    // Sort keys
    return Object.fromEntries(
      Object.entries(dates).sort(([a], [b]) => a === 'TBA' ? 1 : b === 'TBA' ? -1 : a.localeCompare(b))
    );
  }, [containerBookings, manifests, containerTypes, companies]);

  const pendingPickupsCount = (pickups || []).filter(p => p.status === 'Open' || !p.linkedSid).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <LayoutDashboard className="w-8 h-8 text-blue-600" />
          OMNIMESH OPERATIONAL DASHBOARD
        </h2>
        <div className="flex items-center space-x-3">
           <div className="bg-slate-100 p-2 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-500">SYSTEM LIVE</span>
           </div>
           {(currentUser?.isWarehouseOperator || currentUser?.roleId === 'role-superadmin') && (
             <div className="bg-indigo-100 p-2 rounded-lg flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-700 uppercase">Warehouse Ops Mode</span>
             </div>
           )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><ClipboardList className="w-8 h-8" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Pending Pickups</p><p className="text-2xl font-bold text-slate-800">{pendingPickupsCount}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><PackagePlus className="w-8 h-8" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Total Shipments</p><p className="text-2xl font-bold text-slate-800">{(receipts || []).length}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><Boxes className="w-8 h-8" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Active Stock (CBM)</p><p className="text-2xl font-bold text-slate-800">{activeCBM.toFixed(3)}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-teal-100 text-teal-600 rounded-lg"><Ship className="w-8 h-8" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Total Manifests</p><p className="text-2xl font-bold text-slate-800">{(manifests || []).length}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><Undo2 className="w-8 h-8" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Total Returns</p><p className="text-2xl font-bold text-slate-800">{(returns || []).length}</p></div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-semibold text-slate-800">Volume Analytics (CBM)</h3>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {['Day', 'Week', 'Month', 'Year'].map(tf => (
              <button 
                key={tf} 
                onClick={() => setDashboardTimeframe(tf)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${dashboardTimeframe === tf ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><PackagePlus className="w-6 h-6"/></div>
            <div><p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Shipment Receiving</p><p className="text-2xl font-black text-slate-800">{receivedCBM.toFixed(3)}</p></div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="p-3 bg-teal-100 text-teal-600 rounded-lg"><Container className="w-6 h-6"/></div>
            <div><p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Assigned in Manifests</p><p className="text-2xl font-black text-slate-800">{assignedCBM.toFixed(3)}</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-800">Pending LCL Cargo</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-white border-b border-slate-100 text-slate-600">
                <tr><th className="p-3 text-sm font-semibold">Route (POL → POD)</th><th className="p-3 text-sm font-semibold text-right">Qty</th><th className="p-3 text-sm font-semibold text-right">CBM</th><th className="p-3 text-sm font-semibold text-right">Wgt (kg)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.keys(pendingByRoute).length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-500 text-sm">No pending cargo.</td></tr> : Object.entries(pendingByRoute).map(([route, data]: [string, any]) => (
                  <tr key={route} className="hover:bg-slate-50">
                    <td className="p-3 text-sm font-medium text-slate-700"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">{route}</span></td>
                    <td className="p-3 text-sm text-slate-600 text-right">{data.qty}</td>
                    <td className="p-3 text-sm text-slate-600 text-right font-mono">{data.cbm.toFixed(3)}</td>
                    <td className="p-3 text-sm text-slate-600 text-right font-mono">{data.weight.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-800">Assigned to Manifests</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-white border-b border-slate-100 text-slate-600">
                <tr><th className="p-3 text-sm font-semibold">Route (POL → POD)</th><th className="p-3 text-sm font-semibold text-right">Qty</th><th className="p-3 text-sm font-semibold text-right">CBM</th><th className="p-3 text-sm font-semibold text-right">Wgt (kg)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.keys(assignedByRoute).length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-500 text-sm">No manifests created yet.</td></tr> : Object.entries(assignedByRoute).map(([route, data]: [string, any]) => (
                  <tr key={route} className="hover:bg-slate-50">
                    <td className="p-3 text-sm font-medium text-slate-700"><span className="bg-teal-50 text-teal-700 px-2 py-1 rounded">{route}</span></td>
                    <td className="p-3 text-sm text-slate-600 text-right">{data.qty}</td>
                    <td className="p-3 text-sm text-slate-600 text-right font-mono">{data.cbm.toFixed(3)}</td>
                    <td className="p-3 text-sm text-slate-600 text-right font-mono">{data.weight.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
           <Calendar className="w-5 h-5 text-indigo-600" />
           <h3 className="text-lg font-semibold text-slate-800">Booking Schedule Calendar</h3>
        </div>
        <div className="p-4 grid grid-cols-1 gap-6">
           {Object.keys(calendarBookings).length === 0 ? (
              <div className="col-span-full p-4 text-center text-slate-500 text-sm">No scheduled bookings found.</div>
           ) : (
              Object.entries(calendarBookings).map(([date, items]) => (
                <div key={date} className="border border-slate-200 rounded-lg overflow-hidden">
                   <div className="bg-slate-100 p-2 font-bold inset-0 border-b border-slate-200 text-slate-700 text-center uppercase tracking-widest text-xs">
                      {date === 'TBA' ? 'To Be Announced' : formatDate(date)}
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                       <div className="bg-white">
                          <div className="bg-blue-50 py-1.5 px-3 border-b border-slate-200 text-blue-800 font-bold text-xs uppercase text-center">FCL Shipments</div>
                          <div className="divide-y divide-slate-100">
                             {(items as any[]).filter(it => it.hasFCL).length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-xs italic">No FCL for this date</div>
                             ) : (items as any[]).filter(it => it.hasFCL).map((it: any, idx: number) => (
                                <div key={idx} className="p-3 bg-white text-sm flex flex-col space-y-1 hover:bg-slate-50 transition">
                                   <div className="flex justify-between items-center">
                                      <span className="font-semibold text-blue-800">{it.route}</span>
                                      <span className="text-xs text-slate-400 font-mono">{it.booking.id}</span>
                                   </div>
                                   <div className="text-xs text-slate-600 flex justify-between items-center mt-1">
                                      <span className="font-semibold text-slate-700 truncate max-w-[150px]">{it.customer}</span>
                                      <span>Containers: <strong className="text-slate-800">{it.booking.containers?.length || 0}</strong></span>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                       <div className="bg-white">
                          <div className="bg-indigo-50 py-1.5 px-3 border-b border-slate-200 text-indigo-800 font-bold text-xs uppercase text-center">LCL Consolidations</div>
                          <div className="divide-y divide-slate-100">
                             {(items as any[]).filter(it => it.hasLCL).length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-xs italic">No LCL for this date</div>
                             ) : (items as any[]).filter(it => it.hasLCL).map((it: any, idx: number) => (
                                <div key={idx} className="p-3 bg-white text-sm flex flex-col space-y-1 hover:bg-slate-50 transition">
                                   <div className="flex justify-between items-center">
                                      <span className="font-semibold text-indigo-800">{it.route}</span>
                                      <span className="text-xs text-slate-400 font-mono">{it.booking.id}</span>
                                   </div>
                                   <div className="grid grid-cols-2 gap-2 mt-2">
                                     <div className="bg-slate-50 p-2 border border-slate-100 rounded">
                                        <p className="text-[10px] uppercase text-slate-400 font-bold">Assigned CBM</p>
                                        <div className="flex items-end justify-between">
                                          <p className="font-bold text-slate-700">{Number(it.assignedCbm).toFixed(2)}</p>
                                          <span className={`text-xs font-bold leading-none ${Number(it.occCbm) > 90 ? 'text-red-600' : Number(it.occCbm) > 60 ? 'text-orange-500' : 'text-emerald-600'}`}>{it.occCbm}%</span>
                                        </div>
                                     </div>
                                     <div className="bg-slate-50 p-2 border border-slate-100 rounded">
                                        <p className="text-[10px] uppercase text-slate-400 font-bold">Assigned WGT</p>
                                        <div className="flex items-end justify-between">
                                          <p className="font-bold text-slate-700">{Number(it.assignedWeight).toFixed(0)}</p>
                                          <span className={`text-xs font-bold leading-none ${Number(it.occWeight) > 90 ? 'text-red-600' : Number(it.occWeight) > 60 ? 'text-orange-500' : 'text-emerald-600'}`}>{it.occWeight}%</span>
                                        </div>
                                     </div>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                   </div>
                </div>
              ))
           )}
        </div>
      </div>
    </div>
  );
};

const TrackCargoView = () => {
  const { receipts, manifests, returns, pickups, commercialInvoices, companies, containerBookings, currentUser, globalTrackSearch, setGlobalTrackSearch, formatDate, setActiveTab, setEditCommercialInvoiceId, setEditReceiptId, setEditManifestId } = React.useContext(AppContext);

  const handleSearch = (e) => {
    setGlobalTrackSearch(e.target.value.toUpperCase());
  };

  const trackingResults = useMemo(() => {
    if (!globalTrackSearch || globalTrackSearch.trim().length < 3) return [];
    const term = globalTrackSearch.toUpperCase();
    const results = [];
    const uComp = currentUser?.roleId !== 'role-superadmin' ? (currentUser?.username?.toUpperCase() || '') : null;

    // 1. Shipments
    (receipts || []).forEach(r => {
      if (uComp && !(r.customer || '').toUpperCase().includes(uComp) && !(r.consignee || '').toUpperCase().includes(uComp) && !(r.consignor || '').toUpperCase().includes(uComp)) return;

      const mForReceipt = (manifests || []).flatMap(m => (m.lines || []).filter(l => l.receiptId === r.id).map(l => ({...l, mId: m.id, cNo: m.containerNo, job: m.jobNo, mBl: m.blNo, bk: m.bookingNo})));
      const pForReceipt = (pickups || []).filter(p => p.linkedSid === r.id);
      const retForReceipt = (returns || []).filter(ret => ret.receiptId === r.id);

      const matchesSID = (r.id || '').toUpperCase().includes(term);
      const matchesDO = (r.shipperDoNo || '').toUpperCase().includes(term);
      const matchesCustomer = (r.customer || '').toUpperCase().includes(term);
      const matchesConsignee = (r.consignee || '').toUpperCase().includes(term);
      const matchesConsignor = (r.consignor || '').toUpperCase().includes(term);
      const matchesContainer = mForReceipt.some(m => (m.cNo || '').toUpperCase().includes(term));
      const matchesHBL = mForReceipt.some(m => (m.hblNo || '').toUpperCase().includes(term) || (m.mBl || '').toUpperCase().includes(term));
      const matchesBooking = mForReceipt.some(m => (m.bk || '').toUpperCase().includes(term));
      const matchesJob = mForReceipt.some(m => (m.job || '').toUpperCase().includes(term));
      const matchesPickup = pForReceipt.some(p => (p.id || '').toUpperCase().includes(term)) || (r.puNo || '').toUpperCase().includes(term);
      const matchesReturnDO = retForReceipt.some(ret => (ret.doNo || '').toUpperCase().includes(term));

      if (matchesSID || matchesDO || matchesContainer || matchesHBL || matchesPickup || matchesReturnDO || matchesBooking || matchesJob || matchesCustomer || matchesConsignee || matchesConsignor) {
        results.push({ type: 'shipment', data: r });
      }
    });

    // 2. Pickups
    (pickups || []).forEach(p => {
      if (uComp && !(p.customerName || '').toUpperCase().includes(uComp) && !(p.consigneeName || '').toUpperCase().includes(uComp) && !(p.consignorName || '').toUpperCase().includes(uComp)) return;
      
      const matchesId = (p.id || '').toUpperCase().includes(term);
      const matchesName = (p.customerName || '').toUpperCase().includes(term) || (p.consigneeName || '').toUpperCase().includes(term) || (p.consignorName || '').toUpperCase().includes(term);

      if (matchesId || matchesName) {
        results.push({ type: 'pickup', data: p });
      }
    });

    // 3. Returns
    (returns || []).forEach(ret => {
      const rForRet = (receipts || []).find(r => r.id === ret.receiptId);
      if (uComp) {
        if (!rForRet || (!(rForRet.customer || '').toUpperCase().includes(uComp) && !(rForRet.consignee || '').toUpperCase().includes(uComp) && !(rForRet.consignor || '').toUpperCase().includes(uComp))) return;
      }
      const matchesId = (ret.id || '').toUpperCase().includes(term);
      const matchesDO = (ret.doNo || '').toUpperCase().includes(term);
      const matchesName = rForRet && ((rForRet.customer || '').toUpperCase().includes(term) || (rForRet.consignee || '').toUpperCase().includes(term) || (rForRet.consignor || '').toUpperCase().includes(term));
      
      if (matchesId || matchesDO || matchesName) {
        results.push({ type: 'return', data: ret });
      }
    });

    // 4. Commercial Invoices
    (commercialInvoices || []).forEach(ci => {
      const declCompName = (companies || []).find(c => c.id === ci.declCompanyId)?.name || '';
      const cneCompName = (companies || []).find(c => c.id === ci.podConsigneeId)?.name || '';

      if ((ci.id || '').toUpperCase().includes(term) || (ci.hblNo || '').toUpperCase().includes(term) || declCompName.toUpperCase().includes(term) || cneCompName.toUpperCase().includes(term)) {
         results.push({ type: 'commercial_invoice', data: ci, declCompName, cneCompName });
      }
    });

    const unique = [];
    const seen = new Set();
    results.forEach(res => {
      const key = `${res.type}-${res.data.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(res);
      }
    });
    return unique;
  }, [globalTrackSearch, receipts, manifests, pickups, returns, commercialInvoices, currentUser]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Track Cargo Lifecycle</h2>
        <div className="relative w-full">
          <Search className="w-6 h-6 absolute left-4 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Enter Shipment ID, Shipper DO, Container No, or House BL..." 
            value={globalTrackSearch || ''} 
            onChange={handleSearch} 
            className="pl-12 pr-4 py-3 border-2 border-slate-300 rounded-xl w-full focus:ring-blue-500 focus:border-blue-500 text-lg shadow-sm"
          />
        </div>
        {globalTrackSearch && globalTrackSearch.length > 0 && globalTrackSearch.length < 3 && <p className="text-sm text-slate-500 px-2">Type at least 3 characters to search...</p>}
      </div>

      <div className="space-y-6">
        {trackingResults.map(result => {
          if (result.type === 'shipment') {
            const r = result.data;
            const mForReceipt = (manifests || []).flatMap(m => (m.lines || []).filter(l => l.receiptId === r.id).map(l => ({...l, mId: m.id, date: m.date, cNo: m.containerNo, seal: m.sealNo, job: m.jobNo})));
            const rForReceipt = (returns || []).filter(ret => ret.receiptId === r.id);
            
            const totalReceived = r.totalQty || 0;
            const totalManifested = mForReceipt.reduce((sum, l) => sum + (l.loadQty || 0), 0);
            const totalReturned = rForReceipt.reduce((sum, ret) => sum + (ret.totalReturnQty || 0), 0);
            const activeInWH = Math.max(0, totalReceived - totalManifested - totalReturned);

            return (
              <div key={`shipment-${r.id}`} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-blue-50 p-6 border-b border-blue-100 flex justify-between items-start">
                  <div>
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 inline-block">Shipment Record</span>
                    <h3 className="text-2xl font-black text-blue-900 cursor-pointer hover:underline" onClick={() => { setActiveTab('new-receipt'); setEditReceiptId(r.id); setGlobalTrackSearch(''); }}>{r.id}</h3>
                    <p className="text-sm text-blue-700 mt-1 font-medium">Date Received: {formatDate(r.date)} | Shipper DO: <span className="font-mono">{r.shipperDoNo || '-'}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase font-bold text-blue-500">Route</p>
                    <p className="text-lg font-bold text-blue-900">{r.pol && r.pod ? `${r.pol} → ${r.pod}` : 'Cross Dock'}</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pb-6 border-b border-slate-100">
                    <div><p className="text-xs uppercase font-bold text-slate-400">Customer</p><p className="font-semibold text-slate-800">{r.customer}</p></div>
                    <div><p className="text-xs uppercase font-bold text-slate-400">Consignor</p><p className="font-semibold text-slate-800">{r.consignor}</p></div>
                    <div><p className="text-xs uppercase font-bold text-slate-400">Consignee</p><p className="font-semibold text-slate-800">{r.consignee}</p></div>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs uppercase font-bold text-slate-400 mb-2">Lifecycle Quantity Breakdown</p>
                    <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex-1 text-center border-r border-slate-200"><p className="text-2xl font-black text-slate-700">{totalReceived}</p><p className="text-xs text-slate-500 uppercase">Total Received</p></div>
                      <div className="flex-1 text-center border-r border-slate-200"><p className="text-2xl font-black text-teal-600">{totalManifested}</p><p className="text-xs text-slate-500 uppercase">Manifested</p></div>
                      <div className="flex-1 text-center border-r border-slate-200"><p className="text-2xl font-black text-orange-600">{totalReturned}</p><p className="text-xs text-slate-500 uppercase">Returned</p></div>
                      <div className="flex-1 text-center"><p className="text-2xl font-black text-blue-600">{activeInWH}</p><p className="text-xs text-slate-500 uppercase">Active in WH</p></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center"><Ship className="w-5 h-5 mr-2 text-teal-600"/> Assigned Manifests</h4>
                      {mForReceipt.length === 0 ? <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded">No cargo loaded to containers yet.</p> : (
                        <div className="space-y-3">
                          {mForReceipt.map((m, idx) => (
                            <div key={idx} className="p-3 border border-teal-200 rounded-lg bg-teal-50/30">
                              <div className="flex justify-between border-b border-teal-100 pb-2 mb-2">
                                <span className="font-bold text-teal-800">{m.mId}</span>
                                <span className="text-xs text-teal-600 font-medium">{formatDate(m.date)}</span>
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-slate-500">Container / Seal:</span> <span className="font-semibold text-slate-800">{m.cNo || '-'} / {m.seal || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">House BL:</span> <span className="font-mono font-bold text-slate-800">{m.hblNo || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Job No:</span> <span className="font-medium text-slate-800">{m.job || '-'}</span></div>
                                <div className="flex justify-between pt-1 border-t border-teal-100 mt-1"><span className="text-slate-500">Cargo Loaded:</span> <span className="font-black text-teal-700">{m.loadQty} {m.uom} ({m.product})</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center"><Undo2 className="w-5 h-5 mr-2 text-orange-600"/> Return Notes</h4>
                      {rForReceipt.length === 0 ? <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded">No returns issued.</p> : (
                        <div className="space-y-3">
                          {rForReceipt.map((ret, idx) => (
                            <div key={idx} className="p-3 border border-orange-200 rounded-lg bg-orange-50/30">
                              <div className="flex justify-between border-b border-orange-100 pb-2 mb-2">
                                <span className="font-bold text-orange-800">{ret.id}</span>
                                <span className="text-xs text-orange-600 font-medium">{formatDate(ret.date)}</span>
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between"><span className="text-slate-500">Reason:</span> <span className="font-medium text-slate-800">{ret.reason || '-'}</span></div>
                                <div className="flex justify-between pt-1 border-t border-orange-100 mt-1"><span className="text-slate-500">Total Returned:</span> <span className="font-black text-orange-700">{ret.totalReturnQty}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          } else if (result.type === 'pickup') {
            const p = result.data;
            return (
              <div key={`pickup-${p.id}`} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex justify-between items-start">
                  <div>
                    <span className="bg-indigo-600 text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 inline-block">Pickup Request</span>
                    <h3 className="text-2xl font-black text-indigo-900 cursor-pointer hover:underline" onClick={() => { setActiveTab('new-pickup'); setEditPickupId(p.id); setGlobalTrackSearch(''); }}>{p.id}</h3>
                    <p className="text-sm text-indigo-700 mt-1 font-medium">Date: {formatDate(p.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase font-bold text-indigo-500">Status / Linked Shipmnt</p>
                    <p className="text-lg font-bold text-indigo-900">{p.linkedSid ? (
                      <span className="text-indigo-900">{p.linkedSid}</span>
                    ) : 'Pending / Not Received'}</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><p className="text-xs uppercase font-bold text-slate-400">Customer</p><p className="font-semibold text-slate-800">{p.customerName || '-'}</p></div>
                    <div><p className="text-xs uppercase font-bold text-slate-400">Consignor</p><p className="font-semibold text-slate-800">{p.consignorName || '-'}</p></div>
                    <div><p className="text-xs uppercase font-bold text-slate-400">Transporter</p><p className="font-semibold text-slate-800">{p.pickupPartyName || '-'}</p></div>
                  </div>
                </div>
              </div>
            );
          } else if (result.type === 'return') {
            const ret = result.data;
            return (
              <div key={`return-${ret.id}`} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-orange-50 p-6 border-b border-orange-100 flex justify-between items-start">
                  <div>
                    <span className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 inline-block">Return Note</span>
                    <h3 className="text-2xl font-black text-orange-900 cursor-pointer hover:underline" onClick={() => { setActiveTab('new-return'); setEditReturnId(ret.id); setGlobalTrackSearch(''); }}>{ret.id}</h3>
                    <p className="text-sm text-orange-700 mt-1 font-medium">Date: {formatDate(ret.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase font-bold text-orange-500">Qty Returned</p>
                    <p className="text-lg font-bold text-orange-900">{ret.totalReturnQty} PKG</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-sm text-slate-700 mb-4">
                    <span className="font-semibold mr-2 block mb-1">Reason:</span>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">{ret.reason || '-'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                    <div>
                      <span className="font-semibold mr-2 text-slate-400 uppercase">From Shipment:</span>
                      <span className="text-slate-800 font-mono font-bold">{ret.receiptId}</span>
                    </div>
                    <div>
                      <span className="font-semibold mr-2 text-slate-400 uppercase">DO No:</span>
                      <span className="text-slate-800 font-mono font-bold">{ret.doNo || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          } else if (result.type === 'manifest') {
            const m = result.data;
            return (
              <div key={`manifest-${m.id}`} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-teal-50 p-6 border-b border-teal-100 flex justify-between items-start">
                  <div>
                    <span className="bg-teal-600 text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 inline-block">Manifest</span>
                    <h3 className="text-2xl font-black text-teal-900 cursor-pointer hover:underline" onClick={() => { setActiveTab('new-manifest'); setEditManifestId(m.id); setGlobalTrackSearch(''); }}>{m.id}</h3>
                    <p className="text-sm text-teal-700 mt-1 font-medium">Date: {formatDate(m.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase font-bold text-teal-500">Dest / Hub</p>
                    <p className="text-lg font-bold text-teal-900">{m.destination || '-'}</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><p className="text-xs uppercase font-bold text-slate-400">Vessel/Voyage</p><p className="font-semibold text-slate-800">{m.vessel || '-'}</p></div>
                    <div><p className="text-xs uppercase font-bold text-slate-400">Container Number</p><p className="font-semibold font-mono text-slate-800">{m.containerNo || '-'}</p></div>
                    <div><p className="text-xs uppercase font-bold text-slate-400">Job No</p><p className="font-semibold text-slate-800">{m.jobNo || '-'}</p></div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-sm text-slate-600">
                      <span className="font-semibold mr-2 uppercase text-slate-400">Total Lines Loaded:</span>
                      <span className="text-slate-800 font-bold">{m.lines?.length || 0} Lines</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          } else if (result.type === 'commercial_invoice') {
            const ci = result.data;
            return (
              <div key={`commercial_invoice-${ci.id}`} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-purple-50 p-6 border-b border-purple-100 flex justify-between items-start">
                  <div>
                    <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 inline-block">Commercial Invoice</span>
                    <h3 className="text-2xl font-black text-purple-900 cursor-pointer hover:underline" onClick={() => { setActiveTab('new-commercial-invoice'); setEditCommercialInvoiceId(ci.id); setGlobalTrackSearch(''); }}>{ci.id}</h3>
                    <p className="text-sm text-purple-700 mt-1 font-medium">Date: {ci.invoiceDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase font-bold text-purple-500">PO Number</p>
                    <p className="text-lg font-bold text-purple-900">{ci.poNumber || '-'}</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><p className="text-xs uppercase font-bold text-slate-400">Declared Company</p><p className="font-semibold text-slate-800">{ci.declCompName || ci.declCompanyId || '-'}</p></div>
                    <div><p className="text-xs uppercase font-bold text-slate-400">Consignee</p><p className="font-semibold text-slate-800">{ci.cneCompName || ci.podConsigneeId || '-'}</p></div>
                  </div>
                  {(ci.manifestIds && ci.manifestIds.length > 0) && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center"><Ship className="w-5 h-5 mr-2 text-purple-600"/> Linked Manifests</h4>
                      <div className="space-y-2">
                        {ci.manifestIds.map((mid, idx) => (
                           <div key={idx} className="flex justify-between items-center bg-purple-50 p-3 rounded-lg border border-purple-100">
                              <span className="font-bold text-purple-900 cursor-pointer hover:underline" onClick={() => { setActiveTab('manifests'); setEditManifestId(mid); }}>{mid}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-6 flex justify-end">
                     <button onClick={() => { setEditCommercialInvoiceId(ci.id); setActiveTab('new-commercial-invoice'); }} className="px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 transition">View CIPL Record</button>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}
        {globalTrackSearch && globalTrackSearch.length >= 3 && trackingResults.length === 0 && (
          <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No Cargo Found</h3>
            <p className="text-slate-500 mt-1">No shipments match your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const MasterMaintenance = () => {
  const { 
    checkAccess, companies, setCompanies, ports, setPorts, roles, setRoles, 
    users, setUsers, warehouses, setWarehouses, containerTypes, setContainerTypes, showMessage, receipts, setReceipts, manifests, setManifests, fclTemplates, setFclTemplates, logActivity
  } = React.useContext(AppContext);

  if (!checkAccess('master_data', 'view')) return <div className="p-8 text-center text-slate-500">You do not have permission to view Master Data.</div>;

  const [activeMaster, setActiveMaster] = useState('companies');
  const [editingItem, setEditingItem] = useState(null); 

  const generateEmptyPermissions = () => {
    const perms = {};
    MODULE_PERMISSIONS.forEach(mod => {
      perms[mod.id] = {};
      mod.actions.forEach(act => perms[mod.id][act] = false);
    });
    return perms;
  };

  const getActiveState = () => {
    switch(activeMaster) {
      case 'companies': return { data: companies, setter: setCompanies, label: 'Company', isComplex: true };
      case 'ports': return { data: ports, setter: setPorts, label: 'Port (POL/POD)', isComplex: true };
      case 'roles': return { data: roles, setter: setRoles, label: 'Role', isRole: true };
      case 'users': return { data: users, setter: setUsers, label: 'User', isUser: true };
      case 'warehouses': return { data: warehouses, setter: setWarehouses, label: 'Warehouse', isComplex: true };
      case 'containerTypes': return { data: containerTypes, setter: setContainerTypes, label: 'Container Type', isContainerType: true };
      case 'fclTemplates': return { data: fclTemplates, setter: setFclTemplates, label: 'FCL Cost Template', isFclTemplate: true };
      default: return { data: [], setter: () => {}, label: '', isComplex: false };
    }
  };

  const { data, setter, label, isComplex, isRole, isUser, isContainerType, isFclTemplate } = getActiveState();

  const handleDeleteComplex = (id) => {
    if (!checkAccess('master_data', 'edit')) return showMessage("You do not have edit permissions for Master Data.");
    if (id === 'user-superadmin' || id === 'role-superadmin') return showMessage("System defaults cannot be deleted.");
    if (confirm(`Are you sure you want to delete this ${label}?`)) {
      deleteDoc(doc(db, activeMaster, id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `${activeMaster}/${id}`));
      logActivity('DELETE', 'Master Data', id, `Deleted ${label} record`);
    }
  };

  const [formData, setFormData] = useState({
    id: '', name: '', isCustomer: false, isConsignee: false, isConsignor: false,
    isWarehouseOperator: false, isTransporter: false, isHaulier: false, isManpowerSupply: false, groupJSSTExempted: false, isLinerBroker: false,
    companyEmail: '', tin: '', sstNumber: '', roc: '', contactNumber: '',
    addressLine1: '', addressLine2: '', addressLine3: '', postalCode: '', city: '', state: '', country: '',
    contactPersons: [], deliveryAddresses: [], pickupAddresses: [], warehouseAddresses: [],
    username: '', password: '', roleId: '', portName: '',
    pol: '', pod: '', templateVendors: [], templateCustomers: [], items: [],
    permissions: generateEmptyPermissions()
  });

  const openForm = (item = null) => {
    if (!checkAccess('master_data', 'edit')) return showMessage("You do not have edit permissions for Master Data.");
    if (item && (item.id === 'user-superadmin' || item.id === 'role-superadmin')) return showMessage("System defaults cannot be edited.");

    if (item) {
      setFormData({
        ...item,
        addressLine1: item.addressLine1 || '', addressLine2: item.addressLine2 || '', addressLine3: item.addressLine3 || '', 
        city: item.city || '', state: item.state || '', postalCode: item.postalCode || '', country: item.country || '',
        companyEmail: item.companyEmail || '', sstNumber: item.sstNumber || '',
        isWarehouseOperator: item.isWarehouseOperator || false, isTransporter: item.isTransporter || false, 
        isHaulier: item.isHaulier || false, isManpowerSupply: item.isManpowerSupply || false, groupJSSTExempted: item.groupJSSTExempted || false, isLinerBroker: item.isLinerBroker || false,
        permissions: item.permissions || generateEmptyPermissions()
      });
    } else {
      const newId = `id-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setFormData({ 
        id: newId, name: '', shortform: '', isCustomer: false, isConsignee: false, isConsignor: false, 
        isTransporter: false, isHaulier: false, isManpowerSupply: false, groupJSSTExempted: false, isLinerBroker: false, isDeclaredCompany: false,
        companyEmail: '', tin: '', sstNumber: '', roc: '', contactNumber: '',
        addressLine1: '', addressLine2: '', addressLine3: '', postalCode: '', city: '', state: '', country: '', portName: '',
        contactPersons: [], deliveryAddresses: [], pickupAddresses: [], warehouseAddresses: [],
        username: '', password: '', roleId: '', companyId: '', isActive: true,
        isWarehouseOperator: false, isLogisticsOps: false,
        type: '', maxCbm: '', maxWeight: '',
        pol: '', pod: '', templateVendors: [], templateCustomers: [], items: [],
        permissions: generateEmptyPermissions()
      });
    }
    setEditingItem(item ? 'edit' : 'add');
  };

  const saveForm = async () => {
    if (activeMaster === 'companies' || activeMaster === 'ports' || activeMaster === 'roles') {
      if (!formData.name || !formData.name.trim()) return showMessage("Name is required.");
    }
    if (activeMaster === 'containerTypes') {
      if (!formData.type || !formData.type.trim()) return showMessage("Container Type is required.");
    }
    if (activeMaster === 'fclTemplates') {
      if (!formData.name || !formData.name.trim()) return showMessage("Template Name is required.");
    }
    if (activeMaster === 'users') {
      if (!editingItem || editingItem === 'add') formData.password = 'ABCD@1234';
      if (!formData.username || !formData.username.trim() || !formData.password || !formData.password.trim() || !formData.roleId) return showMessage("Username, Password, and Role are required.");
    }

    const finalData = { ...formData };
    if (activeMaster === 'users' && (!editingItem || editingItem === 'add')) {
      finalData.isFirstLogin = true;
    }

    try {
      if (editingItem === 'edit') {
        if (activeMaster === 'ports') {
          const oldPort = (data || []).find(d => d.id === finalData.id);
          if (oldPort && oldPort.name !== finalData.name) {
            (receipts || []).filter(r => r.pol === oldPort.name || r.pod === oldPort.name).forEach(r => {
               updateDoc(doc(db, 'receipts', r.id), { 
                 pol: r.pol === oldPort.name ? finalData.name : r.pol, 
                 pod: r.pod === oldPort.name ? finalData.name : r.pod 
               });
            });
          }
        }
        await setDoc(doc(db, activeMaster, finalData.id), finalData);
        logActivity('UPDATE', 'Master Data', finalData.id, `Updated ${label} record`);
      } else {
        await setDoc(doc(db, activeMaster, finalData.id), finalData);
        logActivity('CREATE', 'Master Data', finalData.id, `Created ${label} record`);
      }
      
      setEditingItem(null);
      showMessage(`${label} saved successfully.`, 'success');
    } catch (err) {
      console.error("Save Form Error: ", err);
      showMessage(`Error saving ${label}: ${err.message}`, 'error');
    }
  };

  const updateForm = (field, value) => {
    let val = value;
    if (typeof val === 'string' && !['companyEmail', 'password', 'username', 'roleId'].includes(field)) {
      val = val.toUpperCase();
    }
    setFormData({ ...formData, [field]: val });
  };
  const togglePermission = (modId, action) => {
    const newPerms = { ...formData.permissions };
    newPerms[modId] = { ...newPerms[modId], [action]: !newPerms[modId][action] };
    setFormData({ ...formData, permissions: newPerms });
  };
  const toggleArrayItem = (listName, itemId) => {
    const list = formData[listName] || [];
    if (list.includes(itemId)) {
      setFormData({ ...formData, [listName]: list.filter(id => id !== itemId) });
    } else {
      setFormData({ ...formData, [listName]: [...list, itemId] });
    }
  };

  const addListRow = (listName, emptyObj) => setFormData({ ...formData, [listName]: [...(formData[listName] || []), emptyObj] });
  const updateListRow = (listName, index, field, value) => {
    const newList = [...(formData[listName] || [])];
    let val = value;
    if (typeof val === 'string' && !['email'].includes(field)) {
      val = val.toUpperCase();
    }
    newList[index] = { ...newList[index], [field]: val };
    setFormData({ ...formData, [listName]: newList });
  };
  const removeListRow = (listName, index) => setFormData({ ...formData, [listName]: (formData[listName] || []).filter((_, i) => i !== index) });

  const handleSameAsMainAddress = (listName, index, checked) => {
    const newList = [...(formData[listName] || [])];
    if (checked) {
      newList[index] = {
        ...newList[index],
        isMainAddress: true,
        companyName: formData.name || '',
        line1: formData.addressLine1 || '',
        line2: formData.addressLine2 || '',
        line3: formData.addressLine3 || '',
        postalCode: formData.postalCode || '',
        city: formData.city || '',
        state: formData.state || '',
        country: formData.country || '',
        contactNumber: formData.contactNumber || '',
        email: formData.companyEmail || ''
      };
    } else {
      newList[index] = { ...newList[index], isMainAddress: false };
    }
    setFormData({ ...formData, [listName]: newList });
  };

  if (editingItem) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">{editingItem === 'add' ? 'Add' : 'Edit'} {label}</h2>
          <button onClick={() => setEditingItem(null)} className="text-slate-500 hover:text-slate-700 font-medium flex items-center"><X className="w-4 h-4 mr-1"/> Cancel</button>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {(activeMaster === 'companies' || activeMaster === 'roles' || activeMaster === 'warehouses') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{label} Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" />
              </div>
            )}

            {activeMaster === 'companies' && (
              <div className="md:col-span-2 mt-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Shortform</label>
                <input type="text" value={formData.shortform || ''} onChange={(e) => updateForm('shortform', e.target.value.toUpperCase())} maxLength={6} className="w-full md:w-1/3 p-2 border border-slate-300 rounded-md font-mono" placeholder="e.g. ABC" />
                <p className="text-xs text-slate-500 mt-1">Used for document numbering like CIPL-YYMM-SHORTFORM-XXXX.</p>
                
                {editingItem === 'edit' && (
                  <div className="mt-6 border-t pt-4">
                    <h4 className="text-sm font-bold text-slate-800 mb-3">Assigned Users</h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className="p-2 font-semibold">Username</th>
                            <th className="p-2 font-semibold">Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {users.filter((u: any) => u.companyId === formData.id).length === 0 ? (
                            <tr><td colSpan={2} className="p-4 text-center text-slate-400 italic">No users assigned to this company.</td></tr>
                          ) : (
                            users.filter((u: any) => u.companyId === formData.id).map((u: any) => (
                              <tr key={u.id} className="bg-white">
                                <td className="p-2 font-medium">{u.username}</td>
                                <td className="p-2">{(roles.find((r: any) => r.id === u.roleId) as any)?.name || u.roleId}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeMaster === 'containerTypes' && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Container Type <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.type || ''} onChange={(e) => updateForm('type', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. 40HC" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Max CBM</label>
                  <input type="number" step="0.01" value={formData.maxCbm || ''} onChange={(e) => updateForm('maxCbm', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. 65" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Default Max Weight (kg)</label>
                  <input type="number" step="1" value={formData.maxWeight || ''} onChange={(e) => updateForm('maxWeight', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. 22000" />
                </div>
              </>
            )}

            {activeMaster === 'fclTemplates' && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Template Name <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. Port Klang to Singapore standard" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">POL (Origin)</label>
                  <input list="portListMaster" value={formData.pol || ''} onChange={(e) => updateForm('pol', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" />
                  <datalist id="portListMaster">
                    {(ports || []).map(p => <option key={p.id} value={p.name}>{p.portName ? `${p.name} - ${p.portName}` : p.name}</option>)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">POD (Destination)</label>
                  <input list="portListMaster" value={formData.pod || ''} onChange={(e) => updateForm('pod', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" />
                </div>
                <div className="md:col-span-2 space-y-4 border-t pt-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-semibold text-slate-700">Cost Template Items</label>
                      <button type="button" onClick={() => addListRow('items', { section: '', description: '', cost: '', costCurrency: 'USD', selling: '', sellingCurrency: 'USD' })} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">+ Add Row</button>
                    </div>
                    {(formData.items || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 mb-2 items-start bg-slate-50 p-2 rounded border border-slate-200">
                        <input type="text" placeholder="Section" value={item.section} onChange={(e) => updateListRow('items', idx, 'section', e.target.value)} className="w-1/5 p-1.5 text-sm border border-slate-300 rounded" />
                        <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateListRow('items', idx, 'description', e.target.value)} className="w-2/5 p-1.5 text-sm border border-slate-300 rounded" />
                        <div className="w-[15%] flex rounded border border-slate-300 bg-white">
                          <input type="text" value={item.costCurrency} onChange={(e) => updateListRow('items', idx, 'costCurrency', e.target.value.toUpperCase())} className="w-1/3 p-1.5 text-sm border-r focus:outline-none" placeholder="Curr" />
                          <input type="number" value={item.cost} onChange={(e) => updateListRow('items', idx, 'cost', e.target.value)} className="w-2/3 p-1.5 text-sm text-right focus:outline-none" placeholder="Cost" />
                        </div>
                        <div className="w-[15%] flex rounded border border-slate-300 bg-white">
                          <input type="text" value={item.sellingCurrency} onChange={(e) => updateListRow('items', idx, 'sellingCurrency', e.target.value.toUpperCase())} className="w-1/3 p-1.5 text-sm border-r focus:outline-none" placeholder="Curr" />
                          <input type="number" value={item.selling} onChange={(e) => updateListRow('items', idx, 'selling', e.target.value)} className="w-2/3 p-1.5 text-sm text-right focus:outline-none" placeholder="Sell" />
                        </div>
                        <button type="button" onClick={() => removeListRow('items', idx)} className="p-1.5 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {(formData.items || []).length === 0 && <p className="text-sm text-slate-500 italic">No cost items defined in this template.</p>}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4 border-t pt-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Vendors (Apply to)</label>
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded bg-slate-50 p-2 space-y-1">
                          {companies.filter(c => c.isTransporter || c.isHaulier || c.isWarehouseOperator || c.isLinerBroker || c.isManpowerSupply).map(c => (
                            <label key={c.id} className="flex items-center space-x-2 text-sm cursor-pointer p-1 hover:bg-white rounded">
                              <input type="checkbox" checked={(formData.templateVendors || []).includes(c.id)} onChange={() => toggleArrayItem('templateVendors', c.id)} className="rounded" />
                              <span>{c.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Customers (Apply to)</label>
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded bg-slate-50 p-2 space-y-1">
                          {companies.filter(c => c.isCustomer).map(c => (
                            <label key={c.id} className="flex items-center space-x-2 text-sm cursor-pointer p-1 hover:bg-white rounded">
                              <input type="checkbox" checked={(formData.templateCustomers || []).includes(c.id)} onChange={() => toggleArrayItem('templateCustomers', c.id)} className="rounded" />
                              <span>{c.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                   </div>
                </div>
              </>
            )}

            {activeMaster === 'ports' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Port Code <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. MYPKG" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Port Name</label>
                  <input type="text" value={formData.portName || ''} onChange={(e) => updateForm('portName', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. Port Klang" />
                </div>
              </>
            )}

            {activeMaster === 'users' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.username || ''} onChange={(e) => updateForm('username', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" />
                </div>
                {editingItem === 'edit' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <div className="flex">
                      <button type="button" onClick={() => { 
                          updateForm('password', 'ABCD@1234'); 
                          updateForm('isFirstLogin', true); 
                          alert('Password has been reset to ABCD@1234. The user will be prompted to change it on their next login.');
                        }} className="bg-slate-200 px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-md hover:bg-slate-300 font-semibold">
                          Reset Password
                      </button>
                    </div>
                  </div>
                )}
                {editingItem === 'add' && (
                  <div className="text-sm text-slate-500 my-2">
                    Note: New users will be created with the default password <strong>ABCD@1234</strong> and will be prompted to change it upon first login.
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign Role <span className="text-red-500">*</span></label>
                  <select value={formData.roleId || ''} onChange={(e) => updateForm('roleId', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                    <option value="">-- Select Role --</option>
                    {(roles || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div className="flex space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={formData.isWarehouseOperator || false} onChange={(e) => updateForm('isWarehouseOperator', e.target.checked)} className="rounded text-blue-600 w-4 h-4"/>
                      <span className="text-sm font-semibold text-slate-700">Is Warehouse Operator</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={formData.isLogisticsOps || false} onChange={(e) => updateForm('isLogisticsOps', e.target.checked)} className="rounded text-blue-600 w-4 h-4"/>
                      <span className="text-sm font-semibold text-slate-700">Is Logistics Ops (Manifesting/Booking)</span>
                    </label>
                  </div>
                </div>
                {formData.roleId !== 'role-superadmin' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company (Partner)</label>
                    <input list="userCompanyList" value={formData.companyId || ''} onChange={(e) => updateForm('companyId', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="Type to search company..." />
                    <datalist id="userCompanyList">
                      {(companies || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </datalist>
                  </div>
                )}
              </>
            )}

            {activeMaster === 'roles' && (
              <div className="md:col-span-2 mt-4">
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                   <h4 className="text-sm font-semibold text-slate-800">Role Permissions</h4>
                   <button type="button" onClick={() => {
                      const updatedPerms = { ...formData.permissions };
                      let allChecked = MODULE_PERMISSIONS.every(m => m.actions.every(a => updatedPerms[m.id]?.[a]));
                      MODULE_PERMISSIONS.forEach(m => {
                         if (!updatedPerms[m.id]) updatedPerms[m.id] = {};
                         m.actions.forEach(a => updatedPerms[m.id][a] = !allChecked);
                      });
                      updateForm('permissions', updatedPerms);
                   }} className="text-xs text-blue-600 hover:underline">Toggle All</button>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-semibold text-slate-700 w-1/3">Module</th>
                        {['view', 'create', 'edit', 'cancel/del', 'print', 'split'].map(col => {
                           const actionMap = { 'cancel/del': ['cancel', 'delete'] };
                           const checks = actionMap[col] || [col];
                           return (
                             <th key={col} className="p-3 font-semibold text-slate-700 text-center">
                               <div className="flex flex-col items-center">
                                 <span>{col.charAt(0).toUpperCase() + col.slice(1)}</span>
                                 <input type="checkbox" onChange={(e) => {
                                    const checked = e.target.checked;
                                    const updatedPerms = { ...formData.permissions };
                                    MODULE_PERMISSIONS.forEach(m => {
                                       checks.forEach(a => {
                                          if (m.actions.includes(a)) {
                                             if (!updatedPerms[m.id]) updatedPerms[m.id] = {};
                                             updatedPerms[m.id][a] = checked;
                                          }
                                       });
                                    });
                                    updateForm('permissions', updatedPerms);
                                 }} className="w-3 h-3 mt-1 cursor-pointer" />
                               </div>
                             </th>
                           );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MODULE_PERMISSIONS.map(mod => {
                        const rowChecked = mod.actions.every(a => formData.permissions[mod.id]?.[a]);
                        return (
                        <tr key={mod.id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-700 flex items-center justify-between border-r border-slate-100">
                             <span>{mod.name}</span>
                             <input type="checkbox" checked={rowChecked || false} onChange={(e) => {
                                const checked = e.target.checked;
                                const updatedPerms = { ...formData.permissions };
                                if (!updatedPerms[mod.id]) updatedPerms[mod.id] = {};
                                mod.actions.forEach(a => updatedPerms[mod.id][a] = checked);
                                updateForm('permissions', updatedPerms);
                             }} className="w-3 h-3 cursor-pointer" title="Select All for this module" />
                          </td>
                          {['view', 'create', 'edit', 'cancel', 'delete', 'print', 'split'].map(act => {
                            if (!mod.actions.includes(act)) {
                              return <td key={act} className="p-3 text-center bg-slate-50/50 border-l border-slate-100"></td>;
                            }
                            if (act === 'delete') {
                              return (
                                <td key={act} className="p-3 text-center border-l border-slate-100">
                                  <input type="checkbox" checked={formData.permissions[mod.id]?.delete || false} onChange={() => togglePermission(mod.id, 'delete')} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                </td>
                              );
                            }
                            if (act === 'cancel') {
                              return (
                                <td key={act} className="p-3 text-center border-l border-slate-100">
                                  <input type="checkbox" checked={formData.permissions[mod.id]?.cancel || false} onChange={() => togglePermission(mod.id, 'cancel')} className="w-4 h-4 text-orange-600 rounded cursor-pointer" />
                                </td>
                              );
                            }
                            return (
                                <td key={act} className="p-3 text-center border-l border-slate-100">
                                  <input type="checkbox" checked={formData.permissions[mod.id]?.[act] || false} onChange={() => togglePermission(mod.id, act)} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                </td>
                            );
                          })}
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeMaster === 'warehouses' && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company (Warehouse Operator) <span className="text-red-500">*</span></label>
                  <select value={formData.companyId || ''} onChange={(e) => updateForm('companyId', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                    <option value="">-- Select Company --</option>
                    {(companies || []).filter(c => c.isWarehouseOperator).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={formData.isActive !== false} onChange={(e) => updateForm('isActive', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                    <span>Active Warehouse</span>
                  </label>
                </div>
                <div className="md:col-span-2 mt-4"><h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Full Address</h4></div>
                <div className="md:col-span-2"><input type="text" placeholder="Address Line 1" value={formData.addressLine1 || ''} onChange={(e) => updateForm('addressLine1', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div className="md:col-span-2"><input type="text" placeholder="Address Line 2" value={formData.addressLine2 || ''} onChange={(e) => updateForm('addressLine2', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div className="md:col-span-2"><input type="text" placeholder="Address Line 3" value={formData.addressLine3 || ''} onChange={(e) => updateForm('addressLine3', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div><input type="text" placeholder="Postal Code" value={formData.postalCode || ''} onChange={(e) => updateForm('postalCode', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div><input type="text" placeholder="City" value={formData.city || ''} onChange={(e) => updateForm('city', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div><input type="text" placeholder="State" value={formData.state || ''} onChange={(e) => updateForm('state', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div>
                  <select value={(formData.country || '').toUpperCase()} onChange={(e) => updateForm('country', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                    <option value="">-- Country --</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}

            {activeMaster === 'ports' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                <select value={(formData.country || '').toUpperCase()} onChange={(e) => updateForm('country', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                  <option value="">-- Select Country --</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {activeMaster === 'companies' && (
              <>
                <div className="md:col-span-2 flex flex-col gap-3 mb-2 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.isCustomer} onChange={(e) => updateForm('isCustomer', e.target.checked)} className="rounded text-blue-600 w-4 h-4"/><span className="text-sm font-bold text-slate-700">Is Customer</span></label>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.isConsignee} onChange={(e) => updateForm('isConsignee', e.target.checked)} className="rounded text-blue-600 w-4 h-4"/><span className="text-sm font-bold text-slate-700">Is Consignee</span></label>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.isConsignor} onChange={(e) => updateForm('isConsignor', e.target.checked)} className="rounded text-blue-600 w-4 h-4"/><span className="text-sm font-bold text-slate-700">Is Consignor</span></label>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.isDeclaredCompany} onChange={(e) => updateForm('isDeclaredCompany', e.target.checked)} className="rounded text-emerald-600 w-4 h-4"/><span className="text-sm font-bold text-emerald-700">Is Declared Company</span></label>
                  </div>
                  <div className="flex flex-wrap gap-6 pt-3 border-t border-slate-200">
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.isWarehouseOperator} onChange={(e) => updateForm('isWarehouseOperator', e.target.checked)} className="rounded text-indigo-600 w-4 h-4"/><span className="text-sm font-semibold text-slate-600">Is Warehouse Operator</span></label>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.isTransporter} onChange={(e) => updateForm('isTransporter', e.target.checked)} className="rounded text-indigo-600 w-4 h-4"/><span className="text-sm font-semibold text-slate-600">Is Transporter</span></label>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.isHaulier} onChange={(e) => updateForm('isHaulier', e.target.checked)} className="rounded text-indigo-600 w-4 h-4"/><span className="text-sm font-semibold text-slate-600">Is Haulier</span></label>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.isManpowerSupply} onChange={(e) => updateForm('isManpowerSupply', e.target.checked)} className="rounded text-indigo-600 w-4 h-4"/><span className="text-sm font-semibold text-slate-600">Is Manpower Supply</span></label>
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.isLinerBroker} onChange={(e) => updateForm('isLinerBroker', e.target.checked)} className="rounded text-indigo-600 w-4 h-4"/><span className="text-sm font-semibold text-slate-600">Is Liner/Broker</span></label>
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Company Email</label><input type="email" value={formData.companyEmail || ''} onChange={(e) => updateForm('companyEmail', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label><input type="text" value={formData.contactNumber || ''} onChange={(e) => updateForm('contactNumber', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">ROC Number</label><input type="text" value={formData.roc || ''} onChange={(e) => updateForm('roc', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">TIN (for e-invoice)</label><input type="text" value={formData.tin || ''} onChange={(e) => updateForm('tin', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">SST Number</label><input type="text" value={formData.sstNumber || ''} onChange={(e) => updateForm('sstNumber', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                  <div className="flex items-center pt-5 pl-2">
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={formData.groupJSSTExempted} onChange={(e) => updateForm('groupJSSTExempted', e.target.checked)} className="rounded text-purple-600 w-5 h-5 focus:ring-purple-500"/><span className="text-sm font-black text-purple-800">Group J SST Exempted</span></label>
                  </div>
                </div>

                <div className="md:col-span-2 mt-4"><h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Main Address</h4></div>
                <div className="md:col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Address Line 1</label><input type="text" value={formData.addressLine1 || ''} onChange={(e) => updateForm('addressLine1', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Address Line 2</label><input type="text" value={formData.addressLine2 || ''} onChange={(e) => updateForm('addressLine2', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Address Line 3</label><input type="text" value={formData.addressLine3 || ''} onChange={(e) => updateForm('addressLine3', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Postal Code</label><input type="text" value={formData.postalCode || ''} onChange={(e) => updateForm('postalCode', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">City</label><input type="text" value={formData.city || ''} onChange={(e) => updateForm('city', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">State</label><input type="text" value={formData.state || ''} onChange={(e) => updateForm('state', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Country</label>
                  <select value={(formData.country || '').toUpperCase()} onChange={(e) => updateForm('country', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                    <option value="">-- Select --</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {activeMaster === 'companies' && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-slate-800">Delivery Addresses</h4>
                <button onClick={() => addListRow('deliveryAddresses', { companyName: '', line1: '', line2: '', line3: '', postalCode: '', city: '', state: '', country: '', picName: '', contactNumber: '', email: '' })} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">+ Add Address</button>
              </div>
              <div className="space-y-4">
                {(formData.deliveryAddresses || []).map((da, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                    <button onClick={() => removeListRow('deliveryAddresses', idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
                    <div className="mb-3">
                      <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={!!da.isMainAddress} onChange={(e) => handleSameAsMainAddress('deliveryAddresses', idx, e.target.checked)} className="rounded text-blue-600 w-4 h-4"/><span className="text-sm font-semibold text-slate-700">Same as Main Address</span></label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div className="md:col-span-2"><input type="text" placeholder="Location Company Name" value={da.companyName || ''} onChange={(e) => updateListRow('deliveryAddresses', idx, 'companyName', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm font-semibold border border-slate-300 rounded-md bg-white disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="text" placeholder="Address Line 1" value={da.line1 || ''} onChange={(e) => updateListRow('deliveryAddresses', idx, 'line1', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="text" placeholder="Address Line 2" value={da.line2 || ''} onChange={(e) => updateListRow('deliveryAddresses', idx, 'line2', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="text" placeholder="Address Line 3" value={da.line3 || ''} onChange={(e) => updateListRow('deliveryAddresses', idx, 'line3', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div><input type="text" placeholder="Postal Code" value={da.postalCode || ''} onChange={(e) => updateListRow('deliveryAddresses', idx, 'postalCode', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div><input type="text" placeholder="City" value={da.city || ''} onChange={(e) => updateListRow('deliveryAddresses', idx, 'city', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div><input type="text" placeholder="State" value={da.state || ''} onChange={(e) => updateListRow('deliveryAddresses', idx, 'state', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div>
                        <select value={(da.country || '').toUpperCase()} onChange={(e) => updateListRow('deliveryAddresses', idx, 'country', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100">
                          <option value="">-- Country --</option>
                          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2 pt-2 border-t border-slate-200 mt-2"><p className="text-xs font-semibold text-slate-500 mb-2">Location Contact details</p></div>
                      <div><input type="text" placeholder="PIC Name" value={da.picName || ''} onChange={(e) => updateListRow('deliveryAddresses', idx, 'picName', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded-md" /></div>
                      <div><input type="text" placeholder="Contact Number" value={da.contactNumber || ''} onChange={(e) => updateListRow('deliveryAddresses', idx, 'contactNumber', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="email" placeholder="Email Address" value={da.email || ''} onChange={(e) => updateListRow('deliveryAddresses', idx, 'email', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                    </div>
                  </div>
                ))}
                {(formData.deliveryAddresses || []).length === 0 && <p className="text-xs text-slate-500 italic">No additional delivery addresses saved.</p>}
              </div>

              <div className="flex justify-between items-center mb-2 mt-6">
                <h4 className="text-sm font-semibold text-slate-800">Pickup Addresses</h4>
                <button onClick={() => addListRow('pickupAddresses', { companyName: '', line1: '', line2: '', line3: '', postalCode: '', city: '', state: '', country: '', picName: '', contactNumber: '', email: '' })} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">+ Add Address</button>
              </div>
              <div className="space-y-4">
                {(formData.pickupAddresses || []).map((da, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                    <button onClick={() => removeListRow('pickupAddresses', idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
                    <div className="mb-3">
                      <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={!!da.isMainAddress} onChange={(e) => handleSameAsMainAddress('pickupAddresses', idx, e.target.checked)} className="rounded text-blue-600 w-4 h-4"/><span className="text-sm font-semibold text-slate-700">Same as Main Address</span></label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div className="md:col-span-2"><input type="text" placeholder="Location Company Name" value={da.companyName || ''} onChange={(e) => updateListRow('pickupAddresses', idx, 'companyName', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm font-semibold border border-slate-300 rounded-md bg-white disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="text" placeholder="Address Line 1" value={da.line1 || ''} onChange={(e) => updateListRow('pickupAddresses', idx, 'line1', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="text" placeholder="Address Line 2" value={da.line2 || ''} onChange={(e) => updateListRow('pickupAddresses', idx, 'line2', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="text" placeholder="Address Line 3" value={da.line3 || ''} onChange={(e) => updateListRow('pickupAddresses', idx, 'line3', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div><input type="text" placeholder="Postal Code" value={da.postalCode || ''} onChange={(e) => updateListRow('pickupAddresses', idx, 'postalCode', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div><input type="text" placeholder="City" value={da.city || ''} onChange={(e) => updateListRow('pickupAddresses', idx, 'city', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div><input type="text" placeholder="State" value={da.state || ''} onChange={(e) => updateListRow('pickupAddresses', idx, 'state', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div>
                        <select value={(da.country || '').toUpperCase()} onChange={(e) => updateListRow('pickupAddresses', idx, 'country', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100">
                          <option value="">-- Country --</option>
                          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2 pt-2 border-t border-slate-200 mt-2"><p className="text-xs font-semibold text-slate-500 mb-2">Location Contact details</p></div>
                      <div><input type="text" placeholder="PIC Name" value={da.picName || ''} onChange={(e) => updateListRow('pickupAddresses', idx, 'picName', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded-md" /></div>
                      <div><input type="text" placeholder="Contact Number" value={da.contactNumber || ''} onChange={(e) => updateListRow('pickupAddresses', idx, 'contactNumber', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="email" placeholder="Email Address" value={da.email || ''} onChange={(e) => updateListRow('pickupAddresses', idx, 'email', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                    </div>
                  </div>
                ))}
                {(formData.pickupAddresses || []).length === 0 && <p className="text-xs text-slate-500 italic">No additional pickup addresses saved.</p>}
              </div>

              <div className="flex justify-between items-center mb-2 mt-6">
                <h4 className="text-sm font-semibold text-slate-800">Warehouse Addresses</h4>
                <button onClick={() => addListRow('warehouseAddresses', { companyName: '', line1: '', line2: '', line3: '', postalCode: '', city: '', state: '', country: '', picName: '', contactNumber: '', email: '' })} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">+ Add Address</button>
              </div>
              <div className="space-y-4">
                {(formData.warehouseAddresses || []).map((da, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative">
                    <button onClick={() => removeListRow('warehouseAddresses', idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
                    <div className="mb-3">
                      <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={!!da.isMainAddress} onChange={(e) => handleSameAsMainAddress('warehouseAddresses', idx, e.target.checked)} className="rounded text-blue-600 w-4 h-4"/><span className="text-sm font-semibold text-slate-700">Same as Main Address</span></label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                      <div className="md:col-span-2"><input type="text" placeholder="Location Company Name" value={da.companyName || ''} onChange={(e) => updateListRow('warehouseAddresses', idx, 'companyName', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm font-semibold border border-slate-300 rounded-md bg-white disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="text" placeholder="Address Line 1" value={da.line1 || ''} onChange={(e) => updateListRow('warehouseAddresses', idx, 'line1', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="text" placeholder="Address Line 2" value={da.line2 || ''} onChange={(e) => updateListRow('warehouseAddresses', idx, 'line2', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="text" placeholder="Address Line 3" value={da.line3 || ''} onChange={(e) => updateListRow('warehouseAddresses', idx, 'line3', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div><input type="text" placeholder="Postal Code" value={da.postalCode || ''} onChange={(e) => updateListRow('warehouseAddresses', idx, 'postalCode', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div><input type="text" placeholder="City" value={da.city || ''} onChange={(e) => updateListRow('warehouseAddresses', idx, 'city', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div><input type="text" placeholder="State" value={da.state || ''} onChange={(e) => updateListRow('warehouseAddresses', idx, 'state', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div>
                        <select value={(da.country || '').toUpperCase()} onChange={(e) => updateListRow('warehouseAddresses', idx, 'country', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100">
                          <option value="">-- Country --</option>
                          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2 pt-2 border-t border-slate-200 mt-2"><p className="text-xs font-semibold text-slate-500 mb-2">Location Contact details</p></div>
                      <div><input type="text" placeholder="PIC Name" value={da.picName || ''} onChange={(e) => updateListRow('warehouseAddresses', idx, 'picName', e.target.value)} className="w-full p-1.5 text-sm border border-slate-300 rounded-md" /></div>
                      <div><input type="text" placeholder="Contact Number" value={da.contactNumber || ''} onChange={(e) => updateListRow('warehouseAddresses', idx, 'contactNumber', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                      <div className="md:col-span-2"><input type="email" placeholder="Email Address" value={da.email || ''} onChange={(e) => updateListRow('warehouseAddresses', idx, 'email', e.target.value)} disabled={da.isMainAddress} className="w-full p-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100" /></div>
                    </div>
                  </div>
                ))}
                {(formData.warehouseAddresses || []).length === 0 && <p className="text-xs text-slate-500 italic">No additional warehouse addresses saved.</p>}
              </div>
            </div>
          )}

          {activeMaster === 'companies' && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-slate-800">Contact Persons</h4>
                <button onClick={() => addListRow('contactPersons', { name: '', phone: '', email: '' })} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">+ Add</button>
              </div>
              <div className="space-y-2">
                {(formData.contactPersons || []).map((cp, idx) => (
                  <div key={idx} className="flex space-x-2 bg-slate-50 p-2 rounded-md">
                    <input type="text" placeholder="Name" value={cp.name || ''} onChange={(e) => updateListRow('contactPersons', idx, 'name', e.target.value)} className="w-1/3 p-1.5 text-sm border border-slate-300 rounded-md" />
                    <input type="text" placeholder="Phone" value={cp.phone || ''} onChange={(e) => updateListRow('contactPersons', idx, 'phone', e.target.value)} className="w-1/3 p-1.5 text-sm border border-slate-300 rounded-md" />
                    <input type="email" placeholder="Email" value={cp.email || ''} onChange={(e) => updateListRow('contactPersons', idx, 'email', e.target.value)} className="w-1/3 p-1.5 text-sm border border-slate-300 rounded-md" />
                    <button onClick={() => removeListRow('contactPersons', idx)} className="text-red-400 p-1.5"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4"><button onClick={saveForm} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"><Save className="w-4 h-4 inline mr-2" />Save</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800">Master Data Maintenance</h2>
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[{ id: 'companies', name: 'Companies (Partners)' }, { id: 'ports', name: 'Ports (POL/POD)' }, { id: 'roles', name: 'Roles' }, { id: 'users', name: 'System Users' }, { id: 'warehouses', name: 'Warehouses' }, { id: 'containerTypes', name: 'Container Types' }, { id: 'fclTemplates', name: 'FCL Cost Templates' }].map(tab => (
          <button key={tab.id} onClick={() => { setActiveMaster(tab.id); setEditingItem(null); }} className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${activeMaster === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{tab.name}</button>
        ))}
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h3 className="text-lg font-semibold text-slate-800">Manage {label}s</h3>
          {checkAccess('master_data', 'edit') && (
            <button onClick={() => openForm()} className="flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm"><Plus className="w-4 h-4" /> <span>Add New</span></button>
          )}
        </div>
        
        <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-3 text-sm font-semibold">{activeMaster === 'users' ? 'Username' : (activeMaster === 'containerTypes' ? 'Container Type' : label)}</th>
              {activeMaster === 'companies' && <th className="p-3 text-sm font-semibold">Roles</th>}
              {activeMaster === 'ports' && <th className="p-3 text-sm font-semibold">Details</th>}
              {activeMaster === 'fclTemplates' && <th className="p-3 text-sm font-semibold">POL / POD</th>}
              {activeMaster === 'users' && <th className="p-3 text-sm font-semibold">Assigned Role</th>}
              {activeMaster === 'roles' && <th className="p-3 text-sm font-semibold">Permissions</th>}
              {activeMaster === 'warehouses' && <th className="p-3 text-sm font-semibold">Company</th>}
              {activeMaster === 'warehouses' && <th className="p-3 text-sm font-semibold">Status</th>}
              {activeMaster === 'containerTypes' && <th className="p-3 text-sm font-semibold">Max CBM</th>}
              {activeMaster === 'containerTypes' && <th className="p-3 text-sm font-semibold">Max Weight (kg)</th>}
              {checkAccess('master_data', 'edit') && <th className="p-3 text-sm font-semibold w-32 text-center">Act</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data || []).map((item, idx) => {
              if (!item) return null;
              return (
              <tr key={item.id || idx} className="hover:bg-slate-50">
                <td className="p-3 text-sm font-medium">{activeMaster === 'users' ? item.username : (activeMaster === 'containerTypes' ? item.type : item.name)}</td>
                
                {activeMaster === 'companies' && (
                  <td className="p-3 text-xs flex gap-1 flex-wrap">
                    {item.isCustomer && <span className="bg-blue-100 text-blue-700 px-1 rounded">CUST</span>}
                    {item.isConsignee && <span className="bg-teal-100 text-teal-700 px-1 rounded">CNEE</span>}
                    {item.isConsignor && <span className="bg-purple-100 text-purple-700 px-1 rounded">CNOR</span>}
                    {item.isDeclaredCompany && <span className="bg-emerald-100 text-emerald-700 px-1 rounded fw-bold">DECL</span>}
                    {item.isWarehouseOperator && <span className="bg-indigo-100 text-indigo-700 px-1 rounded">WHSE</span>}
                    {item.isTransporter && <span className="bg-indigo-100 text-indigo-700 px-1 rounded">TRANS</span>}
                    {item.isHaulier && <span className="bg-indigo-100 text-indigo-700 px-1 rounded">HAUL</span>}
                    {item.isManpowerSupply && <span className="bg-indigo-100 text-indigo-700 px-1 rounded">MAN</span>}
                    {item.isLinerBroker && <span className="bg-indigo-100 text-indigo-700 px-1 rounded">LINER</span>}
                  </td>
                )}
                {activeMaster === 'ports' && (
                  <td className="p-3 text-sm text-slate-600">
                    {item.portName ? <span className="font-semibold block">{item.portName}</span> : null}
                    {item.country || '-'}
                  </td>
                )}
                {activeMaster === 'fclTemplates' && (
                  <td className="p-3 text-sm text-slate-600">
                    <span className="font-semibold">{item.pol || '-'}</span> <span className="text-slate-400">to</span> <span className="font-semibold">{item.pod || '-'}</span>
                  </td>
                )}
                {activeMaster === 'users' && (
                  <td className="p-3 text-sm text-slate-600">
                    {(roles || []).find(r => r?.id === item.roleId)?.name || <span className="text-red-500">Invalid Role</span>}
                    {item.id === 'user-superadmin' && <span className="ml-2 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">System Default</span>}
                  </td>
                )}
                {activeMaster === 'roles' && (
                  <td className="p-3 text-sm text-slate-600">
                    {item.permissions === 'ALL' ? <span className="font-bold text-indigo-600">Full System Access</span> : 'Custom Permissions Matrix'}
                  </td>
                )}
                {activeMaster === 'warehouses' && (
                  <td className="p-3 text-sm text-slate-600">
                    {(companies || []).find(c => c.id === item.companyId)?.name || <span className="text-red-500">Invalid Company</span>}
                  </td>
                )}
                {activeMaster === 'warehouses' && (
                  <td className="p-3 text-sm text-slate-600">
                    {item.isActive ? <span className="text-green-600 font-semibold">Active</span> : <span className="text-slate-400">Inactive</span>}
                  </td>
                )}
                {activeMaster === 'containerTypes' && (
                  <td className="p-3 text-sm text-slate-600">
                    {item.maxCbm || '-'}
                  </td>
                )}
                {activeMaster === 'containerTypes' && (
                  <td className="p-3 text-sm text-slate-600">
                    {item.maxWeight || '-'}
                  </td>
                )}

                {checkAccess('master_data', 'edit') && (
                  <td className="p-3 text-center flex justify-center space-x-2">
                    {item.id !== 'user-superadmin' && item.id !== 'role-superadmin' ? (
                      <>
                        <button onClick={() => openForm(item)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">Edit</button>
                        {activeMaster === 'fclTemplates' && (
                          <button onClick={() => {
                            const duplicate = { ...item, id: `id-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: `${item.name} (Copy)` };
                            setDoc(doc(db, 'fclTemplates', duplicate.id), duplicate)
                              .catch(err => handleFirestoreError(err, OperationType.WRITE, `fclTemplates/${duplicate.id}`));
                            showMessage('Template duplicated', 'success');
                          }} className="text-indigo-500 hover:text-indigo-700 text-xs font-medium">Duplicate</button>
                        )}
                        <button onClick={() => handleDeleteComplex(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">System Locked</span>
                    )}
                  </td>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ActivityHistory = ({ recordId }) => {
  const { activityLogs } = React.useContext(AppContext);
  if (!recordId) return null;
  const logs = (activityLogs || []).filter((l: any) => l.recordId === recordId).sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (logs.length === 0) return null;
  
  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center"><ClipboardList className="w-4 h-4 mr-2 text-slate-500" /> Activity History</h4>
      <div className="space-y-4">
        {logs.map(log => (
          <div key={log.id} className="flex space-x-3 text-sm">
            <div className="flex-shrink-0 mt-0.5">
               <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  log.action === 'CREATE' ? 'bg-emerald-500' :
                  log.action === 'UPDATE' ? 'bg-blue-500' :
                  log.action === 'DELETE' ? 'bg-red-500' :
                  log.action === 'CANCEL' ? 'bg-orange-500' :
                  'bg-slate-400'
               }`}></div>
            </div>
            <div>
              <p className="text-slate-700 font-medium">[{log.action}] by {log.username}</p>
              <p className="text-slate-500 text-xs">{new Date(log.date).toLocaleString()} • {log.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActivityLogViewer = () => {
  const { 
    activityLogs, checkAccess, setActiveTab,
    setEditPickupId, setEditReceiptId, setEditManifestId,
    setEditBookingId, setEditHaulierBookingId, setEditReturnId,
    setEditCommercialInvoiceId
  } = React.useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');

  if (!checkAccess('activity_logs', 'view')) return <div className="p-8 text-center text-slate-500">You do not have permission to view Activity Logs.</div>;

  const filteredLogs = (activityLogs || []).filter(log => 
    Object.values(log).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleNavigate = (log) => {
    if (!log.recordId) return;
    
    switch(log.module) {
      case 'Pickup Requests':
        setEditPickupId(log.recordId);
        setActiveTab('new-pickup');
        break;
      case 'Shipment Entry':
        setEditReceiptId(log.recordId);
        setActiveTab('new-receipt');
        break;
      case 'Manifest Manager':
        setEditManifestId(log.recordId);
        setActiveTab('new-manifest');
        break;
      case 'Container Bookings':
        setEditBookingId(log.recordId);
        setActiveTab('new-booking');
        break;
      case 'Haulier Bookings':
        setEditHaulierBookingId(log.recordId);
        setActiveTab('new-haulier-booking');
        break;
      case 'Return Note':
        setEditReturnId(log.recordId);
        setActiveTab('new-return');
        break;
      case 'Commercial Invoices':
        setEditCommercialInvoiceId(log.recordId);
        setActiveTab('new-commercial-invoice');
        break;
      case 'Master Data':
        setActiveTab('master-data');
        break;
      case 'Inventory (Breakbulk)':
        setActiveTab('inventory');
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">System Activity Logs</h2>
        <div className="relative w-64">
           <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
           <input type="text" placeholder="Search logs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-700">Date/Time</th>
              <th className="p-4 text-sm font-semibold text-slate-700">User</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Module</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Action</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Record ID</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No activity logs found.</td></tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-4 text-sm text-slate-500">{new Date(log.date).toLocaleString()}</td>
                  <td className="p-4 text-sm font-medium text-slate-800">{log.username}</td>
                  <td className="p-4 text-sm text-slate-600 uppercase text-xs font-bold">{log.module}</td>
                  <td className="p-4 text-sm">
                     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                        log.action === 'CANCEL' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                     }`}>{log.action}</span>
                  </td>
                  <td className="p-4 text-sm font-mono">
                    {log.recordId ? (
                      <button 
                        onClick={() => handleNavigate(log)} 
                        className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                        title="Click to view record"
                      >
                        {log.recordId}
                      </button>
                    ) : '-'}
                  </td>
                  <td className="p-4 text-sm text-slate-500">{log.details || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SystemAdminModule = () => {
  const { 
    currentUser, 
    receiptCountersMap, setReceiptCountersMap, 
    returnCounter, setReturnCounter, 
    manifestCountersMap, setManifestCountersMap, 
    breakbulkCounter, setBreakbulkCounter, 
    hblCountersMap, setHblCountersMap,
    commercialInvoiceCountersMap, setCommercialInvoiceCountersMap,
    pickupCounter, setPickupCounter,
    bookingCounter, setBookingCounter,
    haulierCounter, setHaulierCounter,
    receipts, returns, manifests, breakbulks,
    pickups, containerBookings, haulierBookings,
    showMessage, generateShipmentId, generateManifestNo, generateCommercialInvoiceNo, generatePickupNo, generateBookingNo, generateHaulierBookingNo
  } = React.useContext(AppContext);

  if (currentUser?.roleId !== 'role-superadmin') {
    return <div className="p-8 text-center text-slate-500">Access Denied. SuperAdmin privileges required.</div>;
  }

  const handleReset = (type, setCounter, dataList) => {
    if (dataList.length > 0) {
      if (!window.confirm(`WARNING: You have ${dataList.length} existing ${type} records. Resetting the counter will cause new records to generate duplicate IDs, which may severely corrupt your database.\n\nAre you absolutely sure you want to force reset the ${type} running numbers?`)) {
        return;
      }
    }
    if (type === 'Shipment' || type === 'House BL' || type === 'Manifest') {
      setCounter({});
    } else {
      setCounter(1);
    }
    showMessage(`${type} counters have been reset.`, 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
        <ShieldAlert className="w-6 h-6 text-red-600 mt-0.5" />
        <div>
          <h2 className="text-lg font-bold text-red-800">System Admin: Reset Running Numbers</h2>
          <p className="text-sm text-red-700 mt-1">This module allows you to force reset the auto-generated running numbers. Do not use this unless you have purged your database, otherwise you will create duplicate document IDs.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-700">Sequence Type</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Next Number Will Be</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Active Records</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-sm font-medium text-slate-800">Shipments (SID)</td>
              <td className="p-4 text-sm font-mono text-blue-600">{generateShipmentId(new Date(), 'POL', 'POD', receiptCountersMap)}</td>
              <td className="p-4 text-sm text-slate-600">{(receipts || []).length}</td>
              <td className="p-4 text-center">
                <button onClick={() => handleReset('Shipment', setReceiptCountersMap, receipts || [])} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold uppercase tracking-wider">Force Reset</button>
              </td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-sm font-medium text-slate-800">Returns (RET)</td>
              <td className="p-4 text-sm font-mono text-orange-600">RET-{String(returnCounter).padStart(5, '0')}</td>
              <td className="p-4 text-sm text-slate-600">{(returns || []).length}</td>
              <td className="p-4 text-center">
                <button onClick={() => handleReset('Return', setReturnCounter, returns || [])} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold uppercase tracking-wider">Force Reset</button>
              </td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-sm font-medium text-slate-800">Manifests (MNF)</td>
              <td className="p-4 text-sm font-mono text-teal-600">{generateManifestNo(new Date(), 'POL', 'POD', manifestCountersMap)}</td>
              <td className="p-4 text-sm text-slate-600">{(manifests || []).length}</td>
              <td className="p-4 text-center">
                <button onClick={() => handleReset('Manifest', setManifestCountersMap, manifests || [])} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold uppercase tracking-wider">Force Reset</button>
              </td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-sm font-medium text-slate-800">House BL (HBL)</td>
              <td className="p-4 text-sm font-mono text-purple-600">HBL-YYMMDD-RTE-0001 <span className="text-[10px] block text-slate-400 font-sans normal-case">(Dynamic daily)</span></td>
              <td className="p-4 text-sm text-slate-600">N/A (Line level)</td>
              <td className="p-4 text-center">
                <button onClick={() => handleReset('House BL', setHblCountersMap, [])} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold uppercase tracking-wider">Force Reset</button>
              </td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-sm font-medium text-slate-800">Breakbulks (BRK)</td>
              <td className="p-4 text-sm font-mono text-indigo-600">BRK-{String(breakbulkCounter).padStart(5, '0')}</td>
              <td className="p-4 text-sm text-slate-600">{(breakbulks || []).length}</td>
              <td className="p-4 text-center">
                <button onClick={() => handleReset('Breakbulk', setBreakbulkCounter, breakbulks || [])} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold uppercase tracking-wider">Force Reset</button>
              </td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-sm font-medium text-slate-800">Commercial Invoices (CIPL)</td>
              <td className="p-4 text-sm font-mono text-pink-600">{generateCommercialInvoiceNo(new Date(), null, commercialInvoiceCountersMap)}</td>
              <td className="p-4 text-sm text-slate-600">Dynamic</td>
              <td className="p-4 text-center">
                <button onClick={() => handleReset('Commercial Invoice', setCommercialInvoiceCountersMap, {})} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold uppercase tracking-wider">Force Reset</button>
              </td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-sm font-medium text-slate-800">Haulier Bookings (HB)</td>
              <td className="p-4 text-sm font-mono text-cyan-600">{generateHaulierBookingNo(new Date(), 'PORT')}</td>
              <td className="p-4 text-sm text-slate-600">{(haulierBookings || []).length}</td>
              <td className="p-4 text-center">
                <button onClick={() => handleReset('Haulier', setHaulierCounter, haulierBookings || [])} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold uppercase tracking-wider">Force Reset</button>
              </td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-sm font-medium text-slate-800">Container Bookings (CBN)</td>
              <td className="p-4 text-sm font-mono text-emerald-600">{generateBookingNo(new Date(), 'LINER')}</td>
              <td className="p-4 text-sm text-slate-600">{(containerBookings || []).length}</td>
              <td className="p-4 text-center">
                <button onClick={() => handleReset('Booking', setBookingCounter, containerBookings || [])} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold uppercase tracking-wider">Force Reset</button>
              </td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-sm font-medium text-slate-800">Pickups (PU)</td>
              <td className="p-4 text-sm font-mono text-yellow-600">{generatePickupNo()}</td>
              <td className="p-4 text-sm text-slate-600">{(pickups || []).length}</td>
              <td className="p-4 text-center">
                <button onClick={() => handleReset('Pickup', setPickupCounter, pickups || [])} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-bold uppercase tracking-wider">Force Reset</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PickupForm = () => {
  const { 
    checkAccess, editPickupId, pickups, setPickups, companies, warehouses,
    pickupCounter, setPickupCounter, generatePickupNo,
    receipts, setEditPickupId, setActiveTab, showMessage,
    setPrintingPickupNote, logActivity, pushNotificationToRelatedUsers
  } = React.useContext(AppContext);

  const [formData, setFormData] = useState({
    id: '', date: new Date().toISOString().split('T')[0],
    customerId: '', customerName: '',
    consignorId: '', consignorName: '', pickupAddress: '', picContact: '',
    consigneeId: '', consigneeName: '', dropOffCompanyId: '', dropOffAddress: '', dropOffContact: '',
    pickupPartyId: '', pickupPartyName: '',
    truckDetails: '', driverContact: '', driverIC: '',
    linkedSid: '', remarks: '',
    status: 'NEW'
  });

  const [lines, setLines] = useState([{ id: Date.now().toString(), product: '', uom: 'Pallet', qty: 1, l: '', w: '', h: '', weight: '', cbm: 0 }]);

  React.useEffect(() => {
    if (editPickupId) {
      const p = pickups.find(x => x.id === editPickupId);
      if (p) {
        setFormData({ ...p });
        setLines(p.lines && p.lines.length > 0 ? p.lines : [{ id: Date.now().toString(), product: '', uom: 'Pallet', qty: 1, l: '', w: '', h: '', weight: '', cbm: 0 }]);
      }
    } else {
      setFormData(prev => ({ ...prev, id: generatePickupNo() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPickupId]);

  const handleFormChange = (e) => {
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (e.target.tagName !== 'SELECT' && typeof value === 'string') {
      value = value.toUpperCase();
    }
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const calculateCBM = (l, w, h, qty) => {
    const l_m = (parseFloat(l) || 0) / 100;
    const w_m = (parseFloat(w) || 0) / 100;
    const h_m = (parseFloat(h) || 0) / 100;
    return l_m * w_m * h_m * (parseInt(qty) || 0);
  };

  const updateLine = (id, field, value) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        let val = value;
        if (field === 'product' && typeof val === 'string') val = val.toUpperCase();
        const updatedLine = { ...line, [field]: val };
        if (['l', 'w', 'h', 'qty'].includes(field)) {
          updatedLine.cbm = calculateCBM(field === 'l' ? val : updatedLine.l, field === 'w' ? val : updatedLine.w, field === 'h' ? val : updatedLine.h, field === 'qty' ? val : updatedLine.qty);
        }
        return updatedLine;
      }
      return line;
    }));
  };

  const isLinked = !!formData.linkedSid;

  const savePickup = () => {
    if (isLinked) return showMessage("Cannot save while linked. Please unlink first to make edits.");
    if (!formData.customerId) return showMessage("Customer is required.");
    if (!formData.consignorId) return showMessage("Consignor is required.");

    const invalidLine = lines.find(l => !l.product.trim() || !l.weight);
    if (invalidLine) return showMessage("Please ensure all cargo lines have Product and Unit Weight.");

    const payload = {
      ...formData,
      lines,
      totalQty: lines.reduce((sum, l) => sum + (parseInt(l.qty) || 0), 0),
      totalCBM: lines.reduce((sum, l) => sum + l.cbm, 0),
      totalWeight: lines.reduce((sum, l) => sum + ((parseFloat(l.weight) || 0) * (parseInt(l.qty) || 0)), 0),
      status: formData.linkedSid ? 'Linked' : (formData.status || 'NEW')
    };

    setDoc(doc(db, 'pickups', payload.id), payload)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `pickups/${payload.id}`));

    if (editPickupId) {
      logActivity('UPDATE', 'Pickup Requests', payload.id, 'Updated pickup info');
      pushNotificationToRelatedUsers([payload.customerName, payload.consigneeName, payload.consignorName, payload.pickupPartyName], 'Pickup Updated', `Pickup request ${payload.id} was updated.`);
      showMessage(`Pickup ${payload.id} updated!`, 'success');
      setPrintingPickupNote(payload);
    } else {
      setDoc(doc(db, 'system', 'counters'), { pickupCounter: pickupCounter + 1 }, { merge: true });
      logActivity('CREATE', 'Pickup Requests', payload.id, 'Created new pickup request');
      pushNotificationToRelatedUsers([payload.customerName, payload.consigneeName, payload.consignorName, payload.pickupPartyName], 'New Pickup', `Pickup request ${payload.id} was created.`);
      showMessage(`Pickup ${payload.id} created!`, 'success');
      setActiveTab('pickup-list');
      setPrintingPickupNote(payload);
    }
  };

  if (!checkAccess('pickups', editPickupId ? 'edit' : 'create')) return <div className="text-red-500">Access Denied</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {isLinked && (
         <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center justify-between">
           <div>
             <h4 className="font-bold mb-1">Linked to Shipment: {formData.linkedSid}</h4>
             <p className="text-sm">This pickup request cannot be modified while linked to a shipment.</p>
           </div>
           <button 
             onClick={() => {
                if (window.confirm('Are you sure you want to unlink this pickup from the shipment? The shipment will not be deleted.')) {
                   const payload = { ...formData, linkedSid: '', status: 'Open' };
                   setFormData(payload);
                   setPickups(pickups.map(p => p.id === editPickupId ? payload : p));
                   showMessage('Pickup unlinked successfully.', 'success');
                }
             }}
             className="px-4 py-2 border border-amber-300 text-amber-700 bg-amber-100 rounded-lg font-medium hover:bg-amber-200 shadow-sm"
           >
             Unlink Shipment
           </button>
         </div>
      )}

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Truck className="w-6 h-6 text-indigo-500" />
          {editPickupId ? 'Edit Pickup Request' : 'New Pickup Request'}
        </h2>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isLinked ? 'opacity-70 pointer-events-none' : ''}`}>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">General Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700">Pickup No</label><input type="text" value={formData.id} readOnly className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-md font-mono" /></div>
            <div><label className="block text-sm font-medium text-slate-700">Date <span className="text-red-500">*</span></label><input type="date" name="date" value={formData.date} onChange={handleFormChange} className="w-full mt-1 p-2 border border-slate-300 rounded-md" /></div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700">Customer <span className="text-red-500">*</span></label>
              <input list="pickupCustomerList" name="customerName" value={formData.customerName} onChange={e => {
                const name = e.target.value;
                const c = companies.find(c => c.name === name);
                setFormData(prev => ({ ...prev, customerName: name, customerId: c ? c.id : '' }));
              }} className="w-full mt-1 p-2 border border-slate-300 rounded-md" placeholder="Search Customer..." />
              <datalist id="pickupCustomerList">
                {companies.filter(c => c.isCustomer).map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div className="col-span-2">
               <label className="block text-sm font-medium text-slate-700">Pickup Party (Transporter)</label>
               <input list="pickupPartyList" name="pickupPartyName" value={formData.pickupPartyName} onChange={e => {
                 const name = e.target.value;
                 const c = companies.find(c => c.name === name);
                 setFormData(prev => ({ ...prev, pickupPartyName: name, pickupPartyId: c ? c.id : '' }));
               }} className="w-full mt-1 p-2 border border-slate-300 rounded-md" placeholder="Search Transporter..." />
               <datalist id="pickupPartyList">
                 {companies.filter(c => c.isTransporter).map(c => <option key={c.id} value={c.name} />)}
               </datalist>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Status & Linkage</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700">Pickup Status</label>
              <select name="status" value={formData.status} onChange={handleFormChange} className="w-full mt-1 p-2 border border-slate-300 rounded-md font-bold text-indigo-600 bg-indigo-50">
                 <option value="NEW">New Pickup Request</option>
                 <option value="PENDING_PICKUP">Pending Pick Up</option>
                 <option value="PICKED_UP">Picked Up</option>
                 <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700">Linked SID</label>
              <select name="linkedSid" value={formData.linkedSid} onChange={handleFormChange} className="w-full mt-1 p-2 border border-slate-300 rounded-md">
                 <option value="">-- No Linked SID (Open) --</option>
                 {receipts.map(r => <option key={r.id} value={r.id}>{r.id} ({r.customerName})</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-700">Truck Details (Plates)</label><input type="text" name="truckDetails" value={formData.truckDetails} onChange={handleFormChange} className="w-full mt-1 p-2 border border-slate-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-slate-700">Driver IC Number</label><input type="text" name="driverIC" value={formData.driverIC} onChange={handleFormChange} className="w-full mt-1 p-2 border border-slate-300 rounded-md" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-slate-700">Driver Contact Number</label><input type="text" name="driverContact" value={formData.driverContact} onChange={handleFormChange} className="w-full mt-1 p-2 border border-slate-300 rounded-md" /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Consignor (Pickup Location)</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Consignor <span className="text-red-500">*</span></label>
              <input list="pickupConsignorList" name="consignorName" value={formData.consignorName} onChange={e => {
                const name = e.target.value;
                const c = companies.find(c => c.name === name);
                setFormData(prev => ({ ...prev, consignorName: name, consignorId: c ? c.id : '', pickupAddress: '', picContact: c ? c.contactNumber : '' }));
              }} className="w-full mt-1 p-2 border border-slate-300 rounded-md" placeholder="Search Consignor..." />
              <datalist id="pickupConsignorList">
                {companies.filter(c => c.isConsignor).map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Pickup Address</label>
              {formData.consignorId && (companies || []).find(c => c.id === formData.consignorId)?.pickupAddresses?.length > 0 && (
                <div className="mb-2">
                  <input list="pickupAddressList" className="w-full mt-1 p-2 border border-blue-200 rounded-md bg-blue-50" placeholder="Search saved pickup addresses by location or company name..." onChange={(e) => {
                    const val = e.target.value;
                    const c = (companies || []).find(c => c.id === formData.consignorId);
                    const match = c?.pickupAddresses.find(da => formatAddress(da).replace(/\n/g, ', ') === val);
                    if (match) {
                      const newPicContact = [match.picName, match.contactNumber, match.email].filter(Boolean).join(' / ');
                      setFormData(prev => ({ 
                        ...prev, 
                        pickupAddress: formatAddress(match),
                        picContact: newPicContact || prev.picContact
                      }));
                      e.target.value = '';
                    }
                  }} />
                  <datalist id="pickupAddressList">
                    {(companies || []).find(c => c.id === formData.consignorId).pickupAddresses.map((da, i) => (
                      <option key={i} value={formatAddress(da).replace(/\n/g, ', ')} />
                    ))}
                  </datalist>
                </div>
              )}
              <textarea rows="3" name="pickupAddress" value={formData.pickupAddress} onChange={handleFormChange} className="w-full mt-1 p-2 border border-slate-300 rounded-md" placeholder="Type a one-time pickup address or edit a selected one..."></textarea>
            </div>
            <div><label className="block text-sm font-medium text-slate-700">PIC Contact / Tel</label><input type="text" name="picContact" value={formData.picContact} onChange={handleFormChange} className="w-full mt-1 p-2 border border-slate-300 rounded-md" /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Consignee</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Consignee</label>
              <input list="pickupConsigneeList" name="consigneeName" value={formData.consigneeName} onChange={e => {
                const name = e.target.value;
                const c = companies.find(c => c.name === name);
                setFormData(prev => ({ ...prev, consigneeName: name, consigneeId: c ? c.id : '' }));
              }} className="w-full mt-1 p-2 border border-slate-300 rounded-md" placeholder="Search Consignee..." />
              <datalist id="pickupConsigneeList">
                {companies.filter(c => c.isConsignee).map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Special Remarks</label>
              <textarea rows="3" name="remarks" value={formData.remarks} onChange={handleFormChange} className="w-full mt-1 p-2 border border-slate-300 rounded-md"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Drop Off Location (Warehouse)</label>
              <input list="pickupDropOffList" name="dropOffCompanyName" value={formData.dropOffCompanyName !== undefined ? formData.dropOffCompanyName : (((companies || []).find(c => c.id === formData.dropOffCompanyId)?.name) || '')} onChange={e => {
                const name = e.target.value;
                const c = companies.find(c => c.name === name);
                setFormData(prev => ({ ...prev, dropOffCompanyName: name, dropOffCompanyId: c ? c.id : '', dropOffAddress: '' }));
              }} className="w-full mt-1 p-2 border border-slate-300 rounded-md" placeholder="Search Drop Off Location..." />
              <datalist id="pickupDropOffList">
                {(companies || []).filter(c => c.isWarehouseOperator).map(c => <option key={c.id} value={c.name} />)}
              </datalist>
              
              {formData.dropOffCompanyId && (companies || []).find(c => c.id === formData.dropOffCompanyId)?.warehouseAddresses?.length > 0 && (
                <div className="mt-2">
                  <input list="dropOffAddressList" className="w-full mt-1 p-2 border border-blue-200 rounded-md bg-blue-50" placeholder="Search saved warehouse addresses..." onChange={(e) => {
                    const val = e.target.value;
                    const c = (companies || []).find(c => c.id === formData.dropOffCompanyId);
                    const match = c?.warehouseAddresses.find(da => formatAddress(da).replace(/\n/g, ', ') === val);
                    if (match) {
                      const newDropOffContact = [match.picName, match.contactNumber, match.email].filter(Boolean).join(' / ');
                      setFormData(prev => ({ 
                        ...prev, 
                        dropOffAddress: formatAddress(match),
                        dropOffContact: newDropOffContact || prev.dropOffContact
                      }));
                      e.target.value = '';
                    }
                  }} />
                  <datalist id="dropOffAddressList">
                    {(companies || []).find(c => c.id === formData.dropOffCompanyId).warehouseAddresses.map((da, i) => (
                      <option key={i} value={formatAddress(da).replace(/\n/g, ', ')} />
                    ))}
                  </datalist>
                </div>
              )}
              {formData.dropOffCompanyId && (
                <>
                  <textarea rows="3" name="dropOffAddress" value={formData.dropOffAddress} onChange={handleFormChange} className="w-full mt-2 p-2 border border-slate-300 rounded-md" placeholder="Type a one-time warehouse address or select from above..."></textarea>
                  <div className="mt-2 text-sm text-slate-700">
                    <label className="block font-medium mb-1">Warehouse PIC Contact / Tel</label>
                    <input type="text" name="dropOffContact" value={formData.dropOffContact || ''} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-lg font-semibold text-slate-800">
            Cargo Details
            <span className="text-sm font-normal text-slate-500 ml-4 hidden sm:inline">
              {lines.reduce((sum, l) => sum + l.cbm, 0).toFixed(3)} CBM &nbsp;|&nbsp; 
              {lines.reduce((sum, l) => sum + (parseInt(l.qty) || 0), 0)} Pkg &nbsp;|&nbsp; 
              {lines.reduce((sum, l) => sum + ((parseFloat(l.weight) || 0) * (parseInt(l.qty) || 0)), 0).toFixed(2)} kg
            </span>
          </h3>
          <button onClick={() => setLines([...lines, { id: Date.now().toString(), product: '', uom: 'Pallet', qty: 1, l: '', w: '', h: '', weight: '', cbm: 0 }])} className="flex items-center space-x-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md"><Plus className="w-4 h-4" /> <span>Add Line</span></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-y border-slate-200">
                <th className="p-3 font-medium w-48">Product <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-24">UOM</th>
                <th className="p-3 font-medium w-20">Qty <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-20">L <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-20">W <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-20">H <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-24 text-right">CBM</th>
                <th className="p-3 font-medium w-28 text-right">Unit Wgt(kg) <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-28 text-right">Total Wgt(kg)</th>
                <th className="p-3 font-medium w-12 text-center">Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map(line => (
                <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2"><input type="text" value={line.product} onChange={(e) => updateLine(line.id, 'product', e.target.value)} className="w-full p-1.5 text-sm border rounded" placeholder="Desc..."/></td>
                  <td className="p-2">
                    <select value={line.uom} onChange={(e) => updateLine(line.id, 'uom', e.target.value)} className="w-full p-1.5 text-sm border rounded">
                      <option value="Pallet">Pallet</option><option value="Carton">Carton</option><option value="Box">Box</option><option value="Loose">Loose</option>
                    </select>
                  </td>
                  <td className="p-2"><input type="number" min="1" value={line.qty} onChange={(e) => updateLine(line.id, 'qty', e.target.value)} className="w-full p-1.5 text-sm border rounded text-center" /></td>
                  <td className="p-2"><input type="number" min="0" value={line.l} onChange={(e) => updateLine(line.id, 'l', e.target.value)} className="w-full p-1.5 text-sm border rounded" /></td>
                  <td className="p-2"><input type="number" min="0" value={line.w} onChange={(e) => updateLine(line.id, 'w', e.target.value)} className="w-full p-1.5 text-sm border rounded" /></td>
                  <td className="p-2"><input type="number" min="0" value={line.h} onChange={(e) => updateLine(line.id, 'h', e.target.value)} className="w-full p-1.5 text-sm border rounded" /></td>
                  <td className="p-2 text-right"><div className="p-1.5 text-sm bg-slate-100 rounded">{line.cbm.toFixed(4)}</div></td>
                  <td className="p-2 text-right"><input type="number" min="0" step="0.01" value={line.weight} onChange={(e) => updateLine(line.id, 'weight', e.target.value)} className="w-full p-1.5 text-sm border rounded text-right" /></td>
                  <td className="p-2 text-right"><div className="p-1.5 text-sm bg-slate-100 rounded">{((parseFloat(line.weight) || 0) * (parseInt(line.qty) || 0)).toFixed(2)}</div></td>
                  <td className="p-2 text-center"><button onClick={() => lines.length > 1 && setLines(lines.filter(l => l.id !== line.id))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ActivityHistory recordId={formData.id} />
      <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-slate-200">
        <button onClick={savePickup} className="flex items-center space-x-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg">
          <Save className="w-5 h-5"/> <span>Save Pickup Request</span>
        </button>
      </div>
    </div>
  );
};

const PickupList = () => {
  const { pickups, setPickups, checkAccess, setActiveTab, setEditPickupId, setEditReceiptId, setConvertPickupToReceiptData, setPrintingPickupNote, companies, showMessage } = React.useContext(AppContext);
  const [search, setSearch] = useState('');
  const [selectedPickups, setSelectedPickups] = useState([]);

  const filteredPickups = React.useMemo(() => {
    return pickups.filter(p => {
      const transporter = companies.find(c => c.id === p.pickupPartyId);
      const transporterName = p.pickupPartyName || (transporter ? transporter.name : '');
      return p.id.toLowerCase().includes(search.toLowerCase()) ||
        (p.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.consignorName || '').toLowerCase().includes(search.toLowerCase()) ||
        (transporterName || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.truckDetails || '').toLowerCase().includes(search.toLowerCase());
    }).sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [pickups, search, companies]);

  const handleDelete = (id) => {
    if(confirm('Delete this pickup request?')) {
      deleteDoc(doc(db, 'pickups', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `pickups/${id}`));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPickups(filteredPickups.map(p => p.id));
    } else {
      setSelectedPickups([]);
    }
  };

  const handleSelect = (id, checked) => {
    if (checked) {
      setSelectedPickups([...selectedPickups, id]);
    } else {
      setSelectedPickups(selectedPickups.filter(pid => pid !== id));
    }
  };

  const handleBulkPrint = () => {
    const toPrint = filteredPickups.filter(p => selectedPickups.includes(p.id));
    setPrintingPickupNote(toPrint);
  };

  const getPendingDays = (p) => {
    if (p.linkedSid || p.status === 'Linked') return '-';
    // date could be just "YYYY-MM-DD" depending on how it was saved
    const created = new Date(p.date || Date.now());
    const now = new Date();
    // Normalize to dates
    created.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diffTime = now.getTime() - created.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    return `${diffDays} days`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Truck className="w-6 h-6 text-indigo-500" />
          Pickup Requests
        </h2>
        <div className="flex items-center space-x-4">
          {selectedPickups.length > 0 && checkAccess('pickups', 'print') && (
            <button onClick={handleBulkPrint} className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-700 transition">
              <Printer className="w-4 h-4"/> <span>Print ({selectedPickups.length})</span>
            </button>
          )}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Search pickups..." value={search} onChange={(e) => setSearch(e.target.value.toUpperCase())} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full sm:w-72 focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          {checkAccess('pickups', 'create') && (
            <button onClick={() => { setEditPickupId(null); setActiveTab('new-pickup'); }} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition">
              <Plus className="w-5 h-5"/> <span className="hidden sm:inline">New Pickup</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
              <tr>
                <th className="p-4 w-12">
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedPickups.length === filteredPickups.length && filteredPickups.length > 0} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                </th>
                <th className="p-4 font-semibold">PU Request No</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Consignor</th>
                <th className="p-4 font-semibold">Transporter</th>
                <th className="p-4 font-semibold">Status / SID</th>
                <th className="p-4 font-semibold">Pending</th>
                <th className="p-4 font-semibold text-right">Total Pkg</th>
                <th className="p-4 font-semibold text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredPickups.length === 0 ? (
                <tr><td colSpan="10" className="p-8 text-center text-slate-500">No pickup requests found.</td></tr>
              ) : (
                filteredPickups.map(p => {
                  const transporter = companies.find(c => c.id === p.pickupPartyId);
                  const transporterName = p.pickupPartyName || (transporter ? transporter.name : '-');
                  return (
                  <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-4">
                      <input type="checkbox" checked={selectedPickups.includes(p.id)} onChange={(e) => handleSelect(p.id, e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                    </td>
                    <td className="p-4 font-medium text-indigo-600">{p.id}</td>
                    <td className="p-4 text-slate-600">{formatDate(p.date)}</td>
                    <td className="p-4 font-medium text-slate-800">{p.customerName}</td>
                    <td className="p-4 text-slate-600">{p.consignorName}</td>
                    <td className="p-4 text-slate-600">{transporterName} <br/> <span className="text-xs text-slate-400">{p.truckDetails}</span></td>
                    <td className="p-4">
                      {p.status === 'Linked' || p.linkedSid ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1"><Link className="w-3 h-3"/> {p.linkedSid}</span>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          p.status === 'PICKED_UP' ? 'bg-emerald-100 text-emerald-700' : 
                          p.status === 'PENDING_PICKUP' ? 'bg-amber-100 text-amber-700' : 
                          p.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{p.status || 'NEW'}</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {getPendingDays(p)}
                    </td>
                    <td className="p-4 text-right text-slate-800 font-medium">{p.totalQty}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-3">
                        {checkAccess('receipts', 'create') && !p.linkedSid && (
                          <button onClick={() => { 
                            setConvertPickupToReceiptData(p);
                            setEditReceiptId(null);
                            setActiveTab('new-receipt'); 
                          }} className="text-slate-400 hover:text-blue-600 transition" title="Create Shipment from Pickup"><PackagePlus className="w-4 h-4" /></button>
                        )}
                        {!p.linkedSid && p.status !== 'PICKED_UP' && (
                          <button onClick={() => {
                             setPickups(pickups.map(x => x.id === p.id ? {...x, status: 'PICKED_UP'} : x));
                             showMessage(`Pickup ${p.id} marked as PICKED UP`, 'success');
                          }} className="text-slate-400 hover:text-emerald-600 transition" title="Mark as Picked Up"><ArrowRightCircle className="w-4 h-4" /></button>
                        )}
                        {checkAccess('pickups', 'print') && (
                          <button onClick={() => setPrintingPickupNote([p])} className="text-slate-400 hover:text-indigo-600 transition" title="Print Pickup Note"><Printer className="w-4 h-4" /></button>
                        )}
                        {checkAccess('pickups', 'edit') && (
                          <button onClick={() => { setEditPickupId(p.id); setActiveTab('new-pickup'); }} className="text-slate-400 hover:text-indigo-600 transition" title="Edit"><Edit className="w-4 h-4" /></button>
                        )}
                        {checkAccess('pickups', 'cancel') && (
                          <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-500 transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>

                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ReceiptForm = () => {
  const { 
    checkAccess, editReceiptId, receipts, setReceipts, ports, companies, 
    showMessage, generateShipmentId, receiptCountersMap, setReceiptCountersMap, setPrintingReceipt, 
    setActiveTab, calculateCBM, setEditReceiptId,
    convertPickupToReceiptData, setConvertPickupToReceiptData,
    pickups, setPickups, logActivity, pushNotificationToRelatedUsers
  } = React.useContext(AppContext);

  if (!checkAccess('receipts', 'create') && !editReceiptId) return <div className="p-8 text-center text-slate-500">You do not have permission to create shipments.</div>;
  if (!checkAccess('receipts', 'edit') && editReceiptId) return <div className="p-8 text-center text-slate-500">You do not have permission to edit shipments.</div>;

  const [formData, setFormData] = useState({
    transactionType: 'LCL Consolidate', company: '', transportArrangement: 'Truck Arrangement by OmniMesh',
    customer: '', consignee: '', consignor: '', pol: '', pod: '', consigneeDeliveryAddress: '', shipperDoNo: '', isUrgent: false,
    sendingType: 'SEND IN', puNo: '', grnRemarks: ''
  });

  const [lines, setLines] = useState([{ id: Date.now().toString(), product: '', uom: 'Pallet', qty: 1, l: '', w: '', h: '', weight: '', cbm: 0 }]);
  const [showSyncModal, setShowSyncModal] = useState(null);

  useEffect(() => {
    if (editReceiptId) {
      const r = (receipts || []).find(x => x.id === editReceiptId);
      if (r) {
        setFormData({
          transactionType: r.transactionType || 'LCL Consolidate',
          company: r.company || '',
          transportArrangement: r.transportArrangement || 'Truck Arrangement by OmniMesh',
          customer: r.customer || '',
          consignee: r.consignee || '',
          consignor: r.consignor || '',
          pol: r.pol || '',
          pod: r.pod || '',
          consigneeDeliveryAddress: r.consigneeDeliveryAddress || '',
          shipperDoNo: r.shipperDoNo || '',
          grnRemarks: r.grnRemarks || '',
          isUrgent: r.isUrgent || false,
          sendingType: r.sendingType || 'SEND IN',
          puNo: r.puNo || ''
        });
        setLines(r.lines && r.lines.length > 0 ? r.lines : [{ id: Date.now().toString(), product: '', uom: 'Pallet', qty: 1, l: '', w: '', h: '', weight: '', cbm: 0 }]);
      }
    } else if (convertPickupToReceiptData) {
      const p = convertPickupToReceiptData;
      setFormData(prev => ({
        ...prev,
        company: p.pickupPartyName || prev.company, 
        customer: p.customerName || prev.customer, 
        consignee: p.consigneeName || prev.consignee, 
        consignor: p.consignorName || prev.consignor, 
        consigneeDeliveryAddress: p.dropOffAddress || prev.consigneeDeliveryAddress, 
        shipperDoNo: p.linkedSid || prev.shipperDoNo,
        sendingType: 'PICK UP',
        puNo: p.id
      }));
      // Check if current lines differ from pickup lines
      const currentLinesEmpty = lines.length === 1 && lines[0].product === '' && !lines[0].l && !lines[0].weight;
      if (!currentLinesEmpty) {
        setShowSyncModal({ pickupLines: p.lines, pId: p.id });
      } else if (p.lines && p.lines.length > 0) {
        setLines(p.lines.map(l => ({...l, id: Date.now().toString() + Math.random()})));
      }
    } else {
      setFormData({
        transactionType: 'LCL Consolidate', company: '', transportArrangement: 'Truck Arrangement by OmniMesh',
        customer: '', consignee: '', consignor: '', pol: '', pod: '', consigneeDeliveryAddress: '', shipperDoNo: '', isUrgent: false,
        sendingType: 'SEND IN', puNo: '', grnRemarks: ''
      });
      setLines([{ id: Date.now().toString(), product: '', uom: 'Pallet', qty: 1, l: '', w: '', h: '', weight: '', cbm: 0 }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editReceiptId, convertPickupToReceiptData]);

  const handleFormChange = (e) => {
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (e.target.tagName !== 'SELECT' && typeof value === 'string' && e.target.name !== 'isUrgent') {
      value = value.toUpperCase();
    }
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const updateLine = (id, field, value) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        let val = value;
        if (field === 'product' && typeof val === 'string') val = val.toUpperCase();
        const updatedLine = { ...line, [field]: val };
        if (['l', 'w', 'h', 'qty'].includes(field)) {
          updatedLine.cbm = calculateCBM(field === 'l' ? val : updatedLine.l, field === 'w' ? val : updatedLine.w, field === 'h' ? val : updatedLine.h, field === 'qty' ? val : updatedLine.qty);
        }
        return updatedLine;
      }
      return line;
    }));
  };

  const saveReceipt = () => {
    if (!formData.company) return showMessage("Please select a Company (OmniMesh).");
    if (!formData.customer || !formData.consignee || !formData.consignor || !formData.shipperDoNo) return showMessage("Please fill in Customer, Consignee, Consignor, and Shipper DO No.");
    if (!formData.consigneeDeliveryAddress) return showMessage("Consignee Delivery Address is strictly required.");
    if (formData.transactionType === 'LCL Consolidate' && (!formData.pol || !formData.pod)) return showMessage("POL and POD are required for LCL Consolidate.");

    const invalidLine = lines.find(l => !l.product.trim() || !l.weight || l.l === '' || l.w === '' || l.h === '');
    if (invalidLine) return showMessage("All line items must have a Product Description, Weight, and Dimensions (L, W, H).");

    const isDuplicateDo = (receipts || []).some(r => r.id !== editReceiptId && r.shipperDoNo === formData.shipperDoNo && r.consignor === formData.consignor);
    if (isDuplicateDo) return showMessage(`Shipper DO Number '${formData.shipperDoNo}' already exists for Consignor '${formData.consignor}'. Duplicate DO numbers for the same consignor are not allowed.`);

    const d = editReceiptId ? new Date((receipts || []).find(x => x.id === editReceiptId).date) : new Date();

    let newId = editReceiptId;
    if (!editReceiptId) {
      newId = generateShipmentId(d, formData.pol, formData.pod, receiptCountersMap);
      
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const routeStr = `${formData.pol || 'POL'}${formData.pod || 'POD'}`.replace(/[^A-Z0-9]/ig, '').toUpperCase();
      const key = `${yy}${mm}${dd}-${routeStr}`;
      
      setDoc(doc(db, 'system', 'counters'), { 
        receiptCountersMap: { ...receiptCountersMap, [key]: (receiptCountersMap[key] || 0) + 1 }
      }, { merge: true });
    }

    const updatedReceipt = {
      id: newId,
      date: d.toISOString(),
      ...formData,
      lines,
      totalQty: lines.reduce((sum, l) => sum + (parseInt(l.qty) || 0), 0),
      totalCBM: lines.reduce((sum, l) => sum + l.cbm, 0),
      totalWeight: lines.reduce((sum, l) => sum + ((parseFloat(l.weight) || 0) * (parseInt(l.qty) || 0)), 0)
    };

    setDoc(doc(db, 'receipts', updatedReceipt.id), updatedReceipt)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `receipts/${updatedReceipt.id}`));

    if (editReceiptId) {
      const oldR = receipts.find(r => r.id === updatedReceipt.id);
      logActivity('UPDATE', 'Shipment Entry', updatedReceipt.id, 'Updated shipment details', oldR, updatedReceipt);
      pushNotificationToRelatedUsers(
         [updatedReceipt.customer, updatedReceipt.consignee, updatedReceipt.consignor],
         'Shipment Updated',
         `Shipment ${updatedReceipt.id} has been updated.`
      );
      showMessage("Shipment updated successfully.", "success");
    } else {
      logActivity('CREATE', 'Shipment Entry', updatedReceipt.id, 'Created new shipment entry');
      pushNotificationToRelatedUsers(
         [updatedReceipt.customer, updatedReceipt.consignee, updatedReceipt.consignor],
         'New Shipment',
         `Shipment ${updatedReceipt.id} has been created.`
      );
      if (checkAccess('receipts', 'print')) setPrintingReceipt(updatedReceipt); 
      showMessage("Shipment saved successfully.", "success");
    }

    if (formData.sendingType === 'PICK UP' && formData.puNo) {
      const p = (pickups || []).find(x => x.id === formData.puNo);
      if (p) {
        updateDoc(doc(db, 'pickups', p.id), { 
          linkedSid: newId, 
          status: 'Linked', 
          lines: lines.map(l => ({...l})) 
        }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `pickups/${p.id}`));
      }
    }
    
    setConvertPickupToReceiptData(null);
    setActiveTab('receipt-list');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <datalist id="company_list">
        <option value="OML" />
        <option value="OmniMesh" />
      </datalist>
      <datalist id="port_list">
        {(ports || []).map(p => {
          const display = p.portName ? `${p.name} - ${p.portName} ${p.country ? `(${p.country})` : ''}` : p.name;
          return <option key={p.id} value={p.name}>{display}</option>;
        })}
      </datalist>
      <datalist id="customer_list">{(companies || []).filter(c => c.isCustomer).map(c => <option key={c.id} value={c.name} />)}</datalist>
      <datalist id="consignee_list">{(companies || []).filter(c => c.isConsignee).map(c => <option key={c.id} value={c.name} />)}</datalist>
      <datalist id="consignor_list">{(companies || []).filter(c => c.isConsignor).map(c => <option key={c.id} value={c.name} />)}</datalist>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-slate-800">{editReceiptId ? 'Edit Shipment' : 'New Shipment Entry'}</h2>
          {editReceiptId && <button onClick={() => {setEditReceiptId(null); setActiveTab('receipt-list');}} className="text-sm text-slate-500 border border-slate-300 px-3 py-1 rounded bg-white">Cancel Edit</button>}
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 cursor-pointer">
            <input type="checkbox" name="isUrgent" checked={formData.isUrgent} onChange={handleFormChange} className="rounded text-red-600 focus:ring-red-500 w-4 h-4"/>
            <span className="text-sm font-bold text-red-700">MARK URGENT</span>
          </label>
          <span className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-mono font-medium border border-slate-200">
            {editReceiptId || generateShipmentId(new Date(), formData.pol, formData.pod, receiptCountersMap)}
          </span>
        </div>
      </div>
      
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Cargo Details Mismatch</h3>
            </div>
            <div className="p-6 text-sm text-slate-600 space-y-4">
              <p>The selected Pickup Request <strong>{showSyncModal.pId}</strong> has cargo details, but you have already entered lines in this Shipment entry.</p>
              <p className="font-semibold text-slate-800">Which cargo details should be used?</p>
              <div className="space-y-3 pt-2">
                <button type="button" onClick={() => {
                   if (window.confirm("Are you sure you want to overwrite current shipment lines with the pickup lines?")) {
                      setLines(showSyncModal.pickupLines.map(l => ({...l, id: Date.now().toString() + Math.random()})));
                      setShowSyncModal(null);
                   }
                }} className="w-full py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium">
                  Use details from Pickup Request ({showSyncModal.pickupLines.length} lines)
                </button>
                <button type="button" onClick={() => {
                   if (window.confirm("Are you sure you want to keep current shipment lines and ignore the pickup lines?")) {
                      setShowSyncModal(null);
                   }
                }} className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 font-medium">
                  Keep current Shipment details ({lines.length} lines)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">General Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sending Type <span className="text-red-500">*</span></label>
            <select name="sendingType" value={formData.sendingType} onChange={(e) => {
                handleFormChange(e);
                if (e.target.value === 'SEND IN') {
                    setConvertPickupToReceiptData(null);
                    setFormData(prev => ({...prev, puNo: ''}));
                }
            }} className="w-full p-2 border border-slate-300 rounded-md bg-yellow-50">
                <option value="SEND IN">SEND IN</option>
                <option value="PICK UP">PICK UP</option>
            </select>
          </div>
          {formData.sendingType === 'PICK UP' && (
            <div className="bg-indigo-50 p-2 rounded border border-indigo-200">
               <label className="block text-sm font-medium text-indigo-900 mb-1">Link PU Number <span className="text-red-500">*</span></label>
               <select name="puNo" value={formData.puNo || ''} onChange={(e) => {
                   const v = e.target.value;
                   setFormData(prev => ({ ...prev, puNo: v }));
                   if (v) {
                       const p = (pickups || []).find(x => x.id === v);
                       if (p) {
                           setConvertPickupToReceiptData(p);
                       }
                   } else {
                       setConvertPickupToReceiptData(null);
                   }
               }} className="w-full p-1.5 border border-indigo-300 rounded bg-white text-sm">
                  <option value="">-- Select Unlinked PU --</option>
                  {(pickups || [])
                    .filter(p => p.id === formData.puNo || (!p.linkedSid && (!formData.customer || p.customerName === formData.customer)))
                    .map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
               </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Type</label>
            <select name="transactionType" value={formData.transactionType} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md"><option>LCL Consolidate</option><option>Cross Docking</option></select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company <span className="text-red-500">*</span></label>
            <select name="company" value={formData.company} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md">
              <option value="">-- Select Company --</option>
              <option value="OML">OML</option>
              <option value="OmniMesh">OmniMesh</option>
            </select>
          </div>
          {formData.transactionType === 'Cross Docking' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transport Arrangement</label>
              <select name="transportArrangement" value={formData.transportArrangement} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md"><option>Truck Arrangement by OmniMesh</option><option>Own Collection</option></select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">POL {formData.transactionType === 'LCL Consolidate' && <span className="text-red-500">*</span>}</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input list="port_list" name="pol" value={formData.pol} onChange={handleFormChange} className="w-full pl-9 p-2 border border-slate-300 rounded-md" placeholder="Search POL..." />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">POD {formData.transactionType === 'LCL Consolidate' && <span className="text-red-500">*</span>}</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input list="port_list" name="pod" value={formData.pod} onChange={handleFormChange} className="w-full pl-9 p-2 border border-slate-300 rounded-md" placeholder="Search POD..." />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer <span className="text-red-500">*</span></label>
            <input list="customer_list" name="customer" value={formData.customer} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="Search Customer..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Consignee <span className="text-red-500">*</span></label>
            <input list="consignee_list" name="consignee" value={formData.consignee} onChange={(e) => { handleFormChange(e); setFormData(prev => ({ ...prev, consigneeDeliveryAddress: '' })); }} className="w-full p-2 border border-slate-300 rounded-md" placeholder="Search Consignee..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Consignor <span className="text-red-500">*</span></label>
            <input list="consignor_list" name="consignor" value={formData.consignor} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="Search Consignor..." />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Shipper DO No. <span className="text-red-500">*</span></label>
            <input type="text" name="shipperDoNo" value={formData.shipperDoNo} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. SDO-12345" />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Goods Received Note Remarks</label>
            <textarea name="grnRemarks" value={formData.grnRemarks} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. Received in good condition" rows={2} />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Consignee Delivery Address <span className="text-red-500">*</span></label>
            {formData.consignee && (companies || []).find(c => c.name === formData.consignee)?.deliveryAddresses?.length > 0 && (
              <div className="mb-2">
                <input list="consigneeDeliveryList" className="w-full p-2 border border-blue-200 rounded-md bg-blue-50" placeholder="Search saved delivery addresses by location or company name..." onChange={(e) => {
                  const val = e.target.value;
                  const c = (companies || []).find(c => c.name === formData.consignee);
                  const match = c?.deliveryAddresses.find(da => formatAddress(da).replace(/\n/g, ', ') === val);
                  if (match) {
                    setFormData(prev => ({ ...prev, consigneeDeliveryAddress: formatAddress(match) }));
                    e.target.value = '';
                  }
                }} />
                <datalist id="consigneeDeliveryList">
                  {(companies || []).find(c => c.name === formData.consignee).deliveryAddresses.map((da, i) => (
                    <option key={i} value={formatAddress(da).replace(/\n/g, ', ')} />
                  ))}
                </datalist>
              </div>
            )}
            <textarea rows="3" name="consigneeDeliveryAddress" value={formData.consigneeDeliveryAddress} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="Type a one-time delivery address or edit a selected one..."></textarea>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-lg font-semibold text-slate-800">
            Cargo Details
            <span className="text-sm font-normal text-slate-500 ml-4 hidden sm:inline">
              {lines.reduce((sum, l) => sum + l.cbm, 0).toFixed(3)} CBM &nbsp;|&nbsp; 
              {lines.reduce((sum, l) => sum + (parseInt(l.qty) || 0), 0)} Pkg &nbsp;|&nbsp; 
              {lines.reduce((sum, l) => sum + ((parseFloat(l.weight) || 0) * (parseInt(l.qty) || 0)), 0).toFixed(2)} kg
            </span>
          </h3>
          <button onClick={() => setLines([...lines, { id: Date.now().toString(), product: '', uom: 'Pallet', qty: 1, l: '', w: '', h: '', weight: '', cbm: 0 }])} className="flex items-center space-x-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md"><Plus className="w-4 h-4" /> <span>Add Line</span></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-y border-slate-200">
                <th className="p-3 font-medium w-48">Product <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-24">UOM</th>
                <th className="p-3 font-medium w-20">Qty</th>
                <th className="p-3 font-medium w-20">L <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-20">W <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-20">H <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-24 text-right">CBM</th>
                <th className="p-3 font-medium w-28 text-right">Unit Wgt(kg) <span className="text-red-500">*</span></th>
                <th className="p-3 font-medium w-28 text-right">Total Wgt(kg)</th>
                <th className="p-3 font-medium w-12 text-center">Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line) => (
                <tr key={line.id}>
                  <td className="p-2"><input type="text" value={line.product} onChange={(e) => updateLine(line.id, 'product', e.target.value)} className="w-full p-1.5 text-sm border rounded" /></td>
                  <td className="p-2"><select value={line.uom} onChange={(e) => updateLine(line.id, 'uom', e.target.value)} className="w-full p-1.5 text-sm border rounded"><option>Bundle</option><option>Pallet</option><option>Carton</option><option>Box</option><option>Loose</option></select></td>
                  <td className="p-2"><input type="number" min="1" value={line.qty} onChange={(e) => updateLine(line.id, 'qty', e.target.value)} className="w-full p-1.5 text-sm border rounded" /></td>
                  <td className="p-2"><input type="number" min="0" value={line.l} onChange={(e) => updateLine(line.id, 'l', e.target.value)} className="w-full p-1.5 text-sm border rounded" /></td>
                  <td className="p-2"><input type="number" min="0" value={line.w} onChange={(e) => updateLine(line.id, 'w', e.target.value)} className="w-full p-1.5 text-sm border rounded" /></td>
                  <td className="p-2"><input type="number" min="0" value={line.h} onChange={(e) => updateLine(line.id, 'h', e.target.value)} className="w-full p-1.5 text-sm border rounded" /></td>
                  <td className="p-2 text-right"><div className="p-1.5 text-sm bg-slate-100 rounded">{line.cbm.toFixed(4)}</div></td>
                  <td className="p-2 text-right"><input type="number" min="0" step="0.01" value={line.weight} onChange={(e) => updateLine(line.id, 'weight', e.target.value)} className="w-full p-1.5 text-sm border rounded text-right" /></td>
                  <td className="p-2 text-right"><div className="p-1.5 text-sm bg-slate-100 rounded">{((parseFloat(line.weight) || 0) * (parseInt(line.qty) || 0)).toFixed(2)}</div></td>
                  <td className="p-2 text-center"><button onClick={() => lines.length > 1 && setLines(lines.filter(l => l.id !== line.id))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ActivityHistory recordId={formData.id} />
      <div className="flex justify-end mt-4">
        <button onClick={saveReceipt} className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium"><Save className="w-5 h-5" /><span>{editReceiptId ? 'Update Shipment' : 'Save Shipment & Print'}</span></button>
      </div>
    </div>
  );
};

const ReceiptList = () => {
  const { 
    checkAccess, receipts, returns, manifests, breakbulks, setEditReceiptId, 
    setActiveTab, setPrintingA4Receipt, setPrintingReceipt, setReceipts, showMessage 
  } = React.useContext(AppContext);

  if (!checkAccess('receipts', 'view')) return <div className="p-8 text-center text-slate-500">You do not have permission to view shipments.</div>;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [receiptToDelete, setReceiptToDelete] = useState(null);

  const filtered = (receipts || []).filter(r => {
    const term = search.toLowerCase();
    const matchesSearch = (
      r.id.toLowerCase().includes(term) || 
      r.customer.toLowerCase().includes(term) ||
      (r.consignee && r.consignee.toLowerCase().includes(term)) ||
      (r.consignor && r.consignor.toLowerCase().includes(term)) ||
      (r.shipperDoNo && r.shipperDoNo.toLowerCase().includes(term))
    );

    if (!matchesSearch) return false;

    const hasReturns = (returns || []).some(ret => ret.receiptId === r.id);
    const hasManifests = (manifests || []).some(m => (m.lines || []).some(l => l.receiptId === r.id));
    const hasBreakbulks = (breakbulks || []).some(bb => bb.receiptId === r.id);

    let currentStatus = 'Active';
    if (hasReturns) currentStatus = 'Returned';
    else if (hasManifests) currentStatus = 'Manifested';
    else if (hasBreakbulks) currentStatus = 'Split';

    if (statusFilter !== 'All' && currentStatus !== statusFilter) {
      return false;
    }

    return true;
  });

  const getStorageDays = (dateStr: string) => {
    const diffTime = new Date().getTime() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Shipment List</h2>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex space-x-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
            {['All', 'Active', 'Returned', 'Manifested', 'Split'].map(status => (
              <button 
                key={status} 
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === status ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Search shipments, customers, DO..." value={search} onChange={(e) => setSearch(e.target.value.toUpperCase())} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full sm:w-72 focus:ring-blue-500 focus:border-blue-500"/>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-sm font-semibold text-slate-700">Shipment ID</th>
                <th className="p-4 text-sm font-semibold text-slate-700">Date & Storage</th>
                <th className="p-4 text-sm font-semibold text-slate-700">Shipper DO</th>
                <th className="p-4 text-sm font-semibold text-slate-700">Route (POL-POD)</th>
                <th className="p-4 text-sm font-semibold text-slate-700">Parties Involved</th>
                <th className="p-4 text-sm font-semibold text-slate-700 text-right">Total Qty</th>
                <th className="p-4 text-sm font-semibold text-slate-700 text-right">Total CBM</th>
                <th className="p-4 text-sm font-semibold text-slate-700 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-slate-500">No shipments found.</td></tr> : filtered.map(r => {
                const hasReturns = (returns || []).some(ret => ret.receiptId === r.id);
                const hasManifests = (manifests || []).some(m => (m.lines || []).some(l => l.receiptId === r.id));
                const hasBreakbulks = (breakbulks || []).some(bb => bb.receiptId === r.id);
                const isLocked = hasReturns || hasManifests || hasBreakbulks;

                let statusBadge = <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">STOCK-IN</span>;
                if (hasReturns) statusBadge = <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Returned</span>;
                else if (hasManifests) statusBadge = <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Manifested</span>;
                else if (hasBreakbulks) statusBadge = <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Split</span>;

                return (
                  <tr key={r.id} className={`hover:bg-slate-50 ${r.isUrgent ? 'bg-red-50/30' : ''}`}>
                    <td className="p-4 text-sm font-medium text-blue-600">
                      {r.id}
                      <div className="mt-1 flex items-center space-x-2">
                        {statusBadge}
                        {r.isUrgent && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Urgent</span>}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {formatDate(r.date)}
                      <span className="block text-xs font-semibold text-orange-600 mt-0.5">{getStorageDays(r.date)} Days</span>
                    </td>
                    <td className="p-4 text-sm font-mono text-slate-600">{r.shipperDoNo || '-'}</td>
                    <td className="p-4 text-sm text-slate-600">{r.pol && r.pod ? `${r.pol} - ${r.pod}` : (r.transactionType === 'LCL Consolidate' ? 'Pending Route' : 'Cross Docking')}</td>
                    <td className="p-4 text-sm">
                      <p className="font-bold text-slate-800">{r.customer}</p>
                      <p className="text-xs text-slate-500 mt-0.5"><span className="font-semibold">Cnee:</span> {r.consignee || '-'}</p>
                      <p className="text-xs text-slate-500"><span className="font-semibold">Cnor:</span> {r.consignor || '-'}</p>
                    </td>
                    <td className="p-4 text-sm text-slate-600 text-right font-medium">{r.totalQty}</td>
                    <td className="p-4 text-sm text-slate-600 text-right font-mono">{r.totalCBM.toFixed(3)}</td>
                    <td className="p-4 text-sm text-center flex justify-center space-x-2 flex-wrap gap-y-2 min-w-[160px]">
                      {isLocked ? (
                        <button disabled className="p-1.5 bg-slate-100 text-slate-400 rounded cursor-not-allowed flex items-center space-x-1" title="Locked: Cargo has been returned, manifested, or split.">
                          <span className="text-xs font-medium px-1">Locked</span>
                        </button>
                      ) : (
                        <>
                          {checkAccess('receipts', 'edit') && (
                            <button onClick={() => { setEditReceiptId(r.id); setActiveTab('new-receipt'); }} className="p-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center space-x-1" title="Edit Shipment">
                              <span className="text-xs font-medium px-1">Edit</span>
                            </button>
                          )}
                          {checkAccess('receipts', 'cancel') && (
                            <button onClick={() => setReceiptToDelete(r.id)} className="p-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 flex items-center space-x-1" title="Cancel/Delete Shipment">
                              <span className="text-xs font-medium px-1">Cancel</span>
                            </button>
                          )}
                        </>
                      )}
                      {checkAccess('receipts', 'print') && (
                        <>
                          <button onClick={() => setPrintingA4Receipt(r)} className="p-1.5 bg-slate-100 text-slate-700 rounded hover:bg-purple-100 hover:text-purple-700 flex items-center space-x-1" title="Download PDF"><FileDown className="w-4 h-4" /> <span>PDF Doc</span></button>
                          <button onClick={() => setPrintingReceipt(r)} className="p-1.5 bg-slate-100 text-slate-700 rounded hover:bg-blue-100 hover:text-blue-700 flex items-center space-x-1" title="Print A6 Labels"><Printer className="w-4 h-4" /> <span>Labels</span></button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {receiptToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Cancel Shipment</h3>
            <p className="text-slate-600 text-sm mb-6">Are you sure you want to cancel and delete shipment <span className="font-bold">{receiptToDelete}</span>? This will instantly remove its cargo from active inventory.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setReceiptToDelete(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">Close</button>
              <button 
                onClick={() => {
                  deleteDoc(doc(db, 'receipts', receiptToDelete))
                    .catch(err => handleFirestoreError(err, OperationType.DELETE, `receipts/${receiptToDelete}`));
                  setReceiptToDelete(null);
                  showMessage("Shipment cancelled. Cargo removed from inventory.", "success");
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm shadow-sm"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActiveRouteSummary = () => {
  const { getActiveInventory } = React.useContext(AppContext);
  const activeInventory = getActiveInventory();
  
  const routeStats = {};
  
  activeInventory.forEach(item => {
    if (item.transactionType !== 'LCL Consolidate') return;
    if (item.currentQty <= 0) return; // Only count active stocks
    const routeKey = `${item.pol || 'Unknown'} to ${item.pod || 'Unknown'}`;
    if (!routeStats[routeKey]) {
      routeStats[routeKey] = {
        route: routeKey,
        totalCbm: 0,
        maxDays: 0,
        urgentSids: new Set()
      };
    }
    
    routeStats[routeKey].totalCbm += (parseInt(item.currentQty) || 0) * (parseFloat(item.unitCbm) || 0);
    
    const receiptDate = item.date ? new Date(item.date) : new Date();
    const days = Math.floor((new Date().getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
    if (days > routeStats[routeKey].maxDays) {
      routeStats[routeKey].maxDays = days;
    }
    
    if (item.isUrgent) {
      routeStats[routeKey].urgentSids.add(item.receiptId);
    }
  });

  const routes = Object.values(routeStats).sort((a: any, b: any) => b.totalCbm - a.totalCbm) as any[];
  
  if (routes.length === 0) return null;

  const leftCol = routes.slice(0, Math.ceil(routes.length / 2));
  const rightCol = routes.slice(Math.ceil(routes.length / 2));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Active Route Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        <div>
          {leftCol.map((r, i) => (
            <div key={r.route} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <span className="font-medium text-slate-700">{i + 1}. {r.route}</span>
              <div className="text-right text-sm">
                <span className="font-bold text-blue-600 block">{r.totalCbm.toFixed(3)} CBM</span>
                <span className="text-slate-500 text-xs">Max Days: {r.maxDays}d</span>
                {r.urgentSids.size > 0 && <span className="text-red-500 text-xs ml-2 font-bold">{r.urgentSids.size} Urgent</span>}
              </div>
            </div>
          ))}
        </div>
        <div>
          {rightCol.map((r, i) => (
            <div key={r.route} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
              <span className="font-medium text-slate-700">{i + 1 + leftCol.length}. {r.route}</span>
              <div className="text-right text-sm">
                <span className="font-bold text-blue-600 block">{r.totalCbm.toFixed(3)} CBM</span>
                <span className="text-slate-500 text-xs">Max Days: {r.maxDays}d</span>
                {r.urgentSids.size > 0 && <span className="text-red-500 text-xs ml-2 font-bold">{r.urgentSids.size} Urgent</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ManifestForm = () => {
  const { 
    checkAccess, editManifestId, manifests, setManifests, setEditManifestId, 
    setActiveTab, ports, getActiveInventory, generateManifestNo, generateLineHBL, 
    hblCountersMap, setHblCountersMap, showMessage, manifestCountersMap, setManifestCountersMap,
    containerBookings, companies, containerTypes, fclTemplates, logActivity, pushNotificationToRelatedUsers
  } = React.useContext(AppContext);

  const [route, setRoute] = useState({ 
    pol: '', pod: '', containerNo: '', sealNo: '', jobNo: '', bookingId: '', vessel: '', voyage: '', type: 'LCL', 
    fclCustomer: '', consignee: '', consignor: '', totalCBM: '',
    status: 'OPEN', etd: '', eta: '', sailingDate: '', berthingDate: '' 
  });
  const [manifestItems, setManifestItems] = useState([]);
  const [fclProducts, setFclProducts] = useState([]);
  const [fclBilling, setFclBilling] = useState([]);
  const [sortField, setSortField] = useState('date');
  const [sortDesc, setSortDesc] = useState(false);

  useEffect(() => {
    if (editManifestId) {
      const m = (manifests || []).find(x => x.id === editManifestId);
      if (m) {
        setRoute({ 
          pol: m.pol, pod: m.pod, containerNo: m.containerNo || '', sealNo: m.sealNo || '', 
          jobNo: m.jobNo || '', bookingId: m.bookingId || '', vessel: m.vessel || '', voyage: m.voyage || '',
          type: m.type || 'LCL', fclCustomer: m.fclCustomer || '', consignee: m.consignee || '', consignor: m.consignor || '',
          totalCBM: m.totalCBM || ''
        });
        setManifestItems(m.lines || []);
        setFclProducts(m.fclProducts || []);
        if (m.fclBilling && m.fclBilling.length > 0) {
           setFclBilling(m.fclBilling);
        } else {
           setFclBilling([
             { section: 'Ocean Freight', description: 'Ocean Freight - FCL', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'LSS', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'L/THC', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'Bill of Lading', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'POL EDI', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'Container Seal', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'Delivery Order Fee', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'D/THC', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'POD EDI', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'CHC', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'LCHC', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'CMC', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
             { section: 'Ocean Freight', description: 'Telex Release Fee', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false }
           ]);
        }
      }
    } else {
      setRoute({ 
        pol: '', pod: '', containerNo: '', sealNo: '', jobNo: '', bookingId: '', vessel: '', voyage: '', type: 'LCL', 
        fclCustomer: '', consignee: '', consignor: '', totalCBM: '',
        status: 'OPEN', etd: '', eta: '', sailingDate: '', berthingDate: ''
      });
      setManifestItems([]);
      setFclProducts([]);
      setFclBilling([
         { section: 'Ocean Freight', description: 'Ocean Freight - FCL', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'LSS', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'L/THC', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'Bill of Lading', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'POL EDI', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'Container Seal', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'Delivery Order Fee', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'D/THC', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'POD EDI', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'CHC', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'LCHC', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'CMC', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false },
         { section: 'Ocean Freight', description: 'Telex Release Fee', cost: 0, costCurrency: 'MYR', selling: 0, sellingCurrency: 'MYR', isNew: false }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editManifestId]);

  useEffect(() => {
    if (!editManifestId && route.type === 'FCL' && route.pol && route.pod) {
      const match = (fclTemplates || []).find(t => 
        t.pol === route.pol && 
        t.pod === route.pod &&
        (!route.fclCustomer || (t.templateCustomers || []).includes((companies.find(c => c.name === route.fclCustomer)?.id) || ''))
      );
      if (match && match.items && match.items.length > 0) {
        const newBilling = match.items.map(item => ({
          section: item.section || 'Custom',
          description: item.description || '',
          cost: item.cost || 0,
          costCurrency: item.costCurrency || 'MYR',
          selling: item.selling || 0,
          sellingCurrency: item.sellingCurrency || 'MYR',
          isNew: true
        }));
        setFclBilling(newBilling);
      }
    }
  }, [route.pol, route.pod, route.fclCustomer, route.type, editManifestId, fclTemplates, companies]);

  const inventory = getActiveInventory(editManifestId);
  
  let availableCargo = inventory.filter(item => 
    item.transactionType === 'LCL Consolidate' && 
    (item.pol || '').toLowerCase() === (route.pol || '').toLowerCase() && 
    (item.pod || '').toLowerCase() === (route.pod || '').toLowerCase() &&
    item.currentQty > 0
  );

  availableCargo = availableCargo.sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    
    if (sortField === 'date') {
       valA = new Date(valA).getTime();
       valB = new Date(valB).getTime();
    }
    
    if (sortField === 'isUrgent') {
        valA = a.isUrgent ? 1 : 0;
        valB = b.isUrgent ? 1 : 0;
    }

    if (valA < valB) return sortDesc ? 1 : -1;
    if (valA > valB) return sortDesc ? -1 : 1;
    return 0;
  });

  const handleRouteChange = (e) => {
    let value = e.target.value;
    if (e.target.tagName !== 'SELECT' && typeof value === 'string') {
      value = value.toUpperCase();
    }
    
    if (e.target.name === 'bookingId' && value) {
      // value is in format "bookingId::containerId"
      const [bId, cId] = value.split('::');
      const b = containerBookings.find(x => x.id === bId);
      if (b) {
        const c = b.containers?.find(x => x.id === cId) || {};
        setRoute({ 
          ...route, 
          bookingId: value, 
          blNo: b.blNo || '', 
          jobNo: b.jobNo || '', 
          pol: b.pol || '', 
          pod: b.pod || '',
          vessel: b.vessel || '',
          voyage: b.voyage || '',
          containerNo: c.containerNo || route.containerNo || '',
          etd: b.expectedSailingDate || '',
          eta: b.eta || ''
        });
        return;
      }
    }
    
    setRoute({ ...route, [e.target.name]: value });
  };

  const addCargoToManifest = (item, qtyToLoad) => {
    const loadQty = parseInt(qtyToLoad) || 0;
    if (loadQty <= 0 || loadQty > item.currentQty) return;

    const existingItemIndex = manifestItems.findIndex(m => m.receiptId === item.receiptId && m.originalLineId === item.originalLineId);
    
    if (existingItemIndex >= 0) {
      const newItems = [...manifestItems];
      const currentLoadQty = parseInt(newItems[existingItemIndex].loadQty) || 0;
      const newTotalQty = currentLoadQty + loadQty;
      
      if (newTotalQty <= item.currentQty) { 
        newItems[existingItemIndex].loadQty = newTotalQty;
        setManifestItems(newItems);
      } else {
        showMessage(`Cannot exceed available quantity of ${item.currentQty}`);
      }
    } else {
      const newHbl = generateLineHBL(item.date, route.pol, route.pod, hblCountersMap);
      
      const d = new Date(item.date);
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const routeStr = `${route.pol || ''}${route.pod || ''}`.replace(/[^A-Z0-9]/ig, '').toUpperCase();
      const key = `${yy}${mm}${dd}-${routeStr}`;

      setHblCountersMap(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));

      setManifestItems([...manifestItems, {
        receiptId: item.receiptId,
        originalLineId: item.originalLineId,
        date: item.date,
        customer: item.customer,
        consignee: item.consignee,
        consignor: item.consignor,
        product: item.product,
        uom: item.uom,
        loadQty: loadQty,
        unitCbm: item.unitCbm,
        unitWeight: item.unitWeight,
        hblNo: newHbl
      }]);
    }
  };

  const updateManifestItemQty = (idx, item, newQtyVal) => {
    if (newQtyVal === '') {
      const newItems = [...manifestItems];
      newItems[idx].loadQty = '';
      setManifestItems(newItems);
      return;
    }
    const qty = parseInt(newQtyVal);
    if (isNaN(qty) || qty < 0) return;
    const origItem = inventory.find(i => i.receiptId === item.receiptId && i.originalLineId === item.originalLineId);
    if (origItem && qty > origItem.currentQty) return showMessage(`Limit: ${origItem.currentQty}`);

    const newItems = [...manifestItems];
    newItems[idx].loadQty = qty;
    setManifestItems(newItems);
  };

  const removeCargoFromManifest = (idx) => setManifestItems(manifestItems.filter((_, i) => i !== idx));

  // --- FCL Product Helpers ---
  const addFclProduct = () => setFclProducts([...fclProducts, { description: '', hsCode: '', qty: '', uom: 'Carton', weight: '' }]);
  const updateFclProduct = (idx, field, val) => {
    const list = [...fclProducts];
    list[idx][field] = val;
    setFclProducts(list);
  };
  const removeFclProduct = (idx) => setFclProducts(fclProducts.filter((_, i) => i !== idx));

  // --- FCL Billing Helpers ---
  const addFclBillingItem = () => setFclBilling([...fclBilling, { section: 'Custom', description: '', cost: '', costCurrency: 'MYR', selling: '', sellingCurrency: 'MYR', isNew: true }]);
  const updateFclBilling = (idx, field, val) => {
    const list = [...fclBilling];
    list[idx][field] = val;
    setFclBilling(list);
  };
  const removeFclBilling = (idx) => setFclBilling(fclBilling.filter((_, i) => i !== idx));
  
  const calculateTotals = () => {
     let c = 0, s = 0;
     fclBilling.forEach(b => {
         // Assuming base currency is MYR for simple demo
         c += (parseFloat(b.cost) || 0);
         s += (parseFloat(b.selling) || 0);
     });
     const diff = s - c;
     const margin = s > 0 ? ((diff / s) * 100).toFixed(2) : 0;
     return { cost: c, selling: s, profit: diff, margin };
  };

  const saveManifest = () => {
    if (!route.pol || !route.pod) return showMessage("POL and POD are required.");
    
    let finalLines = [];
    let totalCBM = 0;
    let totalWeight = 0;
    
    if (route.type === 'LCL') {
        finalLines = manifestItems.filter(item => parseInt(item.loadQty) > 0);
        if (finalLines.length === 0 && !route.containerNo) return showMessage("Please enter Container No to save empty manifest, or add cargo.");
        totalCBM = finalLines.reduce((sum, item) => sum + (parseInt(item.loadQty) * item.unitCbm), 0);
        totalWeight = finalLines.reduce((sum, item) => sum + (parseInt(item.loadQty) * item.unitWeight), 0);
    } else {
        if (!route.fclCustomer) return showMessage("FCL Customer is required.");
        if (route.totalCBM === undefined || route.totalCBM === '' || isNaN(parseFloat(route.totalCBM))) return showMessage("Total CBM is required for FCL.");
        if (fclProducts.length === 0) return showMessage("Please add at least one product.");
        totalWeight = fclProducts.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
        totalCBM = parseFloat(route.totalCBM) || 0;
    }

    let finalManifest;
    if (editManifestId) {
      finalManifest = { id: editManifestId, date: manifests.find(m => m.id === editManifestId)?.date || new Date().toISOString(), ...route, lines: finalLines, fclProducts, fclBilling, totalCBM, totalWeight };
      setDoc(doc(db, 'manifests', editManifestId), finalManifest)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `manifests/${editManifestId}`));
      
      const oldM = manifests.find(m => m.id === editManifestId);
      logActivity('UPDATE', 'Manifest Manager', editManifestId, 'Updated container manifest', oldM, finalManifest);
      const companiesToNotify = route.type === 'LCL' ? Array.from(new Set(finalLines.map((l: any) => l.customer))) : [route.fclCustomer];
      pushNotificationToRelatedUsers(companiesToNotify, 'Manifest Updated', `Manifest ${editManifestId} has been updated.`);
      setEditManifestId(null);
      showMessage("Manifest updated successfully.", "success");
    } else {
      const d = new Date();
      const newId = generateManifestNo(d, route.pol, route.pod, manifestCountersMap);
      
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const routeStr = `${route.pol || ''}${route.pod || ''}`.replace(/[^A-Z0-9]/ig, '').toUpperCase();
      const key = `${yy}${mm}-${routeStr}`;
      
      setDoc(doc(db, 'system', 'counters'), { 
        manifestCountersMap: { ...manifestCountersMap, [key]: (manifestCountersMap[key] || 0) + 1 }
      }, { merge: true });

      finalManifest = { id: newId, date: d.toISOString(), ...route, lines: finalLines, fclProducts, fclBilling, totalCBM, totalWeight };
      setDoc(doc(db, 'manifests', newId), finalManifest)
        .catch(err => handleFirestoreError(err, OperationType.WRITE, `manifests/${newId}`));

      logActivity('CREATE', 'Manifest Manager', newId, 'Created new container manifest');
      const companiesToNotify = route.type === 'LCL' ? Array.from(new Set(finalLines.map((l: any) => l.customer))) : [route.fclCustomer];
      pushNotificationToRelatedUsers(companiesToNotify, 'New Manifest', `Manifest ${newId} has been created.`);
      showMessage("Manifest created successfully.", "success");
    }
    setActiveTab('manifest-list');
  };

  const masterCBM = manifestItems.reduce((sum, item) => sum + ((parseInt(item.loadQty) || 0) * item.unitCbm), 0).toFixed(3);
  const masterWeight = manifestItems.reduce((sum, item) => sum + ((parseInt(item.loadQty) || 0) * item.unitWeight), 0).toFixed(2);

  const containerTypeId = route.bookingId ? containerBookings.find(b => b.id === route.bookingId.split('::')[0])?.containers?.find(c => c.id === route.bookingId.split('::')[1])?.containerTypeId : null;
  const containerDef = containerTypeId ? (containerTypes || []).find(t => t.id === containerTypeId || t.name === containerTypeId) : null;
  const maxCbm = containerDef ? containerDef.cbmCapacity : 0;
  const maxWgt = containerDef ? containerDef.payload : 0;
  
  const cbmNum = parseFloat(masterCBM);
  const wgtNum = parseFloat(masterWeight);

  const cbmColor = (maxCbm > 0 && cbmNum > maxCbm) ? 'text-red-600 font-bold' : 'text-emerald-600';
  const wgtColor = (maxWgt > 0 && wgtNum > maxWgt) ? 'text-red-600 font-bold' : 'text-emerald-600';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
       <datalist id="port_list_mnf">
        {(ports || []).map(p => {
          const display = p.portName ? `${p.name} - ${p.portName} ${p.country ? `(${p.country})` : ''}` : p.name;
          return <option key={p.id} value={p.name}>{display}</option>;
        })}
       </datalist>

       <ActiveRouteSummary />

       <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {editManifestId ? (route.type === 'FCL' ? 'Edit FCL Manifest' : 'Edit Manifest') : (route.type === 'FCL' ? 'New FCL Container' : 'New Container Manifest')}
          </h2>
          {editManifestId && <button onClick={() => {setEditManifestId(null); setActiveTab('manifest-list');}} className="text-sm text-slate-500 border border-slate-300 px-3 py-1 rounded bg-white">Cancel Edit</button>}
        </div>
        <span className="px-4 py-2 bg-teal-50 text-teal-700 rounded-lg font-mono font-medium border border-teal-200">{editManifestId || generateManifestNo(new Date(), route.pol, route.pod, manifestCountersMap)}</span>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-lg font-semibold text-slate-800">Manifest Type & Route</h3>
          <div className="flex p-1 bg-slate-100 rounded-lg">
            <button 
              onClick={() => setRoute(prev => ({ ...prev, type: 'LCL' }))}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${route.type === 'LCL' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              LCL (Consolidation)
            </button>
            <button 
              onClick={() => setRoute(prev => ({ ...prev, type: 'FCL' }))}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${route.type === 'FCL' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              FCL (Full Container)
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {route.type === 'FCL' && (
            <>
              <datalist id="fcl_customer_list">{(companies || []).filter(c => c.isCustomer).map(c => <option key={c.id} value={c.name} />)}</datalist>
              <datalist id="fcl_consignee_list">{(companies || []).filter(c => c.isConsignee).map(c => <option key={c.id} value={c.name} />)}</datalist>
              <datalist id="fcl_consignor_list">{(companies || []).filter(c => c.isConsignor).map(c => <option key={c.id} value={c.name} />)}</datalist>
              <div className="lg:col-span-2 animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer (FCL Owner)</label>
                <input 
                  list="fcl_customer_list" name="fclCustomer" value={route.fclCustomer} onChange={handleRouteChange} 
                  className="w-full p-2 border border-indigo-300 rounded-md bg-indigo-50/30" 
                  placeholder="Customer name"
                />
              </div>
              <div className="lg:col-span-2 animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-slate-700 mb-1">Consignee</label>
                <input 
                  list="fcl_consignee_list" name="consignee" value={route.consignee || ''} onChange={handleRouteChange} 
                  className="w-full p-2 border border-indigo-300 rounded-md bg-indigo-50/30" 
                  placeholder="Consignee name"
                />
              </div>
              <div className="lg:col-span-2 animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-slate-700 mb-1">Consignor</label>
                <input 
                  list="fcl_consignor_list" name="consignor" value={route.consignor || ''} onChange={handleRouteChange} 
                  className="w-full p-2 border border-indigo-300 rounded-md bg-indigo-50/30" 
                  placeholder="Consignor name"
                />
              </div>
              <div className="lg:col-span-2 animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-slate-700 mb-1">Total CBM <span className="text-red-500">*</span></label>
                <input 
                  type="number" step="0.001" name="totalCBM" value={route.totalCBM} onChange={handleRouteChange} 
                  className="w-full p-2 border border-indigo-300 rounded-md bg-indigo-50/30" 
                  placeholder="e.g. 28.5"
                />
              </div>
            </>
          )}
          <div className="lg:col-span-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Booking Connection</label>
            <select name="bookingId" value={route.bookingId || ''} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md">
              <option value="">-- Manual (No Booking) --</option>
              {containerBookings.map(b => {
                 if (!b.containers || b.containers.length === 0) return null;
                 return b.containers.map(c => {
                    const cType = c.usageType || 'LCL';
                    if (cType !== (route.type || 'LCL')) return null;

                    const optionId = `${b.id}::${c.id}`;
                    const isUsed = (manifests || []).some(m => m.id !== editManifestId && m.bookingId === optionId);
                    if (isUsed && optionId !== route.bookingId) return null;
                    return (
                      <option key={optionId} value={optionId}>
                        {c.usageType === 'FCL' ? '[FCL]' : '[LCL]'} {c.containerCbn || b.id} {b.bookingNo ? `(Liner: ${b.bookingNo})` : ''} - {c.containerTypeId || 'Unknown'} - {c.containerNo || 'No Container Num'} - {b.pol} to {b.pod}
                      </option>
                    )
                 });
              })}
            </select>
          </div>
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">POL (Origin) <span className="text-red-500">*</span></label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input list="port_list_mnf" name="pol" value={route.pol} onChange={handleRouteChange} className="w-full pl-9 p-2 border border-slate-300 rounded-md" placeholder="Search POL..." />
            </div>
          </div>
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">POD (Destination) <span className="text-red-500">*</span></label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input list="port_list_mnf" name="pod" value={route.pod} onChange={handleRouteChange} className="w-full pl-9 p-2 border border-slate-300 rounded-md" placeholder="Search POD..." />
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Master BL Number</label>
            <input type="text" name="blNo" value={route.blNo || ''} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md font-mono text-sm" />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Vessel</label>
            <input type="text" name="vessel" value={route.vessel || ''} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Voyage</label>
            <input type="text" name="voyage" value={route.voyage || ''} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Container No.</label>
            <input type="text" name="containerNo" value={route.containerNo || ''} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Seal No.</label>
            <input type="text" name="sealNo" value={route.sealNo || ''} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select name="status" value={route.status || 'OPEN'} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md font-bold uppercase text-xs">
              <option value="OPEN">Open</option>
              <option value="MANIFESTED">Manifested</option>
              <option value="SAILING">Sailing</option>
              <option value="VESSEL_DELAYED">Vessel Delayed</option>
              <option value="BERTHED">Vessel Berthed</option>
              <option value="PENDING_POD_CUSTOMS">Pending POD Customs</option>
              <option value="DE_CONSOLIDATING">De-Consolidating</option>
              <option value="READY_FOR_COLLECTION">Ready for Collection</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">ETD</label>
            <input type="date" name="etd" value={route.etd || ''} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">ETA</label>
            <input type="date" name="eta" value={route.eta || ''} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Actual Sailing</label>
            <input type="date" name="sailingDate" value={route.sailingDate || ''} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Actual Berthing</label>
            <input type="date" name="berthingDate" value={route.berthingDate || ''} onChange={handleRouteChange} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
          </div>
        </div>
      </div>

      {route.type === 'LCL' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-semibold text-slate-800">Available LCL Cargo</h3>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-slate-500">Sort:</span>
                <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="border border-slate-300 rounded p-1">
                  <option value="date">Receiving Date</option>
                  <option value="isUrgent">Urgency</option>
                  <option value="customer">Customer</option>
                  <option value="consignee">Consignee</option>
                  <option value="consignor">Consignor</option>
                </select>
                <button onClick={() => setSortDesc(!sortDesc)} className="p-1 border border-slate-300 rounded bg-slate-50 hover:bg-slate-100">
                  <ArrowUpDown className="w-4 h-4 text-slate-600"/>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {availableCargo.length === 0 ? (
                <p className="text-slate-500 text-sm text-center mt-10">No active cargo found for {route.pol} to {route.pod}.</p>
              ) : (
                <div className="space-y-3">
                  {availableCargo.map((item) => {
                    const stagingItem = manifestItems.find(m => m.receiptId === item.receiptId && m.originalLineId === item.originalLineId);
                    const stagingQty = stagingItem ? stagingItem.loadQty : 0;
                    const netAvailable = item.currentQty - stagingQty;
                    if (netAvailable <= 0) return null;

                    return (
                      <div key={`${item.receiptId}-${item.originalLineId}`} className={`p-3 border rounded-lg flex flex-col ${item.isUrgent ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                          <div>
                            <p className={`text-xs font-bold ${item.isUrgent ? 'text-red-700' : 'text-blue-600'}`}>
                              {item.receiptId} {item.isUrgent && <span className="bg-red-600 text-white px-1.5 py-0.5 ml-2 rounded text-[9px] uppercase tracking-wider">Urgent</span>}
                            </p>
                            <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase">Cust: <span className="font-semibold text-slate-700">{item.customer}</span></p>
                            <p className="text-[10px] text-slate-500 uppercase">Cnee: <span className="font-semibold text-slate-700">{item.consignee || '-'}</span></p>
                            <p className="text-[10px] text-slate-500 uppercase">Cnor: <span className="font-semibold text-slate-700">{item.consignor || '-'}</span></p>
                          </div>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{item.product} ({item.uom})</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Orig: {item.receivedQty} | Assgn: {stagingQty} | 
                              <span className="font-bold text-blue-600 ml-1">Outst: {netAvailable} {item.uom}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              CBM: {(netAvailable * item.unitCbm).toFixed(3)} | Wgt: {(netAvailable * item.unitWeight).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="number" id={`loadQty-${item.receiptId}-${item.originalLineId}`}
                              defaultValue={netAvailable} min="1" max={netAvailable} 
                              className="w-16 p-1 text-sm border border-slate-300 rounded text-center"
                            />
                            <button 
                              onClick={() => {
                                const el = document.getElementById(`loadQty-${item.receiptId}-${item.originalLineId}`) as HTMLInputElement;
                                if (el) addCargoToManifest(item, el.value);
                              }}
                              className="bg-teal-100 text-teal-700 p-1.5 rounded hover:bg-teal-200"
                            ><Plus className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-semibold text-slate-800">Master Manifest</h3>
              <div className="text-right text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
                <span className={cbmColor}>Total {masterCBM} cbm {maxCbm > 0 ? `/ ${maxCbm} container cbm capacity` : ''}</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className={wgtColor}>{masterWeight} kg {maxWgt > 0 ? `/ ${maxWgt} container weight capacity` : ''}</span>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {manifestItems.length === 0 ? (
                <p className="text-slate-500 text-sm text-center mt-10">Manifest is empty. Add cargo from the left.</p>
              ) : (
                <div className="space-y-3">
                  {manifestItems.map((item, idx) => (
                    <div key={idx} className="p-3 border border-teal-200 rounded-lg flex flex-col bg-teal-50/30">
                      <div className="flex justify-between items-start mb-2 border-b border-teal-100 pb-2">
                        <div>
                          <p className="text-xs font-bold text-teal-700">{item.receiptId}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{item.customer} <span className="mx-1">|</span> <span className="font-bold text-teal-800">{item.hblNo}</span></p>
                        </div>
                        <button onClick={() => removeCargoFromManifest(idx)} className="text-red-400 hover:text-red-600 p-1.5"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.product}</p>
                          <p className="text-xs text-slate-500 mt-1">CBM: {((parseInt(item.loadQty)||0) * item.unitCbm).toFixed(3)} | Wgt: {((parseInt(item.loadQty)||0) * item.unitWeight).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <input 
                            type="number" value={item.loadQty} 
                            onChange={(e) => updateManifestItemQty(idx, item, e.target.value)}
                            className="w-16 p-1 text-sm border border-slate-300 rounded text-center bg-white"
                          />
                          <span className="text-xs font-semibold text-slate-600">{item.uom}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200">
              <button onClick={saveManifest} className="w-full flex items-center justify-center space-x-2 bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-teal-700">
                <Save className="w-5 h-5" /><span>Save Container Manifest</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {route.type === 'FCL' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-semibold text-slate-800">FCL Products</h3>
              <button onClick={addFclProduct} className="flex items-center space-x-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-100 font-medium"><Plus className="w-4 h-4"/> <span>Add Product</span></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-2 border-b font-semibold">Description / Product Name</th>
                    <th className="p-2 border-b font-semibold w-32">HS Code</th>
                    <th className="p-2 border-b font-semibold w-24">Qty</th>
                    <th className="p-2 border-b font-semibold w-32">UoM</th>
                    <th className="p-2 border-b font-semibold w-32 text-right">Weight (KG)</th>
                    <th className="p-2 border-b w-12"></th>
                  </tr>
                </thead>
                <tbody>
                   {fclProducts.map((p, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-1"><input type="text" value={p.description || ''} onChange={(e) => updateFclProduct(idx, 'description', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm"/></td>
                        <td className="p-1"><input type="text" value={p.hsCode || ''} onChange={(e) => updateFclProduct(idx, 'hsCode', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm font-mono text-center"/></td>
                        <td className="p-1"><input type="number" value={p.qty || ''} onChange={(e) => updateFclProduct(idx, 'qty', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm text-center"/></td>
                        <td className="p-1">
                          <select value={p.uom || 'Carton'} onChange={(e) => updateFclProduct(idx, 'uom', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm">
                            <option>Carton</option><option>Pallet</option><option>Pieces</option><option>Bundle</option><option>Unit</option>
                          </select>
                        </td>
                        <td className="p-1"><input type="number" value={p.weight || ''} onChange={(e) => updateFclProduct(idx, 'weight', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm text-right"/></td>
                        <td className="p-1 text-center"><button onClick={() => removeFclProduct(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button></td>
                      </tr>
                   ))}
                   {fclProducts.length === 0 && <tr><td colSpan="6" className="text-center p-4 text-slate-500 text-sm">No products added.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-semibold text-slate-800">Costing & Billing</h3>
              <button onClick={addFclBillingItem} className="flex items-center space-x-1 text-sm bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded hover:bg-emerald-100 font-medium"><Plus className="w-4 h-4"/> <span>Add Line Item</span></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-2 border-b font-semibold w-40">Section</th>
                    <th className="p-2 border-b font-semibold">Description</th>
                    <th className="p-2 border-b font-semibold w-40 text-right">Cost</th>
                    <th className="p-2 border-b font-semibold w-40 text-right">Selling Price</th>
                    <th className="p-2 border-b w-12"></th>
                  </tr>
                </thead>
                <tbody>
                   {fclBilling.map((b, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-1">
                          <select value={b.section || 'Custom'} onChange={(e) => updateFclBilling(idx, 'section', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-1">
                            <option>Ocean Freight</option><option>Haulage</option><option>Forwarding</option><option>Custom</option>
                          </select>
                        </td>
                        <td className="p-1"><input type="text" value={b.description || ''} onChange={(e) => updateFclBilling(idx, 'description', e.target.value)} className={`w-full p-2 border border-slate-300 rounded text-sm ${b.isNew ? 'bg-white' : 'bg-slate-50 text-slate-600'}`}/></td>
                        <td className="p-1 relative">
                          <span className="absolute left-3 top-3 text-sm text-slate-400 font-mono text-xs mt-0.5">{b.costCurrency}</span>
                          <input type="number" step="0.01" value={b.cost || ''} onChange={(e) => updateFclBilling(idx, 'cost', e.target.value)} className="w-full p-2 pl-10 border border-red-200 bg-red-50/30 rounded text-sm text-right"/>
                        </td>
                        <td className="p-1 relative">
                          <span className="absolute left-3 top-3 text-sm text-slate-400 font-mono text-xs mt-0.5">{b.sellingCurrency}</span>
                          <input type="number" step="0.01" value={b.selling || ''} onChange={(e) => updateFclBilling(idx, 'selling', e.target.value)} className="w-full p-2 pl-10 border border-green-200 bg-green-50/30 rounded text-sm text-right"/>
                        </td>
                        <td className="p-1 text-center"><button onClick={() => removeFclBilling(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button></td>
                      </tr>
                   ))}
                </tbody>
              </table>
            </div>

            {fclBilling.length > 0 && (
               <div className="mt-6 flex justify-end">
                   <div className="w-72 bg-slate-50 rounded-lg p-4 border border-slate-200">
                       <div className="flex justify-between mb-2 text-sm">
                           <span className="text-slate-500">Total Cost:</span>
                           <span className="font-mono text-red-600 font-medium">MYR {calculateTotals().cost.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between mb-2 text-sm">
                           <span className="text-slate-500">Total Selling:</span>
                           <span className="font-mono text-emerald-600 font-medium">MYR {calculateTotals().selling.toFixed(2)}</span>
                       </div>
                       <div className="border-t border-slate-300 my-2"></div>
                       <div className="flex justify-between mb-1">
                           <span className="text-slate-700 font-medium">Est. Profit:</span>
                           <span className={`font-mono font-bold ${calculateTotals().profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>MYR {calculateTotals().profit.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                           <span className="text-slate-500">Profit Margin:</span>
                           <span className={`font-medium ${parseFloat(String(calculateTotals().margin)) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{calculateTotals().margin}%</span>
                       </div>
                   </div>
               </div>
            )}

            <div className="pt-6 mt-6 border-t border-slate-200">
              <button onClick={saveManifest} className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700">
                <Save className="w-5 h-5" /><span>Save FCL Container</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {editManifestId && <ActivityHistory recordId={editManifestId} />}
    </div>
  );
};

const DeConsolidationModule = () => {
  const { 
    currentUser, manifests, companies, warehouses, showMessage, logActivity, formatDate
  } = React.useContext(AppContext);

  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');

  // Filter manifests that are relevant to this warehouse operator
  const warehouseManifests = useMemo(() => {
    return (manifests || []).filter(m => {
      // If superadmin, show all. If operator, filter by company/warehouse association
      if (currentUser?.roleId === 'role-superadmin') return true;
      
      const userCompany = companies.find(c => c.id === currentUser?.companyId);
      // Logic: If manifest destination matches one of the operator's warehouse locations
      return m.destination === userCompany?.name;
    });
  }, [manifests, currentUser, companies]);

  const updateStatus = (mId, lineId, newStatus) => {
    // This would typically update a specific shipment status within the manifest
    showMessage(`Status updated to ${newStatus}`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Boxes className="w-6 h-6 text-indigo-500" />
          De-Consolidation Warehouse Operations
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Warehouse:</span>
          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
            {companies.find(c => c.id === currentUser?.companyId)?.name || 'All Warehouses'}
          </span>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        {['pending', 'in-progress', 'completed'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-t-lg font-bold text-sm transition-all ${activeTab === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="p-4">Cargo / Manifest ID</th>
              <th className="p-4">Reference / BL</th>
              <th className="p-4">Vessel / Arrival</th>
              <th className="p-4">Status</th>
              <th className="p-4">Planned Distribution</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {warehouseManifests.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">No cargo records found for this warehouse.</td></tr>
            ) : (
              warehouseManifests.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-indigo-600 font-mono">{m.id}</p>
                    <p className="text-xs text-slate-500 mt-1">{m.containerNo}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-700">{m.jobNo || '-'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">MBL: {m.blNo || '-'}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-slate-800">{m.vessel || 'TBD'}</p>
                    <p className="text-xs text-slate-500 mt-1">Arrival: {formatDate(m.date)}</p>
                  </td>
                  <td className="p-4">
                     <select 
                       value={m.status || 'OPEN'}
                       onChange={(e) => {
                         const newStatus = e.target.value;
                         setDoc(doc(db, 'manifests', m.id), { ...m, status: newStatus })
                           .then(() => logActivity('UPDATE', 'Manifest Manager', m.id, `Status updated to ${newStatus}`))
                           .catch(err => handleFirestoreError(err, OperationType.WRITE, `manifests/${m.id}`));
                       }}
                       className="p-1.5 border rounded text-xs font-bold uppercase bg-slate-50 text-slate-700 border-slate-300"
                     >
                        <option value="OPEN">Open</option>
                        <option value="MANIFESTED">Manifested</option>
                        <option value="SAILING">Sailing</option>
                        <option value="VESSEL_DELAYED">Vessel Delayed</option>
                        <option value="BERTHED">Vessel Berthed</option>
                        <option value="GATED_OUT">Gated Out to Port</option>
                        <option value="DISCHARGED">Discharged</option>
                        <option value="GATE_PASS_ISSUED">Gate Pass Issued</option>
                        <option value="CLEARED_CUSTOMS">Cleared Customs</option>
                        <option value="GATED_IN">Gated in to Warehouse</option>
                        <option value="UNSTUFFED">Unstuffed</option>
                        <option value="STOCK_IN">Stock-In Received</option>
                        <option value="PENDING_DISTRIBUTION">Pending Distribution</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="COMPLETED">SID Completed</option>
                     </select>
                  </td>
                  <td className="p-4">
                    <input type="date" className="p-1.5 border rounded text-xs border-slate-300" />
                  </td>
                  <td className="p-4 text-center">
                    <button className="text-blue-600 hover:text-blue-800 font-bold text-xs px-3 py-1.5 bg-blue-50 rounded-lg">View Units</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManifestList = () => {
	
  const { 
    checkAccess, manifests, setPrintingPackingList, setPrintingDeliveryOrders, 
    setEditManifestId, setActiveTab, setManifests, showMessage, haulierBookings,
    containerBookings, containerTypes
  } = React.useContext(AppContext);

  if (!checkAccess('manifests', 'view')) return <div className="p-8 text-center text-slate-500">You do not have permission to view manifests.</div>;

  const [search, setSearch] = useState('');
  const [manifestToDelete, setManifestToDelete] = useState(null);

  const filteredManifests = (manifests || []).filter(m => {
    if (!search) return true;
    const term = search.toLowerCase();
    
    const matchesManifestInfo = (
      m.id.toLowerCase().includes(term) ||
      (m.containerNo && m.containerNo.toLowerCase().includes(term)) ||
      (m.jobNo && m.jobNo.toLowerCase().includes(term)) ||
      (m.blNo && m.blNo.toLowerCase().includes(term)) ||
      (m.pol && m.pol.toLowerCase().includes(term)) ||
      (m.pod && m.pod.toLowerCase().includes(term))
    );

    const matchesLineInfo = m.lines.some(l => 
      (l.receiptId && l.receiptId.toLowerCase().includes(term)) ||
      (l.hblNo && l.hblNo.toLowerCase().includes(term))
    );

    return matchesManifestInfo || matchesLineInfo;
  });

  return (
    <div className="space-y-6">
      <ActiveRouteSummary />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Container Manifests</h2>
        <div className="relative w-full sm:w-auto">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search manifests, SID, MBL, HBL, Container..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value.toUpperCase())} 
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full sm:w-80 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-700">Manifest No</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Type</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Refs (MBL / Job)</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Route (POL - POD)</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Container Status</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Shipping Dates</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-right">Capacity (CBM / Wgt)</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredManifests.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-500">No manifests found matching the search criteria.</td></tr>
            ) : (
              filteredManifests.map(m => {
                const containerTypeId = m.bookingId ? containerBookings?.find(b => b.id === m.bookingId.split('::')[0])?.containers?.find(c => c.id === m.bookingId.split('::')[1])?.containerTypeId : null;
                const containerDef = containerTypeId ? (containerTypes || []).find(t => t.id === containerTypeId || t.name === containerTypeId) : null;
                const maxCbm = containerDef ? containerDef.cbmCapacity : 0;
                const maxWgt = containerDef ? containerDef.payload : 0;
                const cbmColor = (maxCbm > 0 && m.totalCBM > maxCbm) ? 'text-red-600 font-bold' : 'text-emerald-600';
                const wgtColor = (maxWgt > 0 && m.totalWeight > maxWgt) ? 'text-red-600 font-bold' : 'text-emerald-600';

                return (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="p-4 text-sm font-medium text-teal-600">
                    <div className="flex flex-col">
                      <span>{m.id}</span>
                      <span className="text-xs text-slate-500 font-normal">{formatDate(m.date)}</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${m.type === 'FCL' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-teal-100 text-teal-700 border border-teal-200'}`}>
                      {m.type || 'LCL'}
                    </span>
                    {m.type === 'FCL' && m.fclCustomer && (
                      <p className="mt-1 text-[10px] text-slate-500 truncate max-w-[120px]">{m.fclCustomer}</p>
                    )}
                  </td>
                  <td className="p-4 text-xs text-slate-600">
                    MBL: <span className="font-semibold">{m.blNo || '-'}</span><br/>
                    Job: <span className="font-semibold">{m.jobNo || '-'}</span><br/>
                    Vsl: <span className="font-semibold">{m.vessel || '-'} {m.voyage || ''}</span>
                  </td>
                  <td className="p-4 text-sm font-medium text-slate-800">{m.pol} <span className="text-slate-400 font-normal mx-1">to</span> {m.pod}</td>
                  <td className="p-4">
                     <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-tight ${
                        m.status === 'DELIVERED' || m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        m.status === 'VESSEL_DELAYED' ? 'bg-red-100 text-red-700' :
                        m.status === 'BERTHED' ? 'bg-sky-100 text-sky-700' :
                        'bg-blue-100 text-blue-700'
                     }`}>
                        {(m.status || 'OPEN').replace(/_/g, ' ')}
                     </span>
                     <div className="mt-2 text-[10px] text-slate-500 leading-tight">
                        {['POL', 'POD'].map(seg => {
                          const hb = (haulierBookings || []).find(h => h.cbn === m.bookingId && h.segment === seg);
                          if (!hb) return null;
                          return (
                            <div key={seg} className="opacity-70 italic">
                               <span className="font-semibold text-indigo-700">{seg} Haul:</span> {hb.id} ({hb.ladenLeg?.status || 'PENDING'})
                            </div>
                          );
                        })}
                     </div>
                   </td>
                   <td className="p-4 text-[10px] text-slate-600 space-y-1">
                      <div className="flex justify-between"><span>ETD/ETA:</span> <span className="font-bold text-slate-800">{m.etd || '-'} / {m.eta || '-'}</span></div>
                      <div className="flex justify-between"><span>Sailed:</span> <span className="font-bold text-blue-600">{m.sailingDate || '-'}</span></div>
                      <div className="flex justify-between"><span>Berthed:</span> <span className="font-bold text-teal-600">{m.berthingDate || '-'}</span></div>
                      <div className="pt-1 mt-1 border-t border-slate-100">
                        Container: <span className="font-semibold text-slate-800">{m.containerNo || '-'}</span>
                      </div>
                   </td>
                  <td className="p-4 text-sm text-right leading-tight">
                     <div className={cbmColor}>{m.totalCBM.toFixed(3)} m³ {maxCbm > 0 ? <span className="text-[10px] text-slate-400 block font-normal">/ {maxCbm} max</span> : ''}</div>
                     <div className={`mt-1 ${wgtColor}`}>{m.totalWeight.toFixed(2)} kg {maxWgt > 0 ? <span className="text-[10px] text-slate-400 block font-normal">/ {maxWgt} max</span> : ''}</div>
                  </td>
                  <td className="p-4 text-sm text-center">
                    <div className="flex justify-center space-x-2 mb-2">
                      {checkAccess('manifests', 'print') && (
                        <>
                          <button onClick={() => setPrintingPackingList(m)} className="px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-xs font-medium flex items-center" title="Print Packing List"><FileText className="w-3 h-3 mr-1"/> P/L</button>
                          <button onClick={() => setPrintingDeliveryOrders(m)} className="px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-xs font-medium flex items-center" title="Print Delivery Orders"><ClipboardList className="w-3 h-3 mr-1"/> D/O</button>
                        </>
                      )}
                    </div>
                    <div className="flex justify-center space-x-2">
                      {checkAccess('manifests', 'edit') && (
                        <button onClick={() => { setEditManifestId(m.id); setActiveTab('new-manifest'); }} className="text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs font-medium">Edit</button>
                      )}
                      {checkAccess('manifests', 'delete') && (
                        <button onClick={() => setManifestToDelete(m.id)} className="text-red-600 hover:text-red-800 px-2 py-1 bg-red-50 hover:bg-red-100 rounded text-xs font-medium">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {manifestToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Manifest</h3>
            <p className="text-slate-600 text-sm mb-6">Are you sure you want to delete <span className="font-bold">{manifestToDelete}</span>? The assigned cargo will be returned to the active inventory.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setManifestToDelete(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">Cancel</button>
              <button 
                onClick={() => {
                  deleteDoc(doc(db, 'manifests', manifestToDelete))
                    .catch(err => handleFirestoreError(err, OperationType.DELETE, `manifests/${manifestToDelete}`));
                  setManifestToDelete(null);
                  showMessage("Manifest deleted. Cargo returned to inventory.", "success");
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HaulierBookingForm = () => {
  const {
    checkAccess, editHaulierBookingId, haulierBookings, setHaulierBookings, setEditHaulierBookingId,
    setActiveTab, showMessage, companies, generateHaulierBookingNo, setHaulierCounter, haulierCounter, containerBookings, manifests, logActivity
  } = React.useContext(AppContext);

  const [formData, setFormData] = useState({
    cbn: '', containerNo: '', blNo: '', bookingNo: '', haulierId: '', segment: 'POL',
    emptyLeg: { slotDate: '', slotTime: '', status: 'PENDING' },
    ladenLeg: { slotDate: '', slotTime: '', status: 'PENDING' }
  });

  const [selectingCbn, setSelectingCbn] = useState(false);

  useEffect(() => {
    if (editHaulierBookingId) {
      const h = (haulierBookings || []).find(x => x.id === editHaulierBookingId);
      if (h) {
        setFormData({
          ...h,
          emptyLeg: h.emptyLeg || { slotDate: '', slotTime: '', status: 'PENDING' },
          ladenLeg: h.ladenLeg || { slotDate: '', slotTime: '', status: 'PENDING' }
        });
      }
      setSelectingCbn(false);
    } else {
      setFormData({
        cbn: '', containerId: '', containerNo: '', blNo: '', bookingNo: '', jobNo: '', haulierId: '', segment: 'POL',
        emptyLeg: { slotDate: '', slotTime: '', status: 'PENDING' },
        ladenLeg: { slotDate: '', slotTime: '', status: 'PENDING' }
      });
      setSelectingCbn(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editHaulierBookingId]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleLegChange = (leg, field, value) => {
    setFormData({
      ...formData,
      [leg]: { ...formData[leg], [field]: value }
    });
  };

  const handleSelectCbn = (b, container, segmentStr) => {
    // Attempt to guess customer if FCL
    let customerName = '';
    if (container.usageType === 'FCL') {
        const manifest = (manifests || []).find(m => m.bookingId === b.id && m.containerNo === container.containerNo);
        if (manifest) {
            customerName = manifest.fclCustomer || '';
        }
    }

    setFormData({
      ...formData,
      cbn: b.id,
      containerId: container.id,
      containerNo: container.containerNo || '',
      usageType: container.usageType || 'LCL',
      customerName: customerName,
      jobNo: container.jobNo || '',
      blNo: b.blNo || '',
      bookingNo: b.bookingNo || '',
      segment: segmentStr,
      emptyLeg: { ...formData.emptyLeg, slotDate: b.emptyLadenDate || formData.emptyLeg.slotDate, location: '' },
      ladenLeg: { ...formData.ladenLeg, slotDate: b.ladenHaulierDate || formData.ladenLeg.slotDate, location: '' }
    });
    setSelectingCbn(false);
  };

  const save = () => {
    if (!formData.haulierId) return showMessage("Haulier Company is required.");
    let id = editHaulierBookingId;
    let incrementCounter = 0;
    
    // Determine the relevant port and sailing date from the associated container booking
    const selectedCbn = containerBookings.find(b => b.id === formData.cbn);
    const sailingDate = selectedCbn?.expectedSailingDate || new Date();
    const portCode = formData.segment === 'POL' ? (selectedCbn?.pol || 'POL') : (selectedCbn?.pod || 'POD');

    if (!editHaulierBookingId) {
      id = generateHaulierBookingNo(sailingDate, portCode);
      incrementCounter++;
    }
    const payload = { ...formData, id };
    
    setDoc(doc(db, 'haulierBookings', payload.id), payload)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `haulierBookings/${payload.id}`));

    if (payload.segment === 'POL' && payload.ladenLeg.status === 'COMPLETED') {
      const existingPod = (haulierBookings || []).find(h => h.cbn === payload.cbn && h.segment === 'POD');
      if (!existingPod) {
        // Auto-create pending POD booking
        const podId = generateHaulierBookingNo(sailingDate, selectedCbn?.pod || 'POD') + (incrementCounter > 0 ? '' : 'P');
        const podPayload = {
          id: podId,
          cbn: payload.cbn,
          containerNo: payload.containerNo,
          blNo: payload.blNo,
          bookingNo: payload.bookingNo,
          haulierId: formData.haulierId, // Use the same haulier
          segment: 'POD',
          emptyLeg: { slotDate: '', slotTime: '', status: 'PENDING' },
          ladenLeg: { slotDate: '', slotTime: '', status: 'PENDING' }
        };
        setDoc(doc(db, 'haulierBookings', podId), podPayload)
           .catch(err => handleFirestoreError(err, OperationType.WRITE, `haulierBookings/${podId}`));
        incrementCounter++;
      }
    }

    if (incrementCounter > 0) {
      setDoc(doc(db, 'system', 'counters'), { haulierCounter: haulierCounter + incrementCounter }, { merge: true });
    }

    if (!editHaulierBookingId) {
      logActivity('CREATE', 'Haulier Bookings', id, 'Created new haulier booking');
    } else {
      logActivity('UPDATE', 'Haulier Bookings', id, 'Updated haulier booking');
    }
    showMessage("Haulier Booking saved.", "success");
    setActiveTab('haulier-booking-list');
  };

  if (selectingCbn) {
    const availableContainers = (containerBookings || []).flatMap(b => {
      return (b.containers || []).map(c => {
         const polHSB = haulierBookings.find(h => h.containerId === c.id && h.segment === 'POL');
         const podHSB = haulierBookings.find(h => h.containerId === c.id && h.segment === 'POD');
         return { ...b, container: c, canPol: !polHSB, canPod: !podHSB && (!polHSB || polHSB.ladenLeg.status === 'COMPLETED') };
      });
    }).filter(item => item.canPol || item.canPod);

    return (
      <div className="max-w-6xl mx-auto space-y-6 flex flex-col h-full">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Truck className="w-6 h-6 text-indigo-600"/> Select Container for Haulage</h2>
          <button onClick={() => setActiveTab('haulier-booking-list')} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition">Cancel</button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10 shadow-sm text-xs">
              <tr>
                <th className="p-4 font-semibold text-slate-500 uppercase">Container / CBN</th>
                <th className="p-4 font-semibold text-slate-500 uppercase">Liner / MBL</th>
                <th className="p-4 font-semibold text-slate-500 uppercase">Sailing / Closing</th>
                <th className="p-4 font-semibold text-slate-500 uppercase text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {availableContainers.map(item => (
                <tr key={`${item.id}-${item.container.id}`} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-semibold text-indigo-700">{item.container.containerNo || 'Unknown Container'} <span className={`px-2 py-0.5 rounded text-xs ml-2 ${item.container.usageType === 'FCL' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'}`}>{item.container.usageType || 'LCL'}</span></p>
                    <p className="text-xs text-slate-500 font-mono mt-1">CBN: {item.id}</p>
                    <p className="text-xs text-slate-500">Job: {item.container.jobNo || '-'}</p>
                    <p className="text-xs text-slate-500">Type: {item.container.containerTypeId || '-'}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-800">Booking: {item.bookingNo || '-'}</p>
                    <p className="font-mono text-xs text-slate-500 mt-1">MBL: {item.blNo || '-'}</p>
                    <p className="text-xs text-slate-500 mt-1">Vessel: {item.vessel || '-'} / {item.voyage || '-'}</p>
                  </td>
                  <td className="p-4 text-xs">
                    <p>Sail: <span className="font-medium text-slate-700">{item.expectedSailingDate ? formatDate(item.expectedSailingDate) : '-'}</span></p>
                    <p>Close: <span className="font-medium text-slate-700">{item.containerClosingDate ? formatDate(item.containerClosingDate) : '-'}</span></p>
                    <p>Laden Haulier: <span className="font-medium text-slate-700">{item.ladenHaulierDate ? formatDate(item.ladenHaulierDate) : '-'}</span></p>
                  </td>
                  <td className="p-4 text-center space-x-2">
                    {item.canPol && <button onClick={() => handleSelectCbn(item, item.container, 'POL')} className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-medium text-xs mb-1 block">Assign POL (Export)</button>}
                    {item.canPod && <button onClick={() => handleSelectCbn(item, item.container, 'POD')} className="px-3 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded font-medium text-xs block">Assign POD (Import)</button>}
                  </td>
                </tr>
              ))}
              {availableContainers.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-500">No unassigned containers available.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const selectedCbnDetails = containerBookings.find(b => b.id === formData.cbn);

  return (
    <div className="max-w-4xl mx-auto space-y-6 flex flex-col h-full bg-slate-50/50 p-2 rounded-xl">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Truck className="w-6 h-6 text-indigo-600"/> {editHaulierBookingId ? 'Edit Haulier Slot Booking' : 'New Haulier Slot Booking'}</h2>
        <button onClick={() => { setEditHaulierBookingId(null); setActiveTab('haulier-booking-list'); }} className="text-slate-500 hover:text-slate-700 transition"><X className="w-6 h-6" /></button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Haulier Slot Booking ID</label>
          <input type="text" value={editHaulierBookingId || 'Will be generated on save'} disabled className="w-full p-2 border border-slate-200 bg-slate-100/50 text-slate-500 rounded-md font-mono" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Haulier Company <span className="text-red-500">*</span></label>
          <select name="haulierId" value={formData.haulierId} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md">
            <option value="">-- Select Haulier --</option>
            {companies.filter(c => c.isHaulier).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div><label className="block text-sm font-medium text-slate-700 mb-1">Container Booking Number (CBN)</label><input type="text" disabled value={formData.cbn} className="w-full p-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-md font-mono" /></div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Segment</label>
          <select name="segment" value={formData.segment} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md">
            <option value="POL">POL (Export)</option>
            <option value="POD">POD (Import)</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Liner Booking No.</label><input type="text" name="bookingNo" value={formData.bookingNo} onChange={(e) => setFormData({...formData, bookingNo: e.target.value.toUpperCase()})} className="w-full p-2 border border-slate-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Master BL No.</label><input type="text" name="blNo" value={formData.blNo} onChange={(e) => setFormData({...formData, blNo: e.target.value.toUpperCase()})} className="w-full p-2 border border-slate-300 rounded-md font-mono" /></div>
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Container Number</label>
           <div className="flex gap-2">
               <input type="text" name="containerNo" value={formData.containerNo} onChange={(e) => setFormData({...formData, containerNo: e.target.value.toUpperCase()})} className="w-full p-2 border border-slate-300 rounded-md font-mono" />
               <span className={`px-3 py-2 rounded-md font-bold text-sm ${formData.usageType === 'FCL' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'}`}>{formData.usageType || 'LCL'}</span>
           </div>
        </div>
        {formData.usageType === 'FCL' && (
           <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Customer (FCL)</label>
               <input type="text" name="customerName" value={formData.customerName || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md" />
           </div>
        )}

      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Leg 1: {formData.segment === 'POL' ? 'Empty Container (Depot to Warehouse)' : 'Laden Container (Port/Depot to Warehouse)'}</h3>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Location To</label><input type="text" value={formData.emptyLeg.location || ''} onChange={(e) => { handleLegChange('emptyLeg', 'location', e.target.value); if (!formData.ladenLeg.location) handleLegChange('ladenLeg', 'location', e.target.value); }} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. Warehouse A" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Slot Date</label><input type="date" max={formData.ladenLeg.slotDate || undefined} value={formData.emptyLeg.slotDate} onChange={(e) => handleLegChange('emptyLeg', 'slotDate', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Slot Time</label><input type="time" value={formData.emptyLeg.slotTime} onChange={(e) => handleLegChange('emptyLeg', 'slotTime', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={formData.emptyLeg.status} onChange={(e) => handleLegChange('emptyLeg', 'status', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                <option value="PENDING">Pending</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
         </div>
      </div>

      {selectedCbnDetails && (
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4 scale-95 origin-center">
          <div>
            <p className="text-sm text-indigo-900 font-semibold mb-1">Container Booking Focus: <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">{selectedCbnDetails.id}</span></p>
            <p className="text-xs text-indigo-700">Job: {formData.jobNo || '-'} | Liner: {formData.bookingNo || '-'} | MBL: {formData.blNo || '-'}</p>
          </div>
          <div className="flex flex-wrap gap-6 text-xs text-indigo-800 bg-white p-3 rounded-lg shadow-sm border border-indigo-100">
             <div>
               <span className="block text-indigo-400 font-semibold uppercase mb-1 text-[10px] sm:text-xs">
                 {formData.segment === 'POL' ? 'Rec. Empty Cargo' : 'Rec. Laden Cargo (Import)'}
               </span>
               <span className="font-medium text-sm text-emerald-600">{selectedCbnDetails.emptyLadenDate ? formatDate(selectedCbnDetails.emptyLadenDate) : '-'}</span>
             </div>
             <div><span className="block text-indigo-400 font-semibold uppercase mb-1 text-[10px] sm:text-xs">{formData.segment === 'POL' ? 'Laden Haulier Date' : 'Empty Return Date'}</span><span className="font-medium text-sm">{selectedCbnDetails.ladenHaulierDate ? formatDate(selectedCbnDetails.ladenHaulierDate) : '-'}</span></div>
             <div><span className="block text-indigo-400 font-semibold uppercase mb-1">Vessel / Voyage</span><span className="font-medium text-sm">{selectedCbnDetails.vessel || '-'} {selectedCbnDetails.voyage || ''}</span></div>
             <div><span className="block text-indigo-400 font-semibold uppercase mb-1">Sailing Date</span><span className="font-medium text-sm">{selectedCbnDetails.expectedSailingDate ? formatDate(selectedCbnDetails.expectedSailingDate) : '-'}</span></div>
             <div><span className="block text-indigo-400 font-semibold uppercase mb-1">Container Closing</span><span className="font-medium text-sm">{selectedCbnDetails.containerClosingDate ? formatDate(selectedCbnDetails.containerClosingDate) : '-'}</span></div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Leg 2: {formData.segment === 'POL' ? 'Laden Container (Warehouse to Port)' : 'Empty Container (Warehouse to Depot)'}</h3>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Location To</label><input type="text" value={formData.ladenLeg.location || ''} onChange={(e) => handleLegChange('ladenLeg', 'location', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" placeholder="e.g. Port Terminal" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Slot Date</label><input type="date" min={formData.emptyLeg.slotDate || undefined} value={formData.ladenLeg.slotDate} onChange={(e) => handleLegChange('ladenLeg', 'slotDate', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Slot Time</label><input type="time" value={formData.ladenLeg.slotTime} onChange={(e) => handleLegChange('ladenLeg', 'slotTime', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" /></div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={formData.ladenLeg.status} onChange={(e) => handleLegChange('ladenLeg', 'status', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                <option value="PENDING">Pending</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
         </div>
      </div>
      {editHaulierBookingId && <ActivityHistory recordId={editHaulierBookingId} />}
      <div className="flex justify-end space-x-3 pt-4">
        <button onClick={() => { setEditHaulierBookingId(null); setActiveTab('haulier-booking-list'); }} className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition">Cancel</button>
        <button onClick={save} className="px-8 py-2 bg-indigo-600 text-white rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition shadow-sm font-medium"><Save className="w-5 h-5 mr-1" /> Save Booking</button>
      </div>

    </div>
  );
};

const HaulierBookingList = () => {
  const { 
    haulierBookings, setEditHaulierBookingId, setActiveTab, companies
  } = React.useContext(AppContext);

  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const filteredList = (haulierBookings || []).filter(h => 
    showActiveOnly ? (h.emptyLeg.status !== 'COMPLETED' || h.ladenLeg.status !== 'COMPLETED') && (h.emptyLeg.status !== 'CANCELLED' || h.ladenLeg.status !== 'CANCELLED') : true
  );

  const polList = filteredList.filter(h => h.segment === 'POL');
  const podList = filteredList.filter(h => h.segment === 'POD');

  const renderStatus = (status) => {
    const color = status === 'COMPLETED' ? 'text-emerald-600 bg-emerald-50' : status === 'IN_TRANSIT' ? 'text-amber-600 bg-amber-50' : status === 'CANCELLED' ? 'text-rose-600 bg-rose-50' : 'text-slate-600 bg-slate-100';
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{status || 'PENDING'}</span>;
  };

  const renderTable = (list, title) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 overflow-y-auto mb-6 h-[450px]">
      <h3 className="bg-slate-100 p-3 font-semibold text-slate-700 border-b border-slate-200">{title}</h3>
      <table className="w-full text-left">
        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10 shadow-sm text-xs">
          <tr>
            <th className="p-3 font-semibold text-slate-500 uppercase">HSB / Haulier</th>
            <th className="p-3 font-semibold text-slate-500 uppercase">References</th>
            <th className="p-3 font-semibold text-slate-500 uppercase">Leg 1</th>
            <th className="p-3 font-semibold text-slate-500 uppercase">Leg 2</th>
            <th className="p-3 font-semibold text-slate-500 uppercase text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {list.map(h => {
             const hName = companies.find(c => c.id === h.haulierId)?.name || h.haulierId;
             return (
              <tr key={h.id} className="hover:bg-slate-50">
                <td className="p-3">
                  <p className="font-semibold text-indigo-700">{h.id}</p>
                  <p className="font-medium text-slate-700 text-xs mt-1">{hName}</p>
                </td>
                <td className="p-3">
                  {h.cbn && <p className="text-xs text-slate-700 font-semibold mb-1">{h.cbn}</p>}
                  {h.containerNo && <p className="text-xs text-slate-500">Cont: <span className="font-mono">{h.containerNo}</span></p>}
                  {(h.blNo || h.bookingNo) && <p className="text-xs text-slate-500">Liner: {h.bookingNo} / {h.blNo}</p>}
                </td>
                <td className="p-3">
                   <p className="font-medium text-slate-800">{h.emptyLeg.slotDate || 'TBD'}</p>
                   <p className="text-xs text-slate-500 mb-1">{h.emptyLeg.slotTime || '-'}</p>
                   {renderStatus(h.emptyLeg.status)}
                </td>
                <td className="p-3">
                   <p className="font-medium text-slate-800">{h.ladenLeg.slotDate || 'TBD'}</p>
                   <p className="text-xs text-slate-500 mb-1">{h.ladenLeg.slotTime || '-'}</p>
                   {renderStatus(h.ladenLeg.status)}
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => { setEditHaulierBookingId(h.id); setActiveTab('new-haulier-booking'); }} className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-medium text-xs">Edit</button>
                </td>
              </tr>
             );
          })}
          {list.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-slate-500">No records found.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Truck className="w-6 h-6 text-indigo-600"/> Haulier Slot Bookings</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showActiveOnly} onChange={(e) => setShowActiveOnly(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
            <span>Show Active Only</span>
          </label>
          <button onClick={() => { setEditHaulierBookingId(null); setActiveTab('new-haulier-booking'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">New Haulier Booking</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
         {renderTable(polList, "POL (Export) Movements")}
         {renderTable(podList, "POD (Import) Movements")}
      </div>
    </div>
  );
};

const ContainerBookingForm = () => {
  const { 
    checkAccess, editBookingId, containerBookings, setContainerBookings, setEditBookingId, 
    setActiveTab, ports, showMessage, containerTypes, generateBookingNo, setBookingCounter, bookingCounter, companies, logActivity
  } = React.useContext(AppContext);

  const [formData, setFormData] = useState({
    bookingNo: '', blNo: '', pol: '', pod: '', vessel: '', voyage: '',
    expectedSailingDate: '', eta: '', containerClosingDate: '', ladenHaulierDate: '', emptyLadenDate: '', lastStuffingDate: '', linerBrokerId: '',
    containers: [{ id: Date.now().toString(), containerNo: '', containerTypeId: '', jobNo: '', usageType: 'LCL' }]
  });

  const prevLadenRef = React.useRef(formData.ladenHaulierDate);
  useEffect(() => {
    if (formData.ladenHaulierDate && formData.ladenHaulierDate !== prevLadenRef.current) {
      prevLadenRef.current = formData.ladenHaulierDate;
      const ladenDate = new Date(formData.ladenHaulierDate);
      if (!isNaN(ladenDate.getTime())) {
        const stuffingDate = new Date(ladenDate);
        stuffingDate.setDate(ladenDate.getDate() - 1);
        const yyyy = stuffingDate.getFullYear();
        const mm = String(stuffingDate.getMonth() + 1).padStart(2, '0');
        const dd = String(stuffingDate.getDate()).padStart(2, '0');
        const formatted = `${yyyy}-${mm}-${dd}`;
        setFormData(prev => ({ ...prev, lastStuffingDate: formatted }));
      }
    }
  }, [formData.ladenHaulierDate]);

  useEffect(() => {
    if (editBookingId) {
      const b = (containerBookings || []).find(x => x.id === editBookingId);
      if (b) {
         setFormData({
           ...b,
           containers: b.containers && b.containers.length ? b.containers.map(c => ({...c, usageType: c.usageType || 'LCL'})) : [{ id: Date.now().toString(), containerNo: '', containerTypeId: b.containerTypeId || '', jobNo: b.jobNo || '', usageType: 'LCL' }]
         });
      }
    } else {
      setFormData({
        bookingNo: '', blNo: '', pol: '', pod: '', vessel: '', voyage: '',
        expectedSailingDate: '', eta: '', containerClosingDate: '', ladenHaulierDate: '', emptyLadenDate: '', lastStuffingDate: '', linerBrokerId: '',
        containers: [{ id: Date.now().toString(), containerNo: '', containerTypeId: '', jobNo: '', usageType: 'LCL' }]
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBookingId]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value.toUpperCase() });
  const handleDateChange = (e) => {
    const val = e.target.value;
    const updates: any = { [e.target.name]: val };
    
    if (e.target.name === 'expectedSailingDate' && val) {
      updates['eta'] = val; // default ETA same as ETD initially
      const esDate = new Date(val);
      if (!isNaN(esDate.getTime())) {
         const ccDate = new Date(esDate.getTime() - 1 * 24 * 60 * 60 * 1000);
         updates['containerClosingDate'] = ccDate.toISOString().split('T')[0];
         
         const llDate = new Date(ccDate.getTime() - 1 * 24 * 60 * 60 * 1000);
         updates['ladenHaulierDate'] = llDate.toISOString().split('T')[0];
         
         const elDate = new Date(llDate.getTime() - 3 * 24 * 60 * 60 * 1000);
         updates['emptyLadenDate'] = elDate.toISOString().split('T')[0];

         const lsDate = new Date(llDate.getTime() - 1 * 24 * 60 * 60 * 1000);
         updates['lastStuffingDate'] = lsDate.toISOString().split('T')[0];
      }
    } else if (e.target.name === 'ladenHaulierDate' && val) {
      const llDate = new Date(val);
      if (!isNaN(llDate.getTime())) {
         const lsDate = new Date(llDate.getTime() - 1 * 24 * 60 * 60 * 1000);
         updates['lastStuffingDate'] = lsDate.toISOString().split('T')[0];
      }
    }
    
    setFormData({ ...formData, ...updates });
  };


  const handleContainerChange = (idx, field, value) => {
    const newContainers: any = [...formData.containers];
    newContainers[idx][field] = value.toUpperCase();
    setFormData({ ...formData, containers: newContainers });
  };
  
  const addContainer = () => setFormData({ ...formData, containers: [...formData.containers, { id: Date.now().toString() + Math.random(), containerNo: '', containerTypeId: '', usageType: 'LCL' }]});
  const removeContainer = (idx) => setFormData({ ...formData, containers: formData.containers.filter((_, i) => i !== idx) });

  const save = () => {
    if (!formData.pol || !formData.pod || !formData.linerBrokerId) return showMessage("Liner/Broker, POL, POD are required.");
    if (formData.containers.some(c => !c.containerTypeId)) return showMessage("All containers must have a Type selected.");
    
    // validate closing date 
    if (formData.containerClosingDate) {
      const closeDate = new Date(formData.containerClosingDate).getTime();
      if (formData.ladenHaulierDate) {
        const ladenDate = new Date(formData.ladenHaulierDate).getTime();
        if (closeDate < ladenDate) return showMessage("Container closing date cannot be earlier than container laden haulier date.");
      }
      if (formData.emptyLadenDate) {
        const emptyDate = new Date(formData.emptyLadenDate).getTime();
        // Normally empty laden date is before laden haulier date. So close date > empty date is expected. 
        if (closeDate < emptyDate) return showMessage("Container closing date cannot be earlier than empty laden date.");
      }
    }

    let id = editBookingId;
    if (!editBookingId) {
      id = generateBookingNo(formData.pol, formData.pod, formData.expectedSailingDate);
      setDoc(doc(db, 'system', 'counters'), { bookingCounter: bookingCounter + 1 }, { merge: true });
    }
    
    const totalContainers = formData.containers.length;
    const containersWithCbn = formData.containers.map((c, i) => ({
        ...c,
        containerCbn: c.containerCbn && editBookingId ? c.containerCbn : `${id}-${String(i+1).padStart(2, '0')}/${String(totalContainers).padStart(2, '0')}`
    }));

    const payload = { ...formData, id, containers: containersWithCbn };
    
    setDoc(doc(db, 'containerBookings', id), payload)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `containerBookings/${id}`));

    if (editBookingId) {
      const oldB = containerBookings.find(b => b.id === id);
      logActivity('UPDATE', 'Container Bookings', id, 'Updated container booking', oldB, payload);
    } else {
      logActivity('CREATE', 'Container Bookings', id, 'Created new container booking');
    }
    showMessage("Booking saved.", "success");
    setActiveTab('booking-list');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Ship className="w-6 h-6 text-sky-600"/> {editBookingId ? 'Edit Booking' : 'New Container Booking'}</h2>
        <button onClick={() => { setEditBookingId(null); setActiveTab('booking-list'); }} className="text-slate-500 hover:text-slate-700 transition"><X className="w-6 h-6" /></button>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Liner / Broker <span className="text-red-500">*</span></label>
          <select name="linerBrokerId" value={formData.linerBrokerId} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-md">
            <option value="">-- Select Liner / Broker --</option>
            {companies.filter(c => c.isLinerBroker).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Container Booking No (CBN)</label>
          <input type="text" value={editBookingId || 'Will be generated on save'} disabled className="w-full p-2 border border-slate-200 bg-slate-100/50 text-slate-500 rounded-md font-mono" />
        </div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Liner Booking No.</label><input type="text" name="bookingNo" value={formData.bookingNo} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Master BL No.</label><input type="text" name="blNo" value={formData.blNo} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md font-mono" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">POL (Origin)</label><input list="portListBooking" name="pol" value={formData.pol} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">POD (Destination)</label><input list="portListBooking" name="pod" value={formData.pod} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md" /></div>
        
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Vessel</label><input type="text" name="vessel" value={formData.vessel || ''} onChange={handleChange} placeholder="e.g. EVER GIVEN" className="w-full p-2 border border-slate-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Voyage</label><input type="text" name="voyage" value={formData.voyage || ''} onChange={handleChange} placeholder="e.g. 0124A" className="w-full p-2 border border-slate-300 rounded-md" /></div>

        <div><label className="block text-sm font-medium text-slate-700 mb-1">Expected Sailing Date / ETD</label><input type="date" name="expectedSailingDate" value={formData.expectedSailingDate} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">ETA</label><input type="date" name="eta" value={formData.eta || ''} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Container Closing Date</label><input type="date" name="containerClosingDate" value={formData.containerClosingDate} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Laden Leg Date (Export to Port / Import to WH)</label><input type="date" name="ladenHaulierDate" value={formData.ladenHaulierDate} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Empty Leg Date (Export from Depot / Import to Depot)</label><input type="date" name="emptyLadenDate" value={formData.emptyLadenDate} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-md" /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">Last Stuffing Date</label><input type="date" name="lastStuffingDate" value={formData.lastStuffingDate || ''} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-md" /></div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Containers</h3>
          <button onClick={addContainer} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 flex items-center">
            <Plus className="w-4 h-4 mr-1" /> Add Container
          </button>
        </div>
        <div className="space-y-3">
          {formData.containers.map((c, i) => (
            <div key={c.id} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Container Number</label>
                <input type="text" value={c.containerNo} onChange={(e) => handleContainerChange(i, 'containerNo', e.target.value)} placeholder="e.g. HLBU1234567" className="w-full p-2 border border-slate-300 rounded-md" />
              </div>
              <div className="w-1/4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Usage Type <span className="text-red-500">*</span></label>
                <select value={c.usageType || 'LCL'} onChange={(e) => handleContainerChange(i, 'usageType', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md bg-teal-50">
                  <option value="LCL">LCL</option>
                  <option value="FCL">FCL</option>
                </select>
              </div>
              <div className="w-1/4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Type <span className="text-red-500">*</span></label>
                <select value={c.containerTypeId} onChange={(e) => handleContainerChange(i, 'containerTypeId', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                  <option value="">-- Select Type --</option>
                  {[...containerTypes].sort((a,b) => a.type === '40GP' ? -1 : b.type === '40GP' ? 1 : a.type.localeCompare(b.type)).map(t => <option key={t.id || t.type} value={t.type}>{t.type}</option>)}
                </select>
              </div>
              <div className="w-1/4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Job No</label>
                <input type="text" value={c.jobNo || ''} onChange={(e) => handleContainerChange(i, 'jobNo', e.target.value)} placeholder="e.g. JB-12345" className="w-full p-2 border border-slate-300 rounded-md" />
               </div>
              {formData.containers.length > 1 && (
                <button onClick={() => removeContainer(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md mb-1"><Trash2 className="w-5 h-5"/></button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <datalist id="portListBooking">{ports.map(p => <option key={p.id} value={p.name}>{p.name} ({p.country})</option>)}</datalist>
      {editBookingId && <ActivityHistory recordId={editBookingId} />}
      <div className="flex justify-end space-x-3 pt-4">
        <button onClick={() => { setEditBookingId(null); setActiveTab('booking-list'); }} className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition">Cancel</button>
        <button onClick={save} className="px-8 py-2 bg-sky-600 text-white rounded-lg flex items-center space-x-2 hover:bg-sky-700 transition shadow-sm font-medium"><Save className="w-5 h-5 mr-1" /> Save Booking</button>
      </div>
    </div>
  );
};

const ContainerBookingList = () => {
  const { 
    containerBookings, containerTypes, setEditBookingId, setActiveTab, manifests, companies, setPrintingBookingForm
  } = React.useContext(AppContext);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Ship className="w-6 h-6 text-sky-600"/> Container Bookings</h2>
        <button onClick={() => { setEditBookingId(null); setActiveTab('new-booking'); }} className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition">New Booking</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10 shadow-sm">
            <tr>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">CBN / Job No</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Liner/Broker</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Liner Booking / MBL No</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Route / Dates</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Space (CBM)</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Weight (KG)</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(containerBookings || []).map(b => {
              const mList = (manifests || []).filter(m => m.bookingId && m.bookingId.startsWith(b.id + '::'));
              const totalManifestCbm = mList.reduce((acc, m) => acc + (m.lines || []).reduce((sum, l) => sum + ((parseFloat(l.loadQty) || 0) * (parseFloat(l.unitCbm) || 0)), 0), 0);
              const totalManifestWgt = mList.reduce((acc, m) => acc + (m.lines || []).reduce((sum, l) => sum + ((parseFloat(l.loadQty) || 0) * (parseFloat(l.unitWeight) || 0)), 0), 0);
              
              let maxCbm = 0;
              let maxWgt = 0;
              const typeCounts: Record<string, number> = {};
              (b.containers || []).forEach(c => {
                  const uType = c.usageType || 'LCL';
                  const key = `${c.containerTypeId} (${uType})`;
                  if (c.containerTypeId) {
                      typeCounts[key] = (typeCounts[key] || 0) + 1;
                  }
                  
                  // FCL containers are excluded from LCL capacity utilization
                  if (uType !== 'FCL') {
                      const t = containerTypes.find(ct => ct.type === c.containerTypeId);
                      if (t) {
                          maxCbm += parseFloat(t.maxCbm) || 0;
                          maxWgt += parseFloat(t.maxWeight) || 0;
                      }
                  }
              });
              
              if (maxCbm === 0) maxCbm = 1; // Prevent div by 0 if FCL only
              if (maxWgt === 0) maxWgt = 1;
              
              const typesSummary = Object.entries(typeCounts).map(([type, count]) => `${count}x ${type}`).join('\n') || '-';

              const cbmPct = ((totalManifestCbm / maxCbm) * 100).toFixed(1);
              const wgtPct = ((totalManifestWgt / maxWgt) * 100).toFixed(1);
              
              const balCbm = maxCbm - totalManifestCbm;
              const balWgt = maxWgt - totalManifestWgt;
              const balCbmPct = Math.max(((balCbm / maxCbm) * 100), 0).toFixed(1);
              const balWgtPct = Math.max(((balWgt / maxWgt) * 100), 0).toFixed(1);

  const getNumberValue = (v: any) => {
     if (typeof v === 'number') return v;
     const parsed = parseFloat(v);
     return isNaN(parsed) ? 0 : parsed;
  };
  const parsedCbm = getNumberValue(cbmPct);
  const parsedWgt = getNumberValue(wgtPct);

  const linerName = (companies || []).find(c => c.id === b.linerBrokerId)?.name || b.linerBrokerId || '-';

              return (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-semibold text-sky-700">{b.id}</p>
                    <p className="text-xs text-slate-500 mt-1">Jobs: <span className="font-medium text-slate-700">{b.containers && b.containers.length > 0 ? Array.from(new Set(b.containers.filter(c => c.jobNo).map(c => c.jobNo))).join(', ') || '-' : '-'}</span></p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-semibold text-slate-800">{linerName}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-slate-700">Booking: {b.bookingNo || '-'}</p>
                    <p className="font-mono text-xs text-slate-500 mt-1">MBL: {b.blNo || '-'}</p>
                  </td>
                  <td className="p-4 text-xs text-slate-600 space-y-1">
                    <p className="font-medium text-slate-700 mb-1">{b.pol || '-'} → {b.pod || '-'}</p>
                    <p>Vessel: <span className="font-medium text-slate-800">{b.vessel || '-'}</span></p>
                    <p>Voyage: <span className="font-medium text-slate-800">{b.voyage || '-'}</span></p>
                    <p>Sail: <span className="font-medium text-slate-800">{b.expectedSailingDate ? formatDate(b.expectedSailingDate) : '-'}</span></p>
                    <p>Close: <span className="font-medium text-slate-800">{b.containerClosingDate ? formatDate(b.containerClosingDate) : '-'}</span></p>
                  </td>
                  <td className="p-4 font-semibold text-slate-800">{typesSummary}</td>
                  <td className="p-4 text-right">
                    <p className="text-sm font-bold text-slate-800" title="Occupied / Max">{totalManifestCbm.toFixed(2)} / {maxCbm}</p>
                    <p className={`text-xs mt-1 font-bold ${parsedCbm >= 90 ? 'text-red-500' : 'text-blue-600'}`}>{cbmPct}% Occ.</p>
                    <p className="text-xs text-emerald-600 font-semibold mt-1" title="Available Space">{balCbm.toFixed(2)} Left ({balCbmPct}%)</p>
                  </td>
                  <td className="p-4 text-right">
                    <p className="text-sm font-bold text-slate-800" title="Occupied / Max">{totalManifestWgt.toFixed(0)} / {maxWgt}</p>
                    <p className={`text-xs mt-1 font-bold ${parsedWgt >= 90 ? 'text-red-500' : 'text-blue-600'}`}>{wgtPct}% Occ.</p>
                    <p className="text-xs text-emerald-600 font-semibold mt-1" title="Available Weight">{balWgt.toFixed(0)} Left ({balWgtPct}%)</p>
                  </td>
                  <td className="p-4 text-center space-y-2">
                    <button onClick={() => { setEditBookingId(b.id); setActiveTab('new-booking'); }} className="px-3 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded font-medium text-xs w-full block">Edit</button>
                    <button onClick={() => { setPrintingBookingForm(b); }} className="px-3 py-1 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-300 rounded font-medium text-xs w-full block">Print Form</button>
                  </td>
                </tr>
              );
            })}
            {!(containerBookings?.length) && <tr><td colSpan="8" className="p-8 text-center text-slate-500">No container bookings found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ReturnNoteForm = () => {
  const { 
    checkAccess, editReturnId, returns, setReturns, setEditReturnId, setActiveTab, 
    receipts, manifests, showMessage, generateReturnNo, setReturnCounter, returnCounter, logActivity
  } = React.useContext(AppContext);

  if (!checkAccess('returns', 'create') && !editReturnId) return <div className="p-8 text-center text-slate-500">You do not have permission to create returns.</div>;
  if (!checkAccess('returns', 'edit') && editReturnId) return <div className="p-8 text-center text-slate-500">You do not have permission to edit returns.</div>;

  const [receiptSearch, setReceiptSearch] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnLines, setReturnLines] = useState([]);

  // When editing an existing return note, set up the data
  useEffect(() => {
    if (editReturnId) {
      const ret = (returns || []).find(r => r.id === editReturnId);
      if (ret) {
        setSelectedReceiptId(ret.receiptId);
        setReturnReason(ret.reason || '');
        setReceiptSearch('');
        
        const receipt = (receipts || []).find(r => r.id === ret.receiptId);
        if (receipt) {
          // Recalculate max returnable, EXCLUDING the current return note being edited
          const previousReturns = (returns || []).filter(x => x.receiptId === receipt.id && x.id !== editReturnId);
          const manifestsForReceipt = (manifests || []).flatMap(m => (m.lines || []).filter(l => l.receiptId === receipt.id));
          
          const linesToReturn = (receipt.lines || []).map(line => {
            const previouslyReturnedQty = previousReturns.reduce((sum, pr) => {
              const prLine = (pr.lines || []).find(rl => rl.originalLineId === line.id);
              return sum + (prLine ? prLine.returnQty : 0);
            }, 0);
            const manifestedQty = manifestsForReceipt.reduce((sum, mLine) => {
               return sum + (mLine.originalLineId === line.id ? mLine.loadQty : 0);
            }, 0);

            const maxAvailable = Math.max(0, line.qty - previouslyReturnedQty - manifestedQty);
            
            const currentRetLine = (ret.lines || []).find(rl => rl.originalLineId === line.id);
            const currentRetQty = currentRetLine ? currentRetLine.returnQty : 0;

            return {
              originalLineId: line.id,
              product: line.product,
              uom: line.uom,
              originalQty: line.qty,
              maxReturnable: maxAvailable, 
              returnQty: currentRetQty,
              unitCbm: line.qty > 0 ? (line.cbm / line.qty) : 0,
              unitWeight: parseFloat(line.weight) || 0,
            };
          });
          setReturnLines(linesToReturn);
        }
      }
    } else {
      setSelectedReceiptId('');
      setReturnReason('');
      setReturnLines([]);
      setReceiptSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editReturnId]);

  const filteredReceipts = useMemo(() => {
    if (editReturnId) return []; // Hide search while editing

    const term = receiptSearch.toLowerCase();
    return (receipts || []).filter(r => {
      const matchesSearch = !term || (
        (r.customer && r.customer.toLowerCase().includes(term)) ||
        (r.consignee && r.consignee.toLowerCase().includes(term)) ||
        (r.consignor && r.consignor.toLowerCase().includes(term)) ||
        r.id.toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;

      const previousReturns = (returns || []).filter(ret => ret.receiptId === r.id);
      const manifestsForReceipt = (manifests || []).flatMap(m => (m.lines || []).filter(l => l.receiptId === r.id));
      
      const totalAvailable = (r.lines || []).reduce((sum, line) => {
        const previouslyReturnedQty = previousReturns.reduce((retSum, ret) => {
          const retLine = (ret.lines || []).find(rl => rl.originalLineId === line.id);
          return retSum + (retLine ? retLine.returnQty : 0);
        }, 0);
        const manifestedQty = manifestsForReceipt.reduce((mSum, mLine) => {
          return mSum + (mLine.originalLineId === line.id ? mLine.loadQty : 0);
        }, 0);
        return sum + Math.max(0, line.qty - previouslyReturnedQty - manifestedQty);
      }, 0);

      return totalAvailable > 0;
    });
  }, [receipts, receiptSearch, returns, manifests, editReturnId]);

  const handleReceiptSelect = (rid) => {
    setSelectedReceiptId(rid);
    const receipt = (receipts || []).find(r => r.id === rid);
    if (receipt) {
      const previousReturns = (returns || []).filter(ret => ret.receiptId === rid);
      const manifestsForReceipt = (manifests || []).flatMap(m => (m.lines || []).filter(l => l.receiptId === rid));
      
      const linesToReturn = (receipt.lines || []).map(line => {
        const previouslyReturnedQty = previousReturns.reduce((sum, ret) => {
          const retLine = (ret.lines || []).find(rl => rl.originalLineId === line.id);
          return sum + (retLine ? retLine.returnQty : 0);
        }, 0);
        const manifestedQty = manifestsForReceipt.reduce((sum, mLine) => {
          return sum + (mLine.originalLineId === line.id ? mLine.loadQty : 0);
        }, 0);

        const maxAvailable = Math.max(0, line.qty - previouslyReturnedQty - manifestedQty);

        return {
          originalLineId: line.id,
          product: line.product,
          uom: line.uom,
          originalQty: line.qty,
          maxReturnable: maxAvailable,
          returnQty: 0,
          unitCbm: line.qty > 0 ? (line.cbm / line.qty) : 0,
          unitWeight: parseFloat(line.weight) || 0,
        };
      });
      setReturnLines(linesToReturn);
    } else {
      setReturnLines([]);
    }
  };

  const updateReturnQty = (lineId, qty) => {
    setReturnLines(lines => lines.map(l => {
      if (l.originalLineId === lineId) {
        const validQty = Math.min(Math.max(0, parseInt(qty) || 0), l.maxReturnable);
        return { ...l, returnQty: validQty };
      }
      return l;
    }));
  };

  const saveReturn = () => {
    const totalReturnQty = returnLines.reduce((sum, l) => sum + l.returnQty, 0);
    if (totalReturnQty === 0) return showMessage("Please specify at least one item quantity to return.");

    const activeLines = returnLines.filter(l => l.returnQty > 0);
    const totalReturnCBM = activeLines.reduce((sum, l) => sum + (l.returnQty * l.unitCbm), 0);
    const totalReturnWeight = activeLines.reduce((sum, l) => sum + (l.returnQty * l.unitWeight), 0);

    const newReturn = {
      id: editReturnId || generateReturnNo(),
      receiptId: selectedReceiptId,
      date: editReturnId ? (returns || []).find(r => r.id === editReturnId).date : new Date().toISOString(),
      reason: returnReason,
      lines: activeLines,
      totalReturnQty,
      totalReturnCBM,
      totalReturnWeight
    };

    setDoc(doc(db, 'returns', newReturn.id), newReturn)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `returns/${newReturn.id}`));

    if (editReturnId) {
      logActivity('UPDATE', 'Return Note', newReturn.id, 'Updated return note');
      showMessage("Return note updated successfully.", "success");
    } else {
      setDoc(doc(db, 'system', 'counters'), { returnCounter: returnCounter + 1 }, { merge: true });
      logActivity('CREATE', 'Return Note', newReturn.id, 'Created new return note');
      showMessage("Return note issued successfully.", "success");
    }
    setActiveTab('return-list');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-slate-800">{editReturnId ? 'Edit Return Note' : 'Issue Return Note'}</h2>
          {editReturnId && <button onClick={() => {setEditReturnId(null); setActiveTab('return-list');}} className="text-sm text-slate-500 border border-slate-300 px-3 py-1 rounded bg-white">Cancel Edit</button>}
        </div>
        <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg font-mono font-medium border border-orange-200">
          {editReturnId || generateReturnNo()}
        </span>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-3">
            {editReturnId ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Editing Return For Shipment</label>
                <div className="p-2 border border-slate-300 bg-slate-100 rounded-md text-slate-700 font-medium">
                  {selectedReceiptId}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Search Shipment to Return From</label>
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" value={receiptSearch} onChange={(e) => setReceiptSearch(e.target.value.toUpperCase())} 
                      placeholder="Search Customer, Consignee, Consignor or ID..." 
                      className="w-full pl-10 p-2 border border-slate-300 rounded-md focus:ring-orange-500 focus:border-orange-500" 
                    />
                  </div>
                </div>
                <div className="border border-slate-200 rounded-md max-h-48 overflow-y-auto bg-slate-50 shadow-inner">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-200 sticky top-0 text-slate-700 shadow-sm">
                      <tr><th className="p-2 font-semibold">Shipment ID</th><th className="p-2 font-semibold">Customer</th><th className="p-2 font-semibold">Consignee</th><th className="p-2 font-semibold text-center">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredReceipts.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-slate-500">No matching active shipments found.</td></tr>
                      ) : (
                        filteredReceipts.map(r => (
                          <tr key={r.id} className={`transition-colors ${selectedReceiptId === r.id ? 'bg-orange-100' : 'bg-white hover:bg-orange-50'}`}>
                            <td className="p-2 font-medium text-blue-600">{r.id}</td>
                            <td className="p-2 truncate max-w-[120px]" title={r.customer}>{r.customer}</td>
                            <td className="p-2 truncate max-w-[120px]" title={r.consignee}>{r.consignee || '-'}</td>
                            <td className="p-2 text-center">
                              <button onClick={() => handleReceiptSelect(r.id)} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedReceiptId === r.id ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                                {selectedReceiptId === r.id ? 'Selected' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Return Reason</label>
            <input type="text" value={returnReason} onChange={(e) => setReturnReason(e.target.value.toUpperCase())} placeholder="e.g. DAMAGED, CANCELLED, WRONG ITEM..." className="w-full p-2 border border-slate-300 rounded-md focus:ring-orange-500 focus:border-orange-500" />
          </div>
        </div>

        {selectedReceiptId && returnLines.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Items Available for Return</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                    <th className="p-3 font-medium">Product</th>
                    <th className="p-3 font-medium text-center">Orig Qty</th>
                    <th className="p-3 font-medium text-center">Max Returnable</th>
                    <th className="p-3 font-medium w-32 text-center">Return Qty</th>
                    <th className="p-3 font-medium text-right">Est. CBM Deduct</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnLines.map(line => (
                    <tr key={line.originalLineId} className={line.maxReturnable === 0 ? "bg-slate-50 opacity-60" : ""}>
                      <td className="p-3 text-sm">{line.product || 'Unnamed Item'} ({line.uom})</td>
                      <td className="p-3 text-sm text-center">{line.originalQty}</td>
                      <td className="p-3 text-sm text-center font-medium text-blue-600">{line.maxReturnable}</td>
                      <td className="p-3">
                        <input 
                          type="number" min="0" max={line.maxReturnable} value={line.returnQty} 
                          onChange={(e) => updateReturnQty(line.originalLineId, e.target.value)}
                          disabled={line.maxReturnable === 0}
                          className="w-full p-1.5 text-sm border border-slate-300 rounded text-center focus:ring-orange-500 focus:border-orange-500" 
                        />
                      </td>
                      <td className="p-3 text-sm text-right text-orange-600 font-mono">
                        {(line.returnQty * line.unitCbm).toFixed(3)} m³
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={saveReturn} className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-2.5 rounded-lg shadow-sm hover:bg-orange-600 font-medium transition-colors">
                <Undo2 className="w-5 h-5" /><span>{editReturnId ? 'Update Return Note' : 'Confirm Return Note'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
      {editReturnId && <ActivityHistory recordId={editReturnId} />}
    </div>
  );
};

const ReturnList = () => {
  const { 
    checkAccess, returns, setPrintingReturnNote, setEditReturnId, setActiveTab, 
    setReturns, showMessage 
  } = React.useContext(AppContext);

  if (!checkAccess('returns', 'view')) return <div className="p-8 text-center text-slate-500">You do not have permission to view returns.</div>;

  const [returnToDelete, setReturnToDelete] = useState(null);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Return Note History</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-700">Return Note No.</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Date</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Shipment Ref</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Reason</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-right">Returned Qty</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-right">Deducted CBM</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(returns || []).length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-500">No return notes have been issued yet.</td></tr>
            ) : (
              (returns || []).map(ret => (
                <tr key={ret.id} className="hover:bg-slate-50">
                  <td className="p-4 text-sm font-medium text-orange-600">{ret.id}</td>
                  <td className="p-4 text-sm text-slate-600">{formatDate(ret.date)}</td>
                  <td className="p-4 text-sm font-medium text-slate-800">{ret.receiptId}</td>
                  <td className="p-4 text-sm text-slate-600">{ret.reason || '-'}</td>
                  <td className="p-4 text-sm font-bold text-slate-700 text-right">{ret.totalReturnQty}</td>
                  <td className="p-4 text-sm text-slate-600 text-right font-mono">{ret.totalReturnCBM.toFixed(3)}</td>
                  <td className="p-4 text-sm text-center">
                    <div className="flex justify-center space-x-2 mb-2">
                      {checkAccess('returns', 'print') && (
                        <button 
                          onClick={() => setPrintingReturnNote(ret)} 
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-orange-100 hover:text-orange-700 text-xs font-medium inline-flex items-center transition-colors" 
                          title="Print Return Note"
                        >
                          <Printer className="w-3 h-3 mr-1"/> Print
                        </button>
                      )}
                    </div>
                    <div className="flex justify-center space-x-2">
                      {checkAccess('returns', 'edit') && (
                        <button 
                          onClick={() => { setEditReturnId(ret.id); setActiveTab('new-return'); }} 
                          className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs font-medium inline-flex items-center transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {checkAccess('returns', 'cancel') && (
                        <button 
                          onClick={() => setReturnToDelete(ret.id)}
                          className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-medium inline-flex items-center transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Return Confirmation Modal */}
      {returnToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Cancel Return Note</h3>
            <p className="text-slate-600 text-sm mb-6">Are you sure you want to cancel <span className="font-bold">{returnToDelete}</span>? The cargo will be restored to your active inventory.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setReturnToDelete(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium text-sm">Close</button>
              <button 
                onClick={() => {
                  deleteDoc(doc(db, 'returns', returnToDelete))
                    .catch(err => handleFirestoreError(err, OperationType.DELETE, `returns/${returnToDelete}`));
                  setReturnToDelete(null);
                  showMessage("Return note cancelled. Cargo restored to inventory.", "success");
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm shadow-sm"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BreakbulkForm = ({ item, onSave, onCancel }) => {
  const { generateBreakbulkNo, calculateCBM, showMessage } = React.useContext(AppContext);

  const [breakQty, setBreakQty] = useState(1);
  const [lines, setLines] = useState([{
    id: Date.now().toString(), product: item.product, uom: 'Loose', qty: 1, l: '', w: '', h: '', weight: '', cbm: 0
  }]);

  const updateLine = (id, field, value) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        let val = value;
        if (field === 'product' && typeof val === 'string') val = val.toUpperCase();
        const updatedLine = { ...line, [field]: val };
        if (['l', 'w', 'h', 'qty'].includes(field)) {
          updatedLine.cbm = calculateCBM(field === 'l' ? val : updatedLine.l, field === 'w' ? val : updatedLine.w, field === 'h' ? val : updatedLine.h, field === 'qty' ? val : updatedLine.qty);
        }
        return updatedLine;
      }
      return line;
    }));
  };

  const handleSave = () => {
    if (breakQty <= 0 || breakQty > item.currentQty) return showMessage(`Quantity to split must be between 1 and ${item.currentQty}.`);
    if (lines.length === 0) return showMessage("Must define at least one new broken line.");
    
    const breakData = {
      id: generateBreakbulkNo(), date: new Date().toISOString(), receiptId: item.receiptId,
      originalLineId: item.originalLineId, breakQty: parseInt(breakQty), lines: lines
    };
    onSave(breakData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">Quantity to Remove from Source (<span className="text-blue-600 font-bold max-w-full">Max {item.currentQty}</span>)</label>
        <input type="number" min="1" max={item.currentQty} value={breakQty} onChange={(e) => setBreakQty(e.target.value)} className="w-48 p-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold text-slate-800">New Splitted Items</h4>
          <button onClick={() => setLines([...lines, { id: Date.now().toString(), product: item.product, uom: 'Loose', qty: 1, l:'', w:'', h:'', weight:'', cbm:0 }])} className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md flex items-center"><Plus className="w-4 h-4 mr-1"/> Add Part</button>
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr><th className="p-2 font-medium w-48">Product</th><th className="p-2 font-medium w-24">UOM</th><th className="p-2 font-medium w-20">Qty</th><th className="p-2 font-medium w-20">L</th><th className="p-2 font-medium w-20">W</th><th className="p-2 font-medium w-20">H</th><th className="p-2 font-medium w-24 text-right">CBM</th><th className="p-2 font-medium w-24 text-right">Unit Wgt(kg)</th><th className="p-2 font-medium w-24 text-right">Total Wgt(kg)</th><th className="p-2 font-medium w-10 text-center">Act</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map(line => (
                <tr key={line.id}>
                  <td className="p-2"><input type="text" value={line.product} onChange={e => updateLine(line.id, 'product', e.target.value)} className="w-full p-1.5 border rounded" /></td>
                  <td className="p-2"><select value={line.uom} onChange={e => updateLine(line.id, 'uom', e.target.value)} className="w-full p-1.5 border rounded"><option>Bundle</option><option>Pallet</option><option>Carton</option><option>Box</option><option>Loose</option></select></td>
                  <td className="p-2"><input type="number" min="1" value={line.qty} onChange={e => updateLine(line.id, 'qty', e.target.value)} className="w-full p-1.5 border rounded" /></td>
                  <td className="p-2"><input type="number" value={line.l} onChange={e => updateLine(line.id, 'l', e.target.value)} className="w-full p-1.5 border rounded" /></td>
                  <td className="p-2"><input type="number" value={line.w} onChange={e => updateLine(line.id, 'w', e.target.value)} className="w-full p-1.5 border rounded" /></td>
                  <td className="p-2"><input type="number" value={line.h} onChange={e => updateLine(line.id, 'h', e.target.value)} className="w-full p-1.5 border rounded" /></td>
                  <td className="p-2 text-right font-mono bg-slate-50">{line.cbm.toFixed(4)}</td>
                  <td className="p-2"><input type="number" value={line.weight} onChange={e => updateLine(line.id, 'weight', e.target.value)} className="w-full p-1.5 border rounded text-right" /></td>
                  <td className="p-2 text-right font-mono bg-slate-50">{((parseFloat(line.weight) || 0) * (parseInt(line.qty) || 0)).toFixed(2)}</td>
                  <td className="p-2 text-center"><button onClick={() => lines.length > 1 && setLines(lines.filter(l => l.id !== line.id))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4 mx-auto"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
        <button onClick={onCancel} className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center"><Save className="w-4 h-4 mr-2"/> Confirm Split</button>
      </div>
    </div>
  );
};

const InventoryView = () => {
  const { checkAccess, getActiveInventory, breakbulks, setBreakbulks, setBreakbulkCounter, breakbulkCounter, showMessage, logActivity } = React.useContext(AppContext);

  if (!checkAccess('inventory', 'view')) return <div className="p-8 text-center text-slate-500">You do not have permission to view inventory.</div>;

  const inventory = getActiveInventory().filter(item => item.currentQty > 0);
  const [breakingItem, setBreakingItem] = useState(null);

  const handleSaveBreakbulk = (breakData) => {
    setDoc(doc(db, 'breakbulks', breakData.id), breakData)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `breakbulks/${breakData.id}`));
    setDoc(doc(db, 'system', 'counters'), { breakbulkCounter: breakbulkCounter + 1 }, { merge: true });
    logActivity('CREATE', 'Inventory (Breakbulk)', breakData.id, `Split cargo for receipt ${breakData.receiptId}`);
    setBreakingItem(null);
    showMessage("Cargo split successfully.", "success");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Active Cargo (Inventory)</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-700">Shipment Ref</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Type / Route</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Customer</th>
              <th className="p-4 text-sm font-semibold text-slate-700">Product</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-center">Active Qty</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-right">Active CBM</th>
              <th className="p-4 text-sm font-semibold text-slate-700 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inventory.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-500">Warehouse is currently empty.</td></tr>
            ) : (
              inventory.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-4 text-sm font-medium text-slate-700">{item.receiptId}</td>
                  <td className="p-4 text-sm text-slate-600">
                    {item.pol && item.pod 
                      ? <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{item.pol} → {item.pod}</span>
                      : <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">Cross Dock</span>
                    }
                  </td>
                  <td className="p-4 text-sm text-slate-600">{item.customer}</td>
                  <td className="p-4 text-sm text-slate-800">{item.product || '-'} <span className="text-xs text-slate-400">({item.uom})</span></td>
                  <td className="p-4 text-sm font-bold text-blue-600 text-center">{item.currentQty}</td>
                  <td className="p-4 text-sm text-slate-600 text-right">{(item.currentQty * item.unitCbm).toFixed(3)}</td>
                  <td className="p-4 text-sm text-center">
                    {checkAccess('inventory', 'split') && (
                      <button 
                        onClick={() => setBreakingItem(item)}
                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 flex items-center space-x-1 mx-auto transition-colors"
                        title="Breakbulk (Split items)"
                      >
                        <Split className="w-4 h-4" /> <span className="text-xs font-medium">Split</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {breakingItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Breakbulk / Split Cargo</h3>
                <p className="text-sm text-slate-500">Splitting {breakingItem.product} from {breakingItem.receiptId}</p>
              </div>
              <button onClick={() => setBreakingItem(null)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
            </div>
            <BreakbulkForm item={breakingItem} onSave={handleSaveBreakbulk} onCancel={() => setBreakingItem(null)} />
          </div>
        </div>
      )}
    </div>
  );
};

const PrintLabelsOverlay = () => {
  const { printingReceipt, setPrintingReceipt, handlePrintRequest, handleGeneratePDF } = React.useContext(AppContext);
  if (!printingReceipt) return null;
  const packagesToPrint = [];
  let currentPkgNum = 1;
  (printingReceipt.lines || []).forEach(line => {
    for (let i = 0; i < (parseInt(line.qty) || 0); i++) {
      packagesToPrint.push({ ...line, pkgNum: currentPkgNum, totalPkgs: printingReceipt.totalQty || 1 });
      currentPkgNum++;
    }
  });

  const formatLabelDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = months[d.getMonth()];
    const yyyy = d.getFullYear();
    const ddd = days[d.getDay()];
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd} ${mmm} ${yyyy} (${ddd}) ${hh}:${min}`;
  };

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex items-center justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print">
        <div><h3 className="font-bold text-lg text-slate-800">Print Thermal Labels (A6)</h3></div>
        <div className="flex space-x-3">
          <button onClick={() => setPrintingReceipt(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={() => handleGeneratePDF('print-area', `${printingReceipt.id}-Labels.pdf`)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Print</button>
        </div>
      </div>
      <div id="print-area" className="flex flex-col items-center space-y-8 w-full">
        {packagesToPrint.map((pkg, idx) => {
          const rText = printingReceipt.transactionType === 'LCL Consolidate' ? `${printingReceipt.pol}-${printingReceipt.pod}` : 'CROSS DOCK';
          return (
            <div className="a6-label bg-white border-2 border-slate-300 p-6 flex flex-col" style={{ width: '105mm', height: '148mm' }} key={idx}>
              <div className="flex justify-between border-b-2 border-black pb-3 mb-3"><div><span className="font-black text-2xl">{printingReceipt.company}</span></div><div><span className="text-sm font-bold bg-black text-white px-2 py-1 rounded">{rText}</span></div></div>
              
              <div className="flex justify-between items-center mb-2">
                <div><p className="text-xs uppercase mb-0.5">Shipment ID</p><p className="font-black text-xl font-mono leading-none">{printingReceipt.id}</p></div>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${printingReceipt.id}`} alt="QR" className="w-16 h-16"/>
              </div>
              
              <div className="mb-3 pb-3 border-b border-slate-200">
                <div className="flex flex-col"><span className="text-[10px] uppercase font-semibold text-slate-500">Consignor</span><span className="font-bold text-xs uppercase leading-tight truncate">{printingReceipt.consignor}</span></div>
              </div>

              <div className="flex-1 flex flex-col space-y-2">
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] uppercase font-bold text-blue-600 mb-0.5">Deliver To (Consignee)</span>
                  <span className="font-black text-xl uppercase leading-none mb-1">{printingReceipt.consignee}</span>
                  <span className="text-sm font-semibold text-slate-800 leading-snug max-h-16 overflow-hidden whitespace-pre-wrap">{printingReceipt.consigneeDeliveryAddress.replace(/\n/g, ', ')}</span>
                </div>
                <div className="flex flex-col pt-2 border-t border-dashed border-slate-300">
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Cargo Details</span>
                  <span className="font-bold text-sm uppercase truncate leading-tight">{pkg.product || 'UNNAMED'}</span>
                  <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-700">
                    <span>Dim: {pkg.l || 0}x{pkg.w || 0}x{pkg.h || 0} cm</span>
                    <span>Unit Wgt: {pkg.weight || 0} kg</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-3 border-t-4 border-black flex justify-between items-end">
                <span className="text-[10px] font-semibold">{formatLabelDate(printingReceipt.date)}</span>
                <div className="text-right flex flex-col items-end"><span className="text-[10px] font-bold uppercase mb-1">Package</span><span className="font-black text-3xl leading-none">{pkg.pkgNum} <span className="text-lg mx-1">OF</span> {pkg.totalPkgs}</span></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

const PrintA4Overlay = () => {
  const { printingA4Receipt, setPrintingA4Receipt, handlePrintRequest, handleGeneratePDF, currentUser } = React.useContext(AppContext);
  if (!printingA4Receipt) return null;
  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex items-center justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print">
        <div><h3 className="font-bold text-lg text-slate-800">Print Goods Received Note</h3></div>
        <div className="flex space-x-3">
           <button onClick={() => setPrintingA4Receipt(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
           <button onClick={() => handleGeneratePDF('a4-print-area', `${printingA4Receipt.id}-GRN.pdf`)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
           <button onClick={handlePrintRequest} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">Print</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
          <div className="border-b-2 border-slate-800 pb-6 mb-6 flex justify-between items-end">
            <div><h1 className="text-4xl font-black">{printingA4Receipt.company}</h1><p className="text-sm font-bold uppercase mt-1">Goods Received Note</p></div>
            <div className="text-right"><p className="text-sm uppercase font-semibold">GRN ID</p><p className="text-2xl font-bold font-mono">{printingA4Receipt.id}</p></div>
          </div>
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
            <div className="border border-slate-300 p-4 mb-8 text-center bg-slate-50 w-64 mx-auto rotate-1">
              <p className="text-red-600 font-bold uppercase border-2 border-red-600 p-2 transform rotate-1">Quantity Check without Content Inspection</p>
            </div>
            
            <p className="text-xs text-slate-500 text-center mb-16 italic">
              This is a computer-generated document, no signature is required. <br />
              Generated by {currentUser?.username || 'System'}
            </p>

            <div className="flex justify-between border-t border-slate-300 pt-8 mt-16 px-8">
               <div className="w-1/3">
                 <p className="font-bold underline mb-4">Acknowledgement</p>
                 <p className="mb-2">Name: ______________________</p>
                 <p className="mb-2">NRIC: ______________________</p>
                 <p className="mb-2">Date:   ______________________</p>
               </div>
               <div className="w-1/3 text-right">
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const PrintPackingListOverlay = () => {
  const { printingPackingList, setPrintingPackingList, handlePrintRequest, handleGeneratePDF, companies, pickups, receipts } = React.useContext(AppContext);
  if (!printingPackingList) return null;
  const m = printingPackingList;

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex items-center justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print">
        <div><h3 className="font-bold text-lg text-slate-800">Print Packing List</h3></div>
        <div className="flex space-x-3">
          <button onClick={() => setPrintingPackingList(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', `${m.id}-PL.pdf`)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Print</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
          <h1 className="text-3xl font-black text-center mb-6 uppercase tracking-wider">Container Packing List</h1>
          
          <div className="grid grid-cols-2 gap-4 mb-6 border border-slate-800 p-4 font-mono text-sm">
            <div>
              <p><strong>MANIFEST NO:</strong> {m.id}</p>
              <p><strong>TYPE:</strong> <span className={`px-2 rounded-sm border ${m.type === 'FCL' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-teal-50 border-teal-200 text-teal-700'}`}>{m.type || 'LCL'}</span></p>
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
};

const PrintDeliveryOrdersOverlay = () => {
  const { printingDeliveryOrders, setPrintingDeliveryOrders, handlePrintRequest, handleGeneratePDF, receipts, companies } = React.useContext(AppContext);
  if (!printingDeliveryOrders) return null;
  const m = printingDeliveryOrders;

  const doGroups: Record<string, any> = {};
  if (m.type === 'FCL') {
    const compConsignor = (companies || []).find(c => c.name === m.consignor);
    const compConsignee = (companies || []).find(c => c.name === m.consignee);
    const savedDeliveryAddress = compConsignee?.deliveryAddresses?.[0] ? formatAddress(compConsignee.deliveryAddresses[0]) : '';
    const key = `FCL_${m.id}`;
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
        const key = `${receipt.customer}_${receipt.consigneeDeliveryAddress || 'DEFAULT'}`;
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
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex items-center justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print">
        <div><h3 className="font-bold text-lg text-slate-800">Print Delivery Orders</h3><p className="text-sm text-slate-500">Generated {groups.length} distinct D/O pages based on destinations.</p></div>
        <div className="flex space-x-3">
          <button onClick={() => setPrintingDeliveryOrders(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', `${m.id}-DO.pdf`)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors">Print All D/Os</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20 space-y-8">
        {groups.map((group, gIdx) => {
          const manifestNoWithoutMNF = m.id.replace(/^MNF-?/, '');
          const doNumber = `DO-${manifestNoWithoutMNF}/${String(gIdx+1).padStart(3, '0')}`;

          return (
            <div key={gIdx} className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
              <h1 className="text-3xl font-black border-b-2 border-black pb-2 mb-6 text-center">DELIVERY ORDER</h1>
              
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
                  <p className="font-bold text-slate-800 border-b-2 border-slate-800 pb-1 mb-4">Driver / Transporter</p>
                  <div className="space-y-4">
                    <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Transporter:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                    <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Driver Name:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                    <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">NRIC:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="font-bold text-slate-800 border-b-2 border-slate-800 pb-1 mb-4">Consignee Received Acknowledgement</p>
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
};

const PrintPickupNoteOverlay = () => {
  const { printingPickupNote, setPrintingPickupNote, handlePrintRequest, handleGeneratePDF, companies, currentUser, formatDate } = React.useContext(AppContext);
  if (!printingPickupNote) return null;
  const pickupsToPrint = Array.isArray(printingPickupNote) ? printingPickupNote : [printingPickupNote];

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex items-center justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print">
        <div><h3 className="font-bold text-lg text-slate-800">Print Pickup Note</h3></div>
        <div className="flex space-x-3">
          <button onClick={() => setPrintingPickupNote(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', `Pickup-Note.pdf`)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-indigo-800 text-white rounded hover:bg-indigo-900 transition-colors">Print Pickup Note</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20 space-y-8">
        {pickupsToPrint.map((p, pIndex) => {
          const dropOffCompanyName = (companies || []).find(c => c.id === p.dropOffCompanyId)?.name || 'N/A';
          return (
            <div key={p.id || pIndex} className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
              
              <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-6">
                <h1 className="text-3xl font-black text-slate-800">PICKUP NOTE</h1>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-indigo-700">{p.id}</p>
                  <p className="font-mono text-sm font-semibold">{formatDate(p.date)}</p>
                </div>
              </div>

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
                      <td className="border border-slate-300 p-2 text-right font-mono">{rowGWeight ? `${rowGWeight} kg` : '-'}</td>
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
};

const PrintBookingFormOverlay = () => {
  const { printingBookingForm, setPrintingBookingForm, handlePrintRequest, handleGeneratePDF, formatDate } = React.useContext(AppContext);
  if (!printingBookingForm) return null;
  const b = printingBookingForm;
  
  const typeCounts = {};
  (b.containers || []).forEach(c => {
    const key = `${c.containerTypeId || 'Unknown'} (${c.usageType === 'FCL' ? 'FCL' : 'LCL'})`;
    typeCounts[key] = (typeCounts[key] || 0) + 1;
  });
  
  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex items-center justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print">
        <div><h3 className="font-bold text-lg text-slate-800">Print Booking Form</h3></div>
        <div className="flex space-x-3">
          <button onClick={() => setPrintingBookingForm(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', `${b.id}-Booking.pdf`)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Print To Liner</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col p-10 box-border" style={{ width: '210mm', minHeight: '297mm' }}>
          <h1 className="text-3xl font-black text-center mb-10 uppercase tracking-wider border-b-2 border-black pb-4">Container Booking Request</h1>
          
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
};

const PrintCommercialInvoiceOverlay = () => {
  const { 
    printingCommercialInvoice, setPrintingCommercialInvoice, handlePrintRequest, handleGeneratePDF, 
    companies, formatAddress, manifests, containerBookings, currentUser
  } = React.useContext(AppContext);

  if (!printingCommercialInvoice) return null;

  const ci = printingCommercialInvoice;
  const declCompany = (companies || []).find(c => c.id === ci.declCompanyId) || { name: 'Unknown Company' };
  const podConsigneeCompany = (companies || []).find(c => c.id === ci.podConsigneeId) || { name: 'To Order' };

  const mList = (manifests || []).filter(m => (ci.manifestIds || []).includes(m.id));
  const containerNumbers = Array.from(new Set(mList.map(m => m.containerNo))).filter(Boolean).join(', ');
  
  let jobNo = '';
  let linerBooking = ''; // Set to blank initially
  const cTypes: Record<string, number> = {};
  mList.forEach(m => {
     if (m.bookingId) {
        const bParts = m.bookingId.split('::');
        const bId = bParts[0];
        const cId = bParts[1];
        const b = (containerBookings || []).find(x => x.id === bId);
        if (b) {
           if (b.bookingNo && !linerBooking) linerBooking = b.bookingNo;
           const c = (b.containers || []).find((x: any) => x.id === cId);
           if (c && c.jobNo && !jobNo) jobNo = c.jobNo;
           if (c && c.containerTypeId) {
               cTypes[c.containerTypeId] = (cTypes[c.containerTypeId] || 0) + 1;
           }
        }
     }
  });
  
  const cTypeStrs = Object.entries(cTypes).map(([k, v]) => `${k} x ${v}`).join(', ');

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex items-center justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print">
        <div>
           <h3 className="font-bold text-lg text-slate-800">Print Commercial Invoice / Packing List</h3>
           <p className="text-slate-500 text-sm">Review document before printing.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setPrintingCommercialInvoice(null)} className="px-4 py-2 border rounded font-medium text-slate-600 hover:bg-slate-50">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', `${printingCommercialInvoice.id}-CIPL.pdf`)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors font-medium">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-emerald-600 text-white rounded font-medium shadow-sm hover:bg-emerald-700 flex items-center">
            <Printer className="w-4 h-4 mr-2" /> Print CI/PL
          </button>
        </div>
      </div>

      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col w-[210mm] min-h-[297mm] p-[15mm] box-border mb-8">
          
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b-2 border-slate-800">
             <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider">{declCompany.name}</h1>
                <div className="text-xs text-slate-600 mt-2 space-y-0.5 whitespace-pre-wrap">
                  {formatAddress({ 
                    line1: declCompany.addressLine1, 
                    line2: declCompany.addressLine2,
                    line3: declCompany.addressLine3,
                    postalCode: declCompany.postalCode,
                    city: declCompany.city,
                    state: declCompany.state,
                    country: declCompany.country
                  })}
                  {declCompany.contactNumber && <div>Tel: {declCompany.contactNumber}</div>}
                  {declCompany.roc && <div>ROC/Registration: {declCompany.roc}</div>}
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

          <div className="col-span-2 text-center font-bold text-lg mb-6 tracking-widest uppercase">Commercial Invoice / Packing List</div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
            <div className="p-3 border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Shipper / Exporter</div>
              <div className="font-bold text-sm">{declCompany.name}</div>
              <div className="text-xs text-slate-600 whitespace-pre-wrap mt-1">
                {formatAddress({ 
                  line1: declCompany.addressLine1, 
                  line2: declCompany.addressLine2,
                  line3: declCompany.addressLine3,
                  postalCode: declCompany.postalCode,
                  city: declCompany.city,
                  state: declCompany.state,
                  country: declCompany.country
                })}
              </div>
            </div>
            <div className="p-3 border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Importer</div>
              <div className="font-bold text-sm">{podConsigneeCompany.name}</div>
              <div className="text-xs text-slate-600 whitespace-pre-wrap mt-1">
                {formatAddress({ 
                  line1: podConsigneeCompany.addressLine1, 
                  line2: podConsigneeCompany.addressLine2,
                  line3: podConsigneeCompany.addressLine3,
                  postalCode: podConsigneeCompany.postalCode,
                  city: podConsigneeCompany.city,
                  state: podConsigneeCompany.state,
                  country: podConsigneeCompany.country
                })}
              </div>
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
             
             <div className="p-2 flex flex-col">
               <span className="text-[10px] font-bold text-slate-500 uppercase">BL NUMBER</span>
               <span className="font-semibold mt-1">{ci.hblNo || '-'}</span>
             </div>
             <div className="p-2 flex flex-col">
               <span className="text-[10px] font-bold text-slate-500 uppercase">LINER BOOKING No</span>
               <span className="font-semibold mt-1">{linerBooking || '-'}</span>
             </div>
             <div className="p-2 flex flex-col">
               <span className="text-[10px] font-bold text-slate-500 uppercase">JOB NO</span>
               <span className="font-semibold mt-1">{jobNo || '-'}</span>
             </div>
             <div className="p-2 flex flex-col">
               <span className="text-[10px] font-bold text-slate-500 uppercase">CONTAINERS</span>
               <span className="font-semibold mt-1">{containerNumbers || '-'} {cTypeStrs ? `(${cTypeStrs})` : ''}</span>
             </div>
          </div>

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

          <div className="mt-auto pt-8 text-center text-xs">
             <p className="text-xl text-slate-600 mb-2 font-medium">Generated by: <span className="font-bold text-2xl text-slate-900">{currentUser?.username || 'System'}</span></p>
             <p className="text-sm font-semibold text-slate-500 italic">This is computer generated, no signature required.</p>
          </div>

        </div>
      </div>
    </div>
  );
};

const PrintReturnNoteOverlay = () => {
  const { printingReturnNote, setPrintingReturnNote, handlePrintRequest, handleGeneratePDF, receipts } = React.useContext(AppContext);
  if (!printingReturnNote) return null;
  const ret = printingReturnNote;
  const receipt = (receipts || []).find(r => r.id === ret.receiptId) || {};

  return (
    <div className="print-safe-modal fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center overflow-y-auto pt-10 pb-20 no-print">
      
      <div className="bg-white p-4 rounded-lg shadow-xl mb-8 flex items-center justify-between w-[210mm] max-w-full sticky top-4 z-40 no-print">
        <div><h3 className="font-bold text-lg text-slate-800">Print Return Note</h3></div>
        <div className="flex space-x-3">
          <button onClick={() => setPrintingReturnNote(null)} className="px-4 py-2 border rounded hover:bg-slate-50 transition-colors">Close</button>
          <button onClick={() => handleGeneratePDF('a4-print-area', `${ret.id}-ReturnNote.pdf`)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">PDF</button>
          <button onClick={handlePrintRequest} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">Print Return Note</button>
        </div>
      </div>
      <div id="a4-print-area" className="flex flex-col items-center w-full pb-20">
        <div className="a4-page bg-white shadow-2xl border border-slate-200 relative flex flex-col" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
          
          <div className="flex justify-between items-end border-b-2 border-black pb-2 mb-6">
            <h1 className="text-3xl font-black text-slate-800">RETURN NOTE</h1>
            <div className="text-right">
              <p className="font-mono text-lg font-bold text-orange-700">{ret.id}</p>
              <p className="font-mono text-sm font-semibold">{formatDate(ret.date)}</p>
            </div>
          </div>

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
              <p className="font-bold text-slate-800 border-b-2 border-slate-800 pb-1 mb-4">
                Return and Issued By:<br/> <span className="text-lg text-blue-800 font-black">{receipt.company || 'OmniMesh'}</span>
              </p>
              <div className="space-y-4 mt-6">
                <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Company Stamp:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Signature:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
                <div className="flex items-end"><span className="w-28 font-semibold text-slate-600">Date:</span> <span className="flex-1 border-b border-dashed border-slate-400"></span></div>
              </div>
            </div>
            <div className="pt-2">
              <p className="font-bold text-slate-800 border-b-2 border-slate-800 pb-1 mb-4">
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
};

const LoginScreen = () => {
  const { users, setUsers, handleAuthLogin, showMessage } = React.useContext(AppContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempUser, setTempUser] = useState(null);

  const performFirebaseAuth = async (cleanUser, pass, isSuperAdmin = false) => {
    const email = `${cleanUser.toLowerCase().replace(/[^a-z0-9]/g, '')}@system.local`;
    const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      return cred.user.uid;
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        return cred.user.uid;
      }
      throw err;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser || !password) return;
    
    setLoading(true);
    setError('');

    try {
      if (cleanUser === 'SuperAdmin' && password === 'SuperAdmin') {
        const uid = await performFirebaseAuth(cleanUser, password, true);
        handleAuthLogin({ id: uid, username: 'SuperAdmin', roleId: 'role-superadmin' });
        setLoading(false);
        return;
      }

      const user = (users || []).find(u => u.username === cleanUser && u.password === password);
      if (user) {
        if (user.isFirstLogin && password === "ABCD@1234") {
          setTempUser(user);
          setRequirePasswordChange(true);
          setError('');
          setLoading(false);
          return;
        }

        const uid = await performFirebaseAuth(cleanUser, password, false);
        handleAuthLogin({ ...user, id: uid });
        setError('');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      console.error(err);
      setError(`Login failed: ${err.message}`);
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return setError('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    
    setLoading(true);
    try {
      // Create or update Firebase Auth
      const uid = await performFirebaseAuth(tempUser.username, tempUser.password, false);
      const { updatePassword } = await import('firebase/auth');
      await updatePassword(auth.currentUser, newPassword);

      // Update Firestore user
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', tempUser.id), {
        password: newPassword,
        isFirstLogin: false
      });
      
      handleAuthLogin({...tempUser, id: uid, password: newPassword, isFirstLogin: false });
      setError('');
    } catch (err) {
      console.error(err);
      setError(`Failed to update password: ${err.message}`);
    }
    setLoading(false);
  };

  if (requirePasswordChange) {
    return (
      <div className="flex h-screen bg-slate-100 items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-800">Change Password</h1>
            <p className="text-slate-500 mt-1">Please change your default password.</p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2" /> {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="••••••••" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg mt-2">
              Update Password
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Boxes className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">OmniMesh WMS</h1>
          <p className="text-slate-500 mt-1">Warehouse Management System v1.02</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2" /> {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <div className="relative">
              <UserCircle className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm mt-4">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatPrintDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mmm = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const yyyy = d.getFullYear();
  const ddd = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
  
  let timePart = '';
  if (typeof dateStr === 'string' && (dateStr.includes('T') || dateStr.includes(' '))) {
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      if (hours !== '00' || mins !== '00') {
         timePart = ` ${hours}:${mins}`;
      }
  }
  return `${dd}${mmm}${yyyy} (${ddd})${timePart}`;
};

const InboxSidebar = () => {
  const { inboxOpen, setInboxOpen, notifications, setNotifications, currentUser, formatDate } = React.useContext(AppContext);

  if (!inboxOpen) return null;

  const userNotifs = (notifications || []).filter(n => n.userId === currentUser?.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const toggleRead = (id) => {
    const notif = (notifications || []).find(n => n.id === id);
    if (notif) updateDoc(doc(db, 'notifications', id), { isRead: !notif.isRead })
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`));
  };

  const toggleImportant = (id) => {
    const notif = (notifications || []).find(n => n.id === id);
    if (notif) updateDoc(doc(db, 'notifications', id), { isImportant: !notif.isImportant })
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`));
  };

  const toggleFlag = (id) => {
    const notif = (notifications || []).find(n => n.id === id);
    if (notif) updateDoc(doc(db, 'notifications', id), { isFlagged: !notif.isFlagged })
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`));
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 z-[100]" onClick={() => setInboxOpen(false)}></div>
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-[110] flex flex-col transform transition-transform border-l border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Inbox className="w-5 h-5 text-blue-600" />
             </div>
             <div>
               <h2 className="text-lg font-bold text-slate-800">Inbox</h2>
               <p className="text-xs text-slate-500">{userNotifs.filter(n => !n.isRead).length} unread messages</p>
             </div>
          </div>
          <button onClick={() => setInboxOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3">
          {userNotifs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>You have no notifications.</p>
            </div>
          ) : (
            userNotifs.map(n => (
              <div key={n.id} className={`p-4 rounded-xl shadow-sm border ${n.isRead ? 'bg-white border-slate-200 opacity-75' : 'bg-blue-50/50 border-blue-200'} transition-all`}>
                 <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-bold text-sm ${n.isRead ? 'text-slate-700' : 'text-blue-900'}`}>{n.title}</h4>
                    <span className="text-[10px] text-slate-500 font-medium">{formatDate(n.date)}</span>
                 </div>
                 <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">{n.message}</p>
                 <div className="flex items-center space-x-4 border-t border-slate-100 pt-3">
                    <button onClick={() => toggleRead(n.id)} className={`text-xs font-semibold flex items-center space-x-1 ${n.isRead ? 'text-slate-400 hover:text-slate-600' : 'text-blue-600 hover:text-blue-800'}`}>
                      <CheckCircle className="w-3 h-3" /> <span>{n.isRead ? 'Mark Unread' : 'Mark Read'}</span>
                    </button>
                    <button onClick={() => toggleImportant(n.id)} className={`text-xs font-semibold flex items-center space-x-1 ${n.isImportant ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
                      <AlertCircle className="w-3 h-3" /> <span>Important</span>
                    </button>
                    <button onClick={() => toggleFlag(n.id)} className={`text-xs font-semibold flex items-center space-x-1 ${n.isFlagged ? 'text-red-500 hover:text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
                      <Flag className="w-3 h-3" /> <span>Flag</span>
                    </button>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  // Removed anonymous auth as it is disabled by default
  useEffect(() => {
    // Initialization can go here
  }, []);
  
  const handleAuthLogin = (user) => {
    const userWithSession = { ...user, loginTime: Date.now() };
    setCurrentUser(userWithSession);
    
    // Redirect logic
    if (user.isWarehouseOperator && user.roleId !== 'role-superadmin') {
      setActiveTab('warehouse-decon');
    } else {
      setActiveTab('dashboard');
    }

    const newLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      userId: user.id || 'system',
      username: user.username,
      action: 'LOGIN',
      module: 'Session',
      recordId: user.id || 'system',
      details: 'User logged in'
    };
    setDoc(doc(db, 'activityLogs', newLog.id), newLog)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `activityLogs/${newLog.id}`));
  };

  const handleAuthLogout = async () => {
    if (currentUser) {
       const durationMs = Date.now() - (currentUser.loginTime || Date.now());
       const durationMins = Math.round(durationMs / 60000);
       const newLog = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          userId: currentUser.id || 'system',
          username: currentUser.username,
          action: 'LOGOUT',
          module: 'Session',
          recordId: currentUser.id || 'system',
          details: `User logged out. Session duration: ${durationMins} minute(s)`
       };
       setDoc(doc(db, 'activityLogs', newLog.id), newLog)
         .catch(err => handleFirestoreError(err, OperationType.WRITE, `activityLogs/${newLog.id}`));
    }
    
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch(err) {
      console.error(err);
    }

    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const compareChanges = (oldObj, newObj) => {
    if (!oldObj || !newObj) return '';
    const changes = [];
    const keysToIgnore = ['id', 'date', 'lines', 'fclProducts', 'fclBilling', 'containers', 'routeLogs'];
    Object.keys(newObj).forEach(key => {
      if (keysToIgnore.includes(key)) return;
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        changes.push(`${key}: '${oldObj[key] || '-'}' -> '${newObj[key] || '-'}'`);
      }
    });
    return changes.length > 0 ? ` Changes: ${changes.join(', ')}` : '';
  };

  const logActivity = (action, module, recordId, details = '', oldRecord = null, newRecord = null) => {
    if (!currentUser) return;
    let finalDetails = details;
    if (action === 'UPDATE' && oldRecord && newRecord) {
       finalDetails += compareChanges(oldRecord, newRecord);
    }
    const newLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
      action,
      module,
      recordId,
      details: finalDetails
    };
    setDoc(doc(db, 'activityLogs', newLog.id), newLog)
      .catch(err => handleFirestoreError(err, OperationType.WRITE, `activityLogs/${newLog.id}`));
  };

  const [notifications, setNotifications] = useState([]);
  const [inboxOpen, setInboxOpen] = useState(false);

  const pushNotificationToRelatedUsers = (relatedCompanyNames, title, message) => {
     if (!relatedCompanyNames || relatedCompanyNames.length === 0) return;
     const names = Array.isArray(relatedCompanyNames) ? relatedCompanyNames : [relatedCompanyNames];
     
     const cIds = companies.filter((c: any) => names.includes(c.name)).map((c: any) => c.id);
     if (cIds.length === 0) return;
     
     const tUsers = users.filter((u: any) => cIds.includes(u.companyId));
     if (tUsers.length === 0) return;
     
     const dateStr = new Date().toISOString();
     const newNotifs = tUsers.map((u: any) => ({
       id: `notif-${Date.now()}-${Math.random()}`,
       userId: u.id,
       date: dateStr,
       title,
       message,
       isRead: false,
       isImportant: false,
       isFlagged: false
     }));
      newNotifs.forEach(n => {
        setDoc(doc(db, 'notifications', n.id), n)
          .catch(err => handleFirestoreError(err, OperationType.WRITE, `notifications/${n.id}`));
      });
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [appMessage, setAppMessage] = useState(null);
  
  const [moduleSearch, setModuleSearch] = useState('');
  const [globalTrackSearch, setGlobalTrackSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({ fieldOps: true, inbound: true, outbound: true, returns: true, systemSetup: true, superAdmin: true });

  const toggleGroup = (group) => setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));

  const showModule = (name) => {
    if (!moduleSearch) return true;
    return name.toLowerCase().includes(moduleSearch.toLowerCase());
  };
  const showGroup = (...names) => names.some(showModule);

  // App Data State
  const [receipts, setReceipts] = useState([]);
  const [returns, setReturns] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [commercialInvoices, setCommercialInvoices] = useState([]);
  const [breakbulks, setBreakbulks] = useState([]);
  
  // Master Data State
  const [companies, setCompanies] = useState([]);
  const [ports, setPorts] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [containerTypes, setContainerTypes] = useState([]);
  const [fclTemplates, setFclTemplates] = useState([]);
  const [containerBookings, setContainerBookings] = useState([]);
  const [haulierBookings, setHaulierBookings] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [haulierCounter, setHaulierCounter] = useState(1);
  const [editHaulierBookingId, setEditHaulierBookingId] = useState(null);

  // Sequence Maps
  const [receiptCountersMap, setReceiptCountersMap] = useState({});
  const [hblCountersMap, setHblCountersMap] = useState({});
  const [manifestCountersMap, setManifestCountersMap] = useState({});

  // Legacy Counters
  const [returnCounter, setReturnCounter] = useState(1);
  const [breakbulkCounter, setBreakbulkCounter] = useState(1);
  const [pickupCounter, setPickupCounter] = useState(1);
  const [bookingCounter, setBookingCounter] = useState(1);

  // Print States
  const [printingReceipt, setPrintingReceipt] = useState(null);
  const [printingA4Receipt, setPrintingA4Receipt] = useState(null);
  const [printingPackingList, setPrintingPackingList] = useState(null);
  const [printingDeliveryOrders, setPrintingDeliveryOrders] = useState(null);
  const [printingReturnNote, setPrintingReturnNote] = useState(null);
  const [printingPickupNote, setPrintingPickupNote] = useState(null);
  const [printingBookingForm, setPrintingBookingForm] = useState(null);

  // Expose print functions to window if nested deeply without context, but better to use context
  useEffect(() => {
    window.printBookingForm = (b) => {
      setPrintingBookingForm(b);
    };
  }, []);

  // Edit State
  const [editManifestId, setEditManifestId] = useState(null);
  const [editCommercialInvoiceId, setEditCommercialInvoiceId] = useState(null);
  const [printingCommercialInvoice, setPrintingCommercialInvoice] = useState(null);
  const [commercialInvoiceCountersMap, setCommercialInvoiceCountersMap] = useState({});
  const [editReceiptId, setEditReceiptId] = useState(null);
  const [editReturnId, setEditReturnId] = useState(null);
  const [editPickupId, setEditPickupId] = useState(null);
  const [editBookingId, setEditBookingId] = useState(null);
  const [convertPickupToReceiptData, setConvertPickupToReceiptData] = useState(null);

  useEffect(() => {
    // Stage 1: Essential data needed to support the Login screen and app boot
    const essentialCollections = [
      { path: 'users', setter: setUsers },
      { path: 'roles', setter: setRoles },
      { path: 'companies', setter: setCompanies },
      { path: 'ports', setter: setPorts }
    ];

    const unsubscribers = essentialCollections.map(col => {
      return onSnapshot(collection(db, col.path), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        col.setter(data);
      }, (err) => console.error(`Error syncing essential ${col.path}:`, err));
    });

    return () => unsubscribers.forEach(u => u());
  }, []);

  useEffect(() => {
    // Stage 2: Operational data that requires a logged-in user
    if (!currentUser) return;

    const operationalCollections = [
      { path: 'receipts', setter: setReceipts },
      { path: 'returns', setter: setReturns },
      { path: 'pickups', setter: setPickups },
      { path: 'manifests', setter: setManifests },
      { path: 'warehouses', setter: setWarehouses },
      { path: 'containerTypes', setter: setContainerTypes },
      { path: 'fclTemplates', setter: setFclTemplates },
      { path: 'containerBookings', setter: setContainerBookings },
      { path: 'haulierBookings', setter: setHaulierBookings },
      { path: 'commercialInvoices', setter: setCommercialInvoices },
      { path: 'breakbulks', setter: setBreakbulks },
      { path: 'activityLogs', setter: setActivityLogs },
      { path: 'notifications', setter: setNotifications }
    ];

    const unsubscribers = operationalCollections.map(col => {
      return onSnapshot(collection(db, col.path), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        col.setter(data);
      }, (err) => console.error(`Error syncing operational ${col.path}:`, err));
    });

    // Special listener for counters logic remains here
    const unsubCounters = onSnapshot(doc(db, 'system', 'counters'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data.receiptCountersMap) setReceiptCountersMap(data.receiptCountersMap);
        if (data.hblCountersMap) setHblCountersMap(data.hblCountersMap);
        if (data.manifestCountersMap) setManifestCountersMap(data.manifestCountersMap);
        if (data.returnCounter) setReturnCounter(data.returnCounter);
        if (data.breakbulkCounter) setBreakbulkCounter(data.breakbulkCounter);
        if (data.pickupCounter) setPickupCounter(data.pickupCounter);
        if (data.bookingCounter) setBookingCounter(data.bookingCounter);
        if (data.haulierCounter) setHaulierCounter(data.haulierCounter);
        if (data.commercialInvoiceCountersMap) setCommercialInvoiceCountersMap(data.commercialInvoiceCountersMap);
      }
    });

    return () => {
      unsubscribers.forEach(u => u());
      unsubCounters();
    };
  }, [currentUser]); // Re-run when currentUser changes

  const showMessage = (msg, type = 'error') => setAppMessage({ text: msg, type });
  const closeMessage = () => setAppMessage(null);

  const checkAccess = (module, action) => {
    if (!currentUser) return false;
    if (currentUser.roleId === 'role-superadmin') return true;

    const userRole = (roles || []).find(r => r?.id === currentUser.roleId);
    if (!userRole || !userRole.permissions || userRole.permissions === 'ALL') return false;

    return !!(userRole.permissions[module] && userRole.permissions[module][action]);
  };

  const handlePrintRequest = () => {
    try {
      window.print();
      showMessage("If the print dialog is blocked by this browser preview, please press Ctrl+P (or Cmd+P on Mac) to print the document.", "success");
    } catch (err) {
      showMessage("Printing is restricted in this preview. Please press Ctrl+P (or Cmd+P) to print.", "error");
    }
  };

  const handleGeneratePDF = (elementId, filename = 'document.pdf') => {
    import('html2pdf.js').then((module) => {
      const html2pdf = (module.default ? module.default : module) as any;
      const element = document.getElementById(elementId);
      if (!element) return showMessage("Document content not found.", "error");
      
      const opt = {
        margin:       [10, 10, 10, 10], // top, left, bottom, right in mm
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(element).save();
    }).catch(err => {
      console.error(err);
      showMessage("Failed to load PDF generator.", "error");
    });
  };

  const generateShipmentId = (dateObj, pol, pod, countersMap) => {
    const d = dateObj ? new Date(dateObj) : new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const routeStr = `${pol || 'POL'}${pod || 'POD'}`.replace(/[^A-Z0-9]/ig, '').toUpperCase();
    const key = `${yy}${mm}${dd}-${routeStr}`;
    const currentCounter = ((countersMap || {})[key] || 0) + 1;
    return `SID-${yy}${mm}${dd}-${routeStr}-${String(currentCounter).padStart(4, '0')}`;
  };

  const generateManifestNo = (dateObj, pol, pod, countersMap) => {
    const d = dateObj ? new Date(dateObj) : new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const routeStr = `${pol || 'POL'}${pod || 'POD'}`.replace(/[^A-Z0-9]/ig, '').toUpperCase();
    const key = `${yy}${mm}-${routeStr}`;
    const currentCounter = ((countersMap || {})[key] || 0) + 1;
    return `MNF-${yy}${mm}-${routeStr}-${String(currentCounter).padStart(4, '0')}`;
  };

  const generateCommercialInvoiceNo = (dateObj, declCompanyId, countersMap) => {
    const d = dateObj ? new Date(dateObj) : new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    // Using simple format CIPL-YYMM-XXXX
    const key = `${yy}${mm}`;
    const currentCounter = ((countersMap || {})[key] || 0) + 1;
    return `CIPL-${yy}${mm}-${String(currentCounter).padStart(4, '0')}`;
  };

  const generateReturnNo = () => `RET-${String(returnCounter).padStart(5, '0')}`;
  const generateBreakbulkNo = () => `BRK-${String(breakbulkCounter).padStart(5, '0')}`;
  const generatePickupNo = () => `PU-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth()+1).padStart(2, '0')}-${String(pickupCounter).padStart(4, '0')}`;
  
  const generateHaulierBookingNo = (dateStr, port) => {
    let d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const portStr = (port || 'PORT').replace(/[^A-Z0-9]/ig, '').toUpperCase();
    return `HSB-${yy}${mm}${dd}-${portStr}-${String(haulierCounter).padStart(3, '0')}`;
  };

  const generateBookingNo = (pol, pod, expectedSailingDate) => {
    let d = expectedSailingDate ? new Date(expectedSailingDate) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const portCode = `${pol || 'POL'}${pod || 'POD'}`.replace(/[^A-Z0-9]/ig, '').toUpperCase();
    return `CBN-${yy}${mm}-${portCode}-${String(bookingCounter).padStart(3, '0')}`;
  };
  
  const generateLineHBL = (dateObj, pol, pod, countersMap) => {
    const d = dateObj ? new Date(dateObj) : new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const routeStr = `${pol || ''}${pod || ''}`.replace(/[^A-Z0-9]/ig, '').toUpperCase();
    const key = `${yy}${mm}${dd}-${routeStr}`;
    const currentCounter = ((countersMap || {})[key] || 0) + 1;
    return `HBL-${yy}${mm}${dd}-${routeStr}-${String(currentCounter).padStart(4, '0')}`;
  };

  const calculateCBM = (l, w, h, qty) => {
    const lCm = parseFloat(l) || 0;
    const wCm = parseFloat(w) || 0;
    const hCm = parseFloat(h) || 0;
    const quantity = parseInt(qty) || 0;
    return ((lCm * wCm * hCm) / 1000000) * quantity;
  };

  const getActiveInventory = (excludeManifestId = null) => {
    const stockMap = new Map();

    (receipts || []).forEach(r => {
      (r.lines || []).forEach(line => {
        const key = `${r.id}-${line.id}`;
        stockMap.set(key, {
          receiptId: r.id,
          date: r.date,
          transactionType: r.transactionType,
          pol: r.pol,
          pod: r.pod,
          company: r.company,
          customer: r.customer,
          consignee: r.consignee,
          consignor: r.consignor,
          originalLineId: line.id,
          product: line.product,
          uom: line.uom,
          receivedQty: line.qty,
          currentQty: line.qty,
          unitCbm: line.qty > 0 ? line.cbm / line.qty : 0,
          unitWeight: parseFloat(line.weight) || 0,
          isUrgent: r.isUrgent || false
        });
      });
    });

    (breakbulks || []).forEach(bb => {
      const sourceKey = `${bb.receiptId}-${bb.originalLineId}`;
      let sourceItem = stockMap.get(sourceKey);
      if (sourceItem) {
        sourceItem.currentQty -= bb.breakQty;
      }
      (bb.lines || []).forEach(line => {
        const newKey = `${bb.receiptId}-${line.id}`;
        stockMap.set(newKey, {
          ...sourceItem,
          originalLineId: line.id,
          product: line.product,
          uom: line.uom,
          receivedQty: line.qty,
          currentQty: line.qty,
          unitCbm: line.qty > 0 ? line.cbm / line.qty : 0,
          unitWeight: parseFloat(line.weight) || 0,
          isBreakbulk: true
        });
      });
    });

    (returns || []).forEach(ret => {
      (ret.lines || []).forEach(retLine => {
        const key = `${ret.receiptId}-${retLine.originalLineId}`;
        if (stockMap.has(key)) stockMap.get(key).currentQty -= retLine.returnQty;
      });
    });

    (manifests || []).forEach(mnf => {
      if (excludeManifestId && mnf.id === excludeManifestId) return;
      (mnf.lines || []).forEach(mnfLine => {
        const key = `${mnfLine.receiptId}-${mnfLine.originalLineId}`;
        if (stockMap.has(key)) stockMap.get(key).currentQty -= mnfLine.loadQty;
      });
    });

    return Array.from(stockMap.values());
  };

  const contextValue = {
    currentUser, setCurrentUser, handleAuthLogin, handleAuthLogout,
    activityLogs, setActivityLogs, logActivity, ActivityHistory,
    notifications, setNotifications, pushNotificationToRelatedUsers, inboxOpen, setInboxOpen,
    activeTab, setActiveTab,
    appMessage,
    receipts, setReceipts,
    returns, setReturns,
    db, doc, setDoc, updateDoc, addDoc, deleteDoc, handleFirestoreError, OperationType,
    pickups, setPickups,
    manifests, setManifests,
    commercialInvoices, setCommercialInvoices,
    breakbulks, setBreakbulks,
    companies, setCompanies,
    ports, setPorts,
    users, setUsers,
    roles, setRoles,
    warehouses, setWarehouses,
    containerTypes, setContainerTypes,
    containerBookings, setContainerBookings,
    fclTemplates, setFclTemplates,
    haulierBookings, setHaulierBookings,
    tariffs, setTariffs,
    editHaulierBookingId, setEditHaulierBookingId,
    haulierCounter, setHaulierCounter,
    generateHaulierBookingNo,
    receiptCountersMap, setReceiptCountersMap,
    returnCounter, setReturnCounter,
    manifestCountersMap, setManifestCountersMap,
    breakbulkCounter, setBreakbulkCounter,
    pickupCounter, setPickupCounter,
    bookingCounter, setBookingCounter,
    hblCountersMap, setHblCountersMap,
    printingReceipt, setPrintingReceipt,
    printingA4Receipt, setPrintingA4Receipt,
    printingPackingList, setPrintingPackingList,
    printingDeliveryOrders, setPrintingDeliveryOrders,
    printingReturnNote, setPrintingReturnNote,
    printingPickupNote, setPrintingPickupNote,
    printingBookingForm, setPrintingBookingForm,
    printingCommercialInvoice, setPrintingCommercialInvoice,
    editManifestId, setEditManifestId,
    editCommercialInvoiceId, setEditCommercialInvoiceId,
    commercialInvoiceCountersMap, setCommercialInvoiceCountersMap,
    editReceiptId, setEditReceiptId,
    editReturnId, setEditReturnId,
    editPickupId, setEditPickupId,
    editBookingId, setEditBookingId,
    convertPickupToReceiptData, setConvertPickupToReceiptData,
    globalTrackSearch, setGlobalTrackSearch,
    showMessage, closeMessage, checkAccess,
    handlePrintRequest, handleGeneratePDF, generateShipmentId, generateReturnNo,
    generateManifestNo, generateBreakbulkNo, generatePickupNo, generateBookingNo, generateLineHBL, generateCommercialInvoiceNo,
    calculateCBM, getActiveInventory, formatDate, formatPrintDate, formatAddress
  };

  return (
    <AppContext.Provider value={contextValue}>
      { !currentUser ? <LoginScreen /> : (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 relative">
          
          {appMessage && (
            <div className="fixed inset-0 z-[100] flex items-start justify-center pt-10 pointer-events-none">
              <div className={`pointer-events-auto flex items-center space-x-3 px-6 py-4 rounded-lg shadow-xl ${appMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                {appMessage.type === 'error' ? <AlertCircle className="w-6 h-6 text-red-500" /> : <CheckCircle className="w-6 h-6 text-green-500" />}
                <span className="font-medium text-sm">{appMessage.text}</span>
                <button onClick={closeMessage} className="ml-4 text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
              </div>
            </div>
          )}

          <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 flex flex-col overflow-y-auto no-print shadow-xl main-app-container transition-all duration-300`}>
            <div className={`p-6 sticky top-0 bg-slate-900 z-10 border-b border-slate-800 flex items-center justify-between`}>
              {!isSidebarCollapsed ? (
                <>
                  <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2"><Boxes className="w-8 h-8 text-blue-500 min-w-[32px]" /><span>OmniMesh WMS</span></h1>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">v1.02</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center w-full space-y-6">
                  <Boxes className="w-8 h-8 text-blue-500" />
                </div>
              )}
            </div>
            
            <nav className="flex-1 px-3 space-y-1 mt-4 pb-6 overflow-x-hidden">

              {checkAccess('dashboard', 'view') && showGroup('dashboard', 'track cargo') && (
                <>
                  {showModule('dashboard') && (
                    <button title="Dashboard" onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                      <LayoutDashboard className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Dashboard</span>}
                    </button>
                  )}
                  {showModule('track cargo') && (
                    <button title="Track Cargo" onClick={() => setActiveTab('track')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'track' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                      <Search className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Track Cargo</span>}
                    </button>
                  )}
                </>
              )}
              
              {(checkAccess('pickups', 'view') || checkAccess('manifests', 'view')) && showGroup('service bookings', 'new pickup', 'pickup requests', 'new container booking', 'container bookings', 'new haulier', 'haulier bookings') && (
                <>
                  <div 
                    className="pt-4 pb-2 px-4 cursor-pointer hover:text-slate-300 flex items-center justify-between text-slate-500"
                    onClick={() => !isSidebarCollapsed && toggleGroup('serviceBookings')}
                  >
                    {isSidebarCollapsed ? <div className="h-px w-full bg-slate-700 my-2"></div> : (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wider text-left">Service Bookings</p>
                        {collapsedGroups.serviceBookings ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                      </>
                    )}
                  </div>
                  {(!collapsedGroups.serviceBookings || isSidebarCollapsed || !!moduleSearch) && (
                    <>
                      {checkAccess('pickups', 'create') && showModule('new pickup') && (
                        <button title="New Pickup" onClick={() => { setEditPickupId(null); setActiveTab('new-pickup'); }} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'new-pickup' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><PackagePlus className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>New Pickup</span>}</button>
                      )}
                      {checkAccess('pickups', 'view') && showModule('pickup requests') && (
                        <button title="Pickup Requests" onClick={() => setActiveTab('pickup-list')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'pickup-list' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><List className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Pickup Requests</span>}</button>
                      )}
                      {checkAccess('manifests', 'create') && showModule('new container booking') && (
                        <button title="New Container Booking" onClick={() => { setEditBookingId(null); setActiveTab('new-booking'); }} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'new-booking' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Ship className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>New Container Booking</span>}</button>
                      )}
                      {showModule('container bookings') && (
                        <button title="Container Bookings" onClick={() => setActiveTab('booking-list')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'booking-list' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><List className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Container Bookings</span>}</button>
                      )}
                      {checkAccess('manifests', 'create') && showModule('new haulier') && (
                        <button title="New Haulier" onClick={() => { setEditHaulierBookingId(null); setActiveTab('new-haulier-booking'); }} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'new-haulier-booking' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Truck className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>New Haulier</span>}</button>
                      )}
                      {showModule('haulier bookings') && (
                        <button title="Haulier Bookings" onClick={() => setActiveTab('haulier-booking-list')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'haulier-booking-list' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><List className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Haulier Bookings</span>}</button>
                      )}
                    </>
                  )}
                </>
              )}

              {checkAccess('manifests', 'view') && showGroup('outbound', 'new manifest', 'manifests', 'ci/pl', 'new ci/pl', 'new lcl shipment', 'shipments', 'inbound dashboard') && (
                <>
                  <div 
                    className="pt-4 pb-2 px-4 cursor-pointer hover:text-slate-300 flex items-center justify-between text-slate-500"
                    onClick={() => !isSidebarCollapsed && toggleGroup('outbound')}
                  >
                    {isSidebarCollapsed ? <div className="h-px w-full bg-slate-700 my-2"></div> : (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wider text-left">Outbound</p>
                        {collapsedGroups.outbound ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                      </>
                    )}
                  </div>
                  {(!collapsedGroups.outbound || isSidebarCollapsed || !!moduleSearch) && (
                    <>
                      {(currentUser?.isWarehouseOperator || currentUser?.roleId === 'role-superadmin') && showModule('inbound dashboard') && (
                        <button title="Warehouse Ops" onClick={() => setActiveTab('warehouse-decon')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'warehouse-decon' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                          <Boxes className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Inbound Dashboard</span>}
                        </button>
                      )}
                      {checkAccess('receipts', 'create') && showModule('new lcl shipment') && (
                        <button title="New LCL Shipment" onClick={() => { setConvertPickupToReceiptData(null); setEditReceiptId(null); setActiveTab('new-receipt'); }} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'new-receipt' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><PackagePlus className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>New LCL Shipment</span>}</button>
                      )}
                      {checkAccess('receipts', 'view') && showModule('shipments') && (
                        <button title="Shipments" onClick={() => setActiveTab('receipt-list')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'receipt-list' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><List className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Shipments</span>}</button>
                      )}
                      {checkAccess('manifests', 'create') && showModule('new manifest') && (
                        <button title="New Manifest" onClick={() => { setEditManifestId(null); setActiveTab('new-manifest'); }} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'new-manifest' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Container className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>New Manifest</span>}</button>
                      )}
                      {showModule('manifests') && (
                        <button title="Manifests" onClick={() => setActiveTab('manifest-list')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'manifest-list' ? 'bg-teal-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><ClipboardList className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Manifests</span>}</button>
                      )}
                      {checkAccess('commercial_invoices', 'create') && showModule('new ci/pl') && (
                        <button title="New CI/PL" onClick={() => { setEditCommercialInvoiceId(null); setActiveTab('new-commercial-invoice'); }} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'new-commercial-invoice' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><FileText className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>New CI/PL</span>}</button>
                      )}
                      {checkAccess('commercial_invoices', 'view') && showModule('ci/pl') && (
                        <button title="CI/PL" onClick={() => setActiveTab('commercial-invoices-list')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'commercial-invoices-list' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><List className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>CI/PL</span>}</button>
                      )}
                    </>
                  )}
                </>
              )}

              {(checkAccess('returns', 'view') || checkAccess('inventory', 'view')) && showGroup('returns & stock', 'issue return note', 'return history', 'active inventory') && (
                <>
                  <div 
                    className="pt-4 pb-2 px-4 cursor-pointer hover:text-slate-300 flex items-center justify-between text-slate-500"
                    onClick={() => !isSidebarCollapsed && toggleGroup('returns')}
                  >
                    {isSidebarCollapsed ? <div className="h-px w-full bg-slate-700 my-2"></div> : (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wider text-left">Returns & Stock</p>
                        {collapsedGroups.returns ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                      </>
                    )}
                  </div>
                  {(!collapsedGroups.returns || isSidebarCollapsed || !!moduleSearch) && (
                    <>
                      {checkAccess('returns', 'create') && showModule('issue return note') && (
                        <button title="Issue Return Note" onClick={() => { setEditReturnId(null); setActiveTab('new-return'); }} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'new-return' ? 'bg-orange-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Undo2 className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Issue Return Note</span>}</button>
                      )}
                      {checkAccess('returns', 'view') && showModule('return history') && (
                        <button title="Return History" onClick={() => setActiveTab('return-list')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'return-list' ? 'bg-orange-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><List className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Return History</span>}</button>
                      )}
                      {checkAccess('inventory', 'view') && showModule('active inventory') && (
                        <button title="Active Inventory" onClick={() => setActiveTab('inventory')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><FileText className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Active Inventory</span>}</button>
                      )}
                    </>
                  )}
                </>
              )}

              {checkAccess('master_data', 'view') && showGroup('system setup', 'master data') && (
                <>
                  <div 
                    className="pt-4 pb-2 px-4 cursor-pointer hover:text-slate-300 flex items-center justify-between text-slate-500"
                    onClick={() => !isSidebarCollapsed && toggleGroup('systemSetup')}
                  >
                    {isSidebarCollapsed ? <div className="h-px w-full bg-slate-700 my-2"></div> : (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wider text-left">System Setup</p>
                        {collapsedGroups.systemSetup ? <ChevronRight className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                      </>
                    )}
                  </div>
                  {(!collapsedGroups.systemSetup || isSidebarCollapsed || !!moduleSearch) && (
                    <>
                      {showModule('master data') && (
                        <button title="Master Data" onClick={() => setActiveTab('master-data')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'master-data' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Database className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Master Data</span>}</button>
                      )}
                      {checkAccess('reports', 'view') && showModule('reports') && (
                        <button title="Reports" onClick={() => setActiveTab('reports')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'reports' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><FileText className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Reports</span>}</button>
                      )}
                    </>
                  )}
                </>
              )}

              {currentUser.roleId === 'role-superadmin' && showGroup('super admin', 'system controls') && (
                <>
                  <div 
                    className="pt-8 pb-2 px-4 cursor-pointer hover:text-red-400 flex items-center justify-between text-slate-500"
                    onClick={() => !isSidebarCollapsed && toggleGroup('superAdmin')}
                  >
                    {isSidebarCollapsed ? <div className="h-px w-full bg-slate-700 my-2"></div> : (
                      <>
                        <p className="text-xs font-black text-red-500 uppercase tracking-wider text-left">Super Admin</p>
                        {collapsedGroups.superAdmin ? <ChevronRight className="w-4 h-4 ml-1 text-red-500" /> : <ChevronDown className="w-4 h-4 ml-1 text-red-500" />}
                      </>
                    )}
                  </div>
                  {(!collapsedGroups.superAdmin || isSidebarCollapsed || !!moduleSearch) && (
                    <>
                      {showModule('system controls') && (
                        <button title="System Controls" onClick={() => setActiveTab('sys-admin')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'sys-admin' ? 'bg-red-600 text-white' : 'hover:bg-slate-800 hover:text-red-400'}`}><Settings className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>System Controls</span>}</button>
                      )}
                      {showModule('activity logs') && (
                        <button title="Activity Logs" onClick={() => setActiveTab('activity-logs')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-colors ${activeTab === 'activity-logs' ? 'bg-red-600 text-white' : 'hover:bg-slate-800 hover:text-red-400'}`}><ClipboardList className="w-5 h-5 min-w-[20px]" /> {!isSidebarCollapsed && <span>Activity Logs</span>}</button>
                      )}
                    </>
                  )}
                </>
              )}
            </nav>
          </div>

          <div className="flex-1 overflow-auto flex flex-col main-app-container">
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
              <div className="flex items-center space-x-6">
                 <div className="text-sm font-medium text-slate-500 flex-shrink-0">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                 <div className="relative hidden md:flex items-center space-x-2">
                   <span className="text-sm font-medium text-slate-500">Module:</span>
                   <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-4 w-4 text-slate-400" />
                   </div>
                   <input
                     type="text"
                     placeholder="Search module..."
                     className="block w-48 pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                     value={moduleSearch}
                     onChange={(e) => setModuleSearch(e.target.value)}
                   />
                   </div>
                 </div>
                 
                 <div className="relative hidden lg:flex items-center space-x-2">
                   <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Track Cargo:</span>
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Search className="h-4 w-4 text-slate-400" />
                     </div>
                     <input
                       type="text"
                       placeholder="Enter SID, DO, Container..."
                       className="block w-56 xl:w-72 pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                       value={globalTrackSearch}
                       onChange={(e) => setGlobalTrackSearch(e.target.value.toUpperCase())}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') setActiveTab('track');
                       }}
                     />
                   </div>
                 </div>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                   onClick={() => setInboxOpen(true)}
                   className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors"
                >
                   <Bell className="w-5 h-5 text-slate-600" />
                   {notifications.filter(n => n.userId === currentUser.id && !n.isRead).length > 0 && (
                     <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
                       {notifications.filter(n => n.userId === currentUser.id && !n.isRead).length}
                     </span>
                   )}
                </button>
                <div className="flex items-center space-x-2 border-r border-slate-200 pr-4">
                  <UserCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-700">{currentUser.username}</span>
                </div>
                <button 
                  onClick={handleAuthLogout} 
                  className="flex items-center space-x-1 text-sm text-slate-500 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> <span>Logout</span>
                </button>
              </div>
            </header>
            
            <main className="p-8 flex-1">
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'track' && <TrackCargoView />}
              {activeTab === 'new-pickup' && <PickupForm />}
              {activeTab === 'pickup-list' && <PickupList />}
              {activeTab === 'new-receipt' && <ReceiptForm />}
              {activeTab === 'receipt-list' && <ReceiptList />}
              {activeTab === 'new-commercial-invoice' && <CommercialInvoiceForm AppContext={AppContext} />}
              {activeTab === 'commercial-invoices-list' && <CommercialInvoiceList AppContext={AppContext} />}
              {activeTab === 'new-booking' && <ContainerBookingForm />}
              {activeTab === 'booking-list' && <ContainerBookingList />}
              {activeTab === 'new-haulier-booking' && <HaulierBookingForm />}
              {activeTab === 'haulier-booking-list' && <HaulierBookingList />}
              {activeTab === 'warehouse-decon' && <DeConsolidationModule />}
              {activeTab === 'new-manifest' && <ManifestForm />}
              {activeTab === 'manifest-list' && <ManifestList />}
              {activeTab === 'new-return' && <ReturnNoteForm />}
              {activeTab === 'return-list' && <ReturnList />}
              {activeTab === 'inventory' && <InventoryView />}
              {activeTab === 'master-data' && <MasterMaintenance />}
              {activeTab === 'reports' && <ReportModule context={contextValue} />}
              {activeTab === 'sys-admin' && <SystemAdminModule />}
              {activeTab === 'activity-logs' && <ActivityLogViewer />}
            </main>
          </div>

          <PrintLabelsOverlay />
          <PrintA4Overlay />
          <PrintPackingListOverlay />
          <PrintBookingFormOverlay />
          <PrintDeliveryOrdersOverlay />
          <PrintCommercialInvoiceOverlay />
          <PrintReturnNoteOverlay />
          <PrintPickupNoteOverlay />
          <InboxSidebar />
        </div>
      )}
    </AppContext.Provider>
  );
}