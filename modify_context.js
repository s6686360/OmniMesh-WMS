import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Inject uoms, into PickupForm context
content = content.replace(
  "setPrintingPickupNote, logActivity, pushNotificationToRelatedUsers\n  } = React.useContext(AppContext);",
  "setPrintingPickupNote, logActivity, pushNotificationToRelatedUsers, uoms\n  } = React.useContext(AppContext);"
);

// Inject uoms, into WarehouseReceiptForm context (line 4208)
content = content.replace(
  "setPrintingReceipt, setPrintingA4Receipt, getActiveInventory, logActivity, pushNotificationToRelatedUsers, currentUser\n  } = React.useContext(AppContext);",
  "setPrintingReceipt, setPrintingA4Receipt, getActiveInventory, logActivity, pushNotificationToRelatedUsers, currentUser, uoms\n  } = React.useContext(AppContext);"
);

// Inject uoms, into ContainerBookingModule context (line 4969 starts approx)
content = content.replace(
  "companies, ports, containerTypes, receipts, getActiveInventory, manifestCounter,\n    setManifestCounter, generateManifestNo, setActiveTab,\n    setPrintingPackingList, showMessage, logActivity, pushNotificationToRelatedUsers\n  } = React.useContext(AppContext);",
  "companies, ports, containerTypes, receipts, getActiveInventory, manifestCounter,\n    setManifestCounter, generateManifestNo, setActiveTab,\n    setPrintingPackingList, showMessage, logActivity, pushNotificationToRelatedUsers, uoms\n  } = React.useContext(AppContext);"
);

// Inject uoms, into ReturnEntryModule context (line 6837 starts approx)
content = content.replace(
  "receipts, setReceipts, returns, setReturns, returnCounter, setReturnCounter, generateReturnNo,\n    setActiveTab, checkAccess, showMessage, logActivity, pushNotificationToRelatedUsers\n  } = React.useContext(AppContext);",
  "receipts, setReceipts, returns, setReturns, returnCounter, setReturnCounter, generateReturnNo,\n    setActiveTab, checkAccess, showMessage, logActivity, pushNotificationToRelatedUsers, uoms\n  } = React.useContext(AppContext);"
);

fs.writeFileSync('src/App.tsx', content);
