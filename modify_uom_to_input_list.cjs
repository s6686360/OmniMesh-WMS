const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
let vendorBillTsx = fs.readFileSync('src/VendorBillView.tsx', 'utf8');

// 1. Force uppercase for UOM name in Master Data
appTsx = appTsx.replace(
  /\{activeMaster === 'uoms' && \(\s*<div className="md:col-span-2">\s*<label[^>]*>UoM Name[^<]*<span[^>]*>\*<\/span><\/label>\s*<input type="text" value=\{formData\.name \|\| ''\} onChange=\{\(e\) => updateForm\('name', e\.target\.value\)\}/g,
  `{activeMaster === 'uoms' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">UoM Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value.toUpperCase())}`
);

// 2. Add <datalist id="uom_list"> to App.tsx globally
const datalistString = `<datalist id="uom_list">
             {(uoms || []).map(u => {
               const properCase = u.name ? u.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase()).join(' ') : '';
               return <option key={u.id} value={u.name}>{properCase}</option>;
             })}
           </datalist>`;
if (!appTsx.includes('id="uom_list"')) {
   appTsx = appTsx.replace(/<div className={`flex h-\[100dvh\] w-full overflow-hidden \$\{getMainThemeClasses\(appTheme\.main\)\} font-sans text-slate-900 relative`}>/, 
     `<div className={\`flex h-[100dvh] w-full overflow-hidden \${getMainThemeClasses(appTheme.main)} font-sans text-slate-900 relative\`}>\n           ${datalistString}`);
}

// Replace select fields in App.tsx
appTsx = appTsx.replace(/<select value=\{line\.uom\} onChange=\{\(e\) => updateLine\(line\.id, 'uom', e\.target\.value\)\} className="([^"]+)">[\s\S]*?<\/select>/g, 
  `<input type="text" list="uom_list" value={line.uom || ''} onChange={(e) => updateLine(line.id, 'uom', e.target.value.toUpperCase())} className="$1" placeholder="UoM" />`);
appTsx = appTsx.replace(/<select value=\{line\.uom\} onChange=\{e => updateLine\(line\.id, 'uom', e\.target\.value\)\} className="([^"]+)">[\s\S]*?<\/select>/g, 
  `<input type="text" list="uom_list" value={line.uom || ''} onChange={(e) => updateLine(line.id, 'uom', e.target.value.toUpperCase())} className="$1" placeholder="UoM" />`);
appTsx = appTsx.replace(/<select value=\{p\.uom \|\| 'Carton'\} onChange=\{\(e\) => updateFclProduct\(idx, 'uom', e\.target\.value\)\} className="([^"]+)">[\s\S]*?<\/select>/g, 
  `<input type="text" list="uom_list" value={p.uom || ''} onChange={(e) => updateFclProduct(idx, 'uom', e.target.value.toUpperCase())} className="$1" placeholder="UoM" />`);

// Update VendorBillView.tsx
vendorBillTsx = vendorBillTsx.replace(/(const \{[^}]+)(checkAccess, )/g, "$1uoms, $2");
vendorBillTsx = vendorBillTsx.replace(/<select disabled=\{\!isEditable\} value=\{line\.uom \|\| 'UNIT'\} onChange=\{\(e\) => handleLineChange\(line\.id, 'uom', e\.target\.value\)\} className="([^"]+)">[\s\S]*?<\/select>/g, 
  `<input type="text" list="uom_list" disabled={!isEditable} value={line.uom || ''} onChange={(e) => handleLineChange(line.id, 'uom', e.target.value.toUpperCase())} className="$1" placeholder="UoM" />`);

// Inject uom_list in VendorBillView.tsx just in case
if (!vendorBillTsx.includes('id="uom_list"')) {
   vendorBillTsx = vendorBillTsx.replace(/return \(/, `return (\n    <>\n      <datalist id="uom_list">{(uoms || []).map((u: any) => <option key={u.id} value={u.name}>{u.name ? u.name.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase()).join(' ') : ''}</option>)}</datalist>`);
   vendorBillTsx = vendorBillTsx.replace(/<\/div>\n\s*$/g, "</div>\n    </>");
}

fs.writeFileSync('src/App.tsx', appTsx);
fs.writeFileSync('src/VendorBillView.tsx', vendorBillTsx);
console.log('Done');
