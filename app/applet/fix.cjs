const fs = require('fs');
const glob = require('glob');

function fixFiles(files) {
    for (const file of files) {
        let code = fs.readFileSync(file, 'utf8');
        let newCode = code;

        // Change a4-page to letter size
        newCode = newCode.replace(/w-\[210mm\]/g, "w-[8.5in]");
        newCode = newCode.replace(/width: '210mm'/g, "width: '8.5in'");
        newCode = newCode.replace(/minHeight: '297mm'/g, "minHeight: '11in'");

        // Fix max-w-full to allow exact sizing in print view on mobile
        // wait, we should just remove max-w-full on print overlays so it doesn't shrink on mobile
        newCode = newCode.replace(/w-\[8.5in\] max-w-full/g, "w-[8.5in] print-w-exact");

        // We also want to strip `sm:`, `md:`, `lg:` only from within print overlays.
        // It's safest to do it on a block-by-block basis. We can look for `<div id="a4-print-area"` or `<div id="print-area"`
        
        let inPrintArea = false;
        let lines = newCode.split('\n');
        let openDivs = 0;
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            if (line.includes('id="a4-print-area"') || line.includes('id="print-area"')) {
                inPrintArea = true;
                openDivs = 0;
            }
            
            if (inPrintArea) {
                // Count divs to know when we exit (simplistic, just counting <div and </div is risky with single lines, let's just do a regex replace on the line)
                // A better approach is to just remove sm:, md:, lg: prefixes on the line.
                lines[i] = lines[i].replace(/\bsm:([a-zA-Z0-9_-]+)/g, "$1")
                                   .replace(/\bmd:([a-zA-Z0-9_-]+)/g, "$1")
                                   .replace(/\blg:([a-zA-Z0-9_-]+)/g, "$1")
                                   .replace(/\bxl:([a-zA-Z0-9_-]+)/g, "$1");
                                   
                // To track block: count opening and closing tags in the line roughly.
                // Or maybe just stop when we see `</div>` that matches the open div?
                // Actually it's easier to just do it for everything between `id="a4-print-area"` and the end of the Overlay component.
            }
            
            // If we are at the end of the overlay component `};`
            if (inPrintArea && (line.match(/^};\s*$/) || line.includes('const Print'))) {
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
