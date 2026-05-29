const fs = require('fs');

function fixFiles(files) {
    for (const file of files) {
        if (!fs.existsSync(file)) continue;
        let code = fs.readFileSync(file, 'utf8');
        let newCode = code;

        // Change a4-page to letter size
        newCode = newCode.replace(/w-\[210mm\]/g, "w-[8.5in]");
        newCode = newCode.replace(/width: '210mm'/g, "width: '8.5in'");
        newCode = newCode.replace(/minHeight: '297mm'/g, "minHeight: '11in'");

        let inPrintArea = false;
        let lines = newCode.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            if (line.includes('id="a4-print-area"') || line.includes('id="print-area"')) {
                inPrintArea = true;
            }
            
            if (inPrintArea) {
                lines[i] = lines[i].replace(/\bsm:([a-zA-Z0-9_-]+)/g, "$1")
                                   .replace(/\bmd:([a-zA-Z0-9_-]+)/g, "$1")
                                   .replace(/\blg:([a-zA-Z0-9_-]+)/g, "$1")
                                   .replace(/\bxl:([a-zA-Z0-9_-]+)/g, "$1");
            }
            
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

fixFiles(['src/App.tsx', 'src/PrintCommercialInvoiceOverlay.tsx']);
