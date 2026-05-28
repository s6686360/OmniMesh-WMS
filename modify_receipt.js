import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// initial state in ReceiptForm
// there are two places: one is the `useState` and another is inside the `useEffect` when setting empty states.
content = content.replace(
  /sendingType: 'SEND IN', puNo: '', grnRemarks: ''/g,
  "sendingType: 'SEND IN', puNo: '', grnRemarks: '', shipperDoAttachment: '', otherAttachments: [], conditionStatus: 'Good'"
);

content = content.replace(
  "sendingType: r.sendingType || 'SEND IN',",
  "sendingType: r.sendingType || 'SEND IN',\n          conditionStatus: r.conditionStatus || 'Good',\n          shipperDoAttachment: r.shipperDoAttachment || '',\n          otherAttachments: r.otherAttachments || [],"
);

fs.writeFileSync('src/App.tsx', content);
