const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/<div id="a4-print-area" className="w-\[8.5in\] max-w-full/g, '<div id="a4-print-area" className="w-[8.5in] origin-top md:scale-100 max-w-none');
fs.writeFileSync('src/App.tsx', code, 'utf8');

let report = fs.readFileSync('src/ReportModule.tsx', 'utf8');
report = report.replace(/min-h-\[400px\]/g, 'min-h-[400px] w-[8.5in] max-w-none');
fs.writeFileSync('src/ReportModule.tsx', report, 'utf8');
