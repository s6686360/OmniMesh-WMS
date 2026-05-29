const fs = require('fs');

function fixFiles(files) {
    for (const file of files) {
        if (!fs.existsSync(file)) continue;
        let code = fs.readFileSync(file, 'utf8');
        let newCode = code;
        
        let inPrintArea = false;
        let lines = newCode.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            if (line.includes('id="a4-print-area"') || line.includes('id="print-area"') || line.includes('id="report-print-area"')) {
                inPrintArea = true;
            }
            
            if (inPrintArea) {
                // Remove backgrounds
                lines[i] = lines[i].replace(/\bbg-slate-50\/50\b/g, 'bg-white')
                                   .replace(/\bbg-slate-50\b/g, 'bg-white')
                                   .replace(/\bbg-slate-100\b/g, 'bg-white')
                                   .replace(/\bbg-slate-200\b/g, 'bg-white')
                                   .replace(/\bbg-gray-50\b/g, 'bg-white')
                                   .replace(/\bbg-gray-100\b/g, 'bg-white');
                
                // Change text colors to darker or black for dot matrix readability
                lines[i] = lines[i].replace(/\btext-slate-400\b/g, 'text-black')
                                   .replace(/\btext-slate-500\b/g, 'text-black')
                                   .replace(/\btext-slate-600\b/g, 'text-black')
                                   .replace(/\btext-slate-700\b/g, 'text-black')
                                   .replace(/\btext-slate-800\b/g, 'text-black')
                                   .replace(/\btext-gray-500\b/g, 'text-black');
            }
            
            // Check for end of component or overlay
            // Actually, we are just in the file, it's safer to just let it apply until the end of the Overlay
            if (inPrintArea && (line.match(/^};\s*$/) || (line.includes('const ') && line.includes('Overlay = ')))) {
                inPrintArea = false;
            }
        }
        
        newCode = lines.join('\n');
        
        if (newCode !== code) {
            fs.writeFileSync(file, newCode, 'utf8');
            console.log(`Updated ${file}`);
        }
    }
}

fixFiles(['src/App.tsx', 'src/PrintCommercialInvoiceOverlay.tsx', 'src/ReportModule.tsx']);
