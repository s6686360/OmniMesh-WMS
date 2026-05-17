import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, BookOpen, ChevronRight, HelpCircle, 
  LayoutDashboard, PackagePlus, List, Ship, 
  Settings, Truck, Database, FileText, ClipboardList
} from 'lucide-react';

interface HandbookSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  keywords: string[];
}

const handbookData: HandbookSection[] = [
  {
    id: 'intro',
    title: 'Introduction',
    icon: <BookOpen className="w-5 h-5" />,
    keywords: ['welcome', 'overview', 'getting started', 'omnimesh'],
    content: `## Welcome to OmniMesh WMS
OmniMesh is a comprehensive Warehouse Management System designed for high-efficiency logistics, container tracking, and inventory management.

From here, you can manage the entire lifecycle of a shipment—from initial pickup requests to containerization and final delivery documentation.`
  },
  {
    id: 'dashboard',
    title: 'Dashboard & Analytics',
    icon: <LayoutDashboard className="w-5 h-5" />,
    keywords: ['stats', 'cbm', 'weight', 'charts', 'calendar', 'schedule'],
    content: `## Dashboard Overview
The dashboard provides a real-time snapshot of your operations:
- **LCL & FCL Analytics**: Monitor CBM and Weight utilization.
- **Schedules**: A calendar view of upcoming vessel departures and arrivals.
- **Urgent Shipments**: Direct visibility into high-priority cargo.

### Booking Schedule
Use the calendar to track container bookings. It displays assigned capacity vs. total capacity for LCL consolidations, helping you optimize space.`
  },
  {
    id: 'pickup',
    title: 'Pickup Requests',
    icon: <Truck className="w-5 h-5" />,
    keywords: ['collection', 'haulier', 'van', 'linking', 'pu'],
    content: `## Managing Pickups
The Pickup module handles the collection of cargo from customers or vendors.

- **Status Tracking**: NEW → ARRIVED → LINKED.
- **Manual Linking**: You can link a pickup request to a Shipment ID (SID). 
- **Automated Update**: Once linked, the record allows updates to reflect final received quantities.`
  },
  {
    id: 'shipment',
    title: 'Shipment Entry (SID)',
    icon: <PackagePlus className="w-5 h-5" />,
    keywords: ['receiving', 'stock in', 'sid', 'cargo', 'labels'],
    content: `## Receiving Cargo
The Shipment Entry module is where cargo is officially "Stocked-In" to the warehouse.

- **SID Generation**: Automated IDs based on Date, POL/POD, and sequence.
- **Cargo Detail**: Capture Unit CBM, Weight, and Type.
- **Labeling**: Every shipment generates printable thermal labels for tracking.`
  },
  {
    id: 'manifest',
    title: 'Manifest Manager',
    icon: <Ship className="w-5 h-5" />,
    keywords: ['loading', 'container', 'shipping', 'master manifest', 'closing'],
    content: `## Container Manifests
Combine multiple Shipments into a single Container for export.

- **Capacity Check**: Real-time CBM and Weight balance indicators prevent overloading.
- **Master Manifest**: Generate the document required for customs and vessel loading.
- **Loading Quantities**: Partially load Shipments if necessary.`
  },
  {
    id: 'inventory',
    title: 'Inventory & Warehouse Ops',
    icon: <Database className="w-5 h-5" />,
    keywords: ['stock', 'warehouse', 'split', 'breakbulk', 'deconsolidation'],
    content: `## Warehouse Operations
- **Inventory List**: Real-time view of all cargo currently in stock.
- **Breakbulk / Split**: Divide a large shipment into smaller parts for separate distribution.
- **Deconsolidation**: Receive incoming containers and unload cargo back into stock.`
  },
  {
    id: 'documents',
    title: 'Documentation',
    icon: <FileText className="w-5 h-5" />,
    keywords: ['invoice', 'cipl', 'packing list', 'delivery order', 'do'],
    content: `## Export & Local Docs
- **Commercial Invoice (CIPL)**: Generate standardized invoices for shipments.
- **Delivery Orders (DO)**: Generate documents for local trucking and proof of delivery.
- **Packing Lists**: Automated generation based on manifest data.`
  },
  {
    id: 'admin',
    title: 'System Administration',
    icon: <Settings className="w-5 h-5" />,
    keywords: ['reset', 'wipe', 'factory', 'counters', 'security', 'questions'],
    content: `## Administrative Controls
Access to these features is restricted to SuperAdmins.

- **Running Numbers**: Manually reset SID, Manifest, or Booking counters.
- **Factory Reset**: A high-security operation to wipe operational data while preserving user roles.
- **Security Check**: Wiping data requires answering two pre-set security questions.`
  }
];

export const HandbookOverlay = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState('intro');

  const filteredSections = useMemo(() => {
    if (!searchTerm) return handbookData;
    const lower = searchTerm.toLowerCase();
    return handbookData.filter(s => 
      s.title.toLowerCase().includes(lower) || 
      s.content.toLowerCase().includes(lower) ||
      s.keywords.some(k => k.includes(lower))
    );
  }, [searchTerm]);

  const activeSection = handbookData.find(s => s.id === selectedId) || handbookData[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">OmniMesh Handbook</h1>
                  <p className="text-sm text-slate-500">Master your logistics workspace</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar */}
              <div className="w-72 border-r border-slate-100 flex flex-col bg-slate-50/50">
                <div className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search keywords..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredSections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedId(section.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedId === section.id 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'text-slate-600 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      {section.icon}
                      <span>{section.title}</span>
                    </button>
                  ))}
                  {filteredSections.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm italic">
                      No matching topics
                    </div>
                  )}
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-8 bg-white">
                <div className="max-w-3xl">
                  {/* Decorative badge */}
                  <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4">
                    <ChevronRight className="w-3 h-3" />
                    <span>Documentation Section</span>
                  </div>

                  <div className="prose prose-slate max-w-none">
                    {/* Render Title */}
                    <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center space-x-3">
                       <span className="p-2 bg-slate-100 rounded-xl">{activeSection.icon}</span>
                       <span>{activeSection.title}</span>
                    </h2>

                    {/* Pre-formatted content with some basic "markdown-like" rendering */}
                    <div className="text-slate-600 leading-relaxed space-y-4">
                      {activeSection.content.split('\n').map((line, i) => {
                        if (line.startsWith('## ')) {
                          return <h3 key={i} className="text-xl font-bold text-slate-800 mt-8 mb-2">{line.replace('## ', '')}</h3>;
                        }
                        if (line.startsWith('### ')) {
                          return <h4 key={i} className="text-lg font-bold text-slate-700 mt-6 mb-2">{line.replace('### ', '')}</h4>;
                        }
                        if (line.startsWith('- ')) {
                          return (
                            <div key={i} className="flex items-start space-x-3 ml-2">
                              <div className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <p className="text-slate-600">{line.replace('- ', '')}</p>
                            </div>
                          );
                        }
                        return line.trim() ? <p key={i}>{line}</p> : <div key={i} className="h-2" />;
                      })}
                    </div>
                  </div>

                  {/* Help Footer */}
                  <div className="mt-12 p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Still need help?</h4>
                        <p className="text-sm text-slate-500">Contact the system administrator for technical support.</p>
                      </div>
                    </div>
                    <button className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                      Open Ticket
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
