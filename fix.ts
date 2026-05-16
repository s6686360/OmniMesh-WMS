import fs from "fs";
const appFile = "./src/App.tsx";
let appContent = fs.readFileSync(appFile, "utf-8");
appContent = appContent.replace(/z-\[60\]/g, "z-50");
appContent = appContent.replace(/z-50 no-print/g, "z-40 no-print");
fs.writeFileSync(appFile, appContent);

const ciFile = "./src/PrintCommercialInvoiceOverlay.tsx";
let ciContent = fs.readFileSync(ciFile, "utf-8");
ciContent = ciContent.replace(/z-\[60\]/g, "z-50");
ciContent = ciContent.replace(/z-50 no-print/g, "z-40 no-print");
fs.writeFileSync(ciFile, ciContent);
console.log("Done");
