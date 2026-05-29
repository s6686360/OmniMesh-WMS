const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add setPrintingDeliveryOrders and setPrintingPackingList to ManifestForm context destructuring
code = code.replace(
  "setManifests, setEditManifestId, \n    setActiveTab, ports",
  "setManifests, setEditManifestId, \n    setActiveTab, ports, setPrintingPackingList, setPrintingDeliveryOrders"
);

// 2. Replace LCL button area
const lclButtonPattern = `<button onClick={saveManifest} className="w-full flex items-center justify-center space-x-2 bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-teal-700">
                <Save className="w-5 h-5" /><span>Save Container Manifest</span>
              </button>`;

const newLclButtonArea = `<div className="flex items-center justify-between">
                <div>
                  {editManifestId && checkAccess('manifests', 'print') && (
                    <div className="flex space-x-2">
                       <button onClick={() => setPrintingPackingList(manifests.find(m => m.id === editManifestId))} className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                         <FileText className="w-5 h-5" /><span>Print Packing List</span>
                       </button>
                       <button onClick={() => setPrintingDeliveryOrders(manifests.find(m => m.id === editManifestId))} className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                         <ClipboardList className="w-5 h-5" /><span>Print Delivery Orders</span>
                       </button>
                    </div>
                  )}
                </div>
                <button onClick={saveManifest} className="flex items-center space-x-2 bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm hover:bg-teal-700">
                  <Save className="w-5 h-5" /><span>{editManifestId ? 'Update Container Manifest' : 'Save Container Manifest'}</span>
                </button>
              </div>`;

code = code.replace(lclButtonPattern, newLclButtonArea);

// 3. Replace FCL button area
const fclButtonPattern = `<button onClick={saveManifest} className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700">
                <Save className="w-5 h-5" /><span>Save FCL Container</span>
              </button>`;

const newFclButtonArea = `<div className="flex items-center justify-between">
                <div>
                  {editManifestId && checkAccess('manifests', 'print') && (
                    <div className="flex space-x-2">
                       <button onClick={() => setPrintingPackingList(manifests.find(m => m.id === editManifestId))} className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                         <FileText className="w-5 h-5" /><span>Print Packing List</span>
                       </button>
                    </div>
                  )}
                </div>
                <button onClick={saveManifest} className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium shadow-sm hover:bg-indigo-700">
                  <Save className="w-5 h-5" /><span>{editManifestId ? 'Update FCL Container' : 'Save FCL Container'}</span>
                </button>
              </div>`;

code = code.replace(fclButtonPattern, newFclButtonArea);

fs.writeFileSync('src/App.tsx', code);
console.log('Manifest buttons updated');
