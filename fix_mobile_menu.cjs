const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. In App.tsx, export it from Context:
code = code.replace(
  "printingReceipt, setPrintingReceipt,",
  "setIsMobileMenuOpen, printingReceipt, setPrintingReceipt,"
);

// 2. In modules that use it, add to useContext:
code = code.replace(
  "setActiveTab, setPrintingA4Receipt, setPrintingReceipt, setReceipts, showMessage, openRecordInNewWindow",
  "setActiveTab, setPrintingA4Receipt, setPrintingReceipt, setReceipts, showMessage, openRecordInNewWindow, setIsMobileMenuOpen"
);

code = code.replace(
  "setEditCommercialInvoiceId, checkAccess, db, showMessage, getActiveInventory } =",
  "setEditCommercialInvoiceId, checkAccess, db, showMessage, getActiveInventory, setIsMobileMenuOpen } ="
);

code = code.replace(
  "setActiveTab, checkAccess, pickups, setEditPickupId } =",
  "setActiveTab, checkAccess, pickups, setEditPickupId, setIsMobileMenuOpen } ="
);

code = code.replace(
  "setActiveTab, checkAccess, containerBookings, setEditContainerBookingId } =",
  "setActiveTab, checkAccess, containerBookings, setEditContainerBookingId, setIsMobileMenuOpen } ="
);

code = code.replace(
  "setActiveTab, checkAccess, haulierBookings, setEditHaulierBookingId } =",
  "setActiveTab, checkAccess, haulierBookings, setEditHaulierBookingId, setIsMobileMenuOpen } ="
);

code = code.replace(
  "setActiveTab, checkAccess, manifests, setEditManifestId } =",
  "setActiveTab, checkAccess, manifests, setEditManifestId, setIsMobileMenuOpen } ="
);

code = code.replace(
  "setActiveTab, checkAccess, breakbulks, setEditBreakbulkId, showMessage, logActivity } =",
  "setActiveTab, checkAccess, breakbulks, setEditBreakbulkId, showMessage, logActivity, setIsMobileMenuOpen } ="
);

code = code.replace(
  "checkAccess, returns, setEditReturnId, setActiveTab, setPrintingReturnNote } =",
  "checkAccess, returns, setEditReturnId, setActiveTab, setPrintingReturnNote, setIsMobileMenuOpen } ="
);

code = code.replace(
  "checkAccess, vendorBills, setEditVendorBillId, setActiveTab } =",
  "checkAccess, vendorBills, setEditVendorBillId, setActiveTab, setIsMobileMenuOpen } ="
);

code = code.replace(
  "checkAccess, costRecovery, setEditCostRecoveryId, setActiveTab } =",
  "checkAccess, costRecovery, setEditCostRecoveryId, setActiveTab, setIsMobileMenuOpen } ="
);

code = code.replace(
  "setActiveTab, checkAccess, activityLogs } =",
  "setActiveTab, checkAccess, activityLogs, setIsMobileMenuOpen } ="
);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed setIsMobileMenuOpen');
