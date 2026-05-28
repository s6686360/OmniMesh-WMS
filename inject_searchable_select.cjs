const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add SearchableSelect component
const SearchableSelectComponent = `
const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", disabled = false, className = "w-full p-1.5 text-sm border rounded" }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const wrapperRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    (opt.label || '').toLowerCase().includes(search.toLowerCase()) || 
    (opt.value || '').toLowerCase().includes(search.toLowerCase())
  );

  const displayValue = options.find(opt => opt.value === value)?.label || value;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className={\`\${className} bg-white flex items-center justify-between cursor-pointer \${disabled ? 'opacity-50 cursor-not-allowed' : ''}\`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="truncate">{displayValue || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg" style={{ minWidth: '10rem' }}>
          <div className="p-1.5 border-b border-slate-100">
            <input 
              type="text" 
              className="w-full p-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-blue-400 uppercase"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-sm text-slate-500 text-center">No results found</div>
            ) : (
              filteredOptions.map((opt, i) => (
                <div 
                  key={i}
                  className={\`p-2 text-sm cursor-pointer hover:bg-blue-50 \${opt.value === value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'}\`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
`;

if (!appTsx.includes('const SearchableSelect =')) {
  // Insert right after the imports
  appTsx = appTsx.replace(/(import [^\n]+;\n)+/, (match) => match + '\n' + SearchableSelectComponent + '\n');
}

// 2. Remove the ugly datalist
appTsx = appTsx.replace(/<datalist id="uom_list">[\s\S]*?<\/datalist>/g, '');

// 3. Helper to generate options
const uomOptionsStr = `(uoms || []).map(u => ({ value: u.name, label: typeof u.name === 'string' ? u.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase()).join(' ') : '' }))`;

// 4. Replace <input type="text" list="uom_list" ...> with SearchableSelect
// Try matching the variations dynamically
appTsx = appTsx.replace(/<input type="text" list="uom_list" value=\{([^}]+)\} onChange=\{\(e\) => updateLine\(([^,]+),\s*'uom',\s*e\.target\.value\.toUpperCase\(\)\)\} className="([^"]+)" placeholder="UoM" \/>/g, 
  (match, p1, p2, p3) => `<SearchableSelect options={${uomOptionsStr}} value={${p1}} onChange={(val) => updateLine(${p2}, 'uom', val)} className="${p3}" placeholder="UoM" />`
);
appTsx = appTsx.replace(/<input type="text" list="uom_list" value=\{([^}]+)\} onChange=\{e => updateLine\(([^,]+),\s*'uom',\s*e\.target\.value\.toUpperCase\(\)\} className="([^"]+)" placeholder="UoM" \/>/g, 
  (match, p1, p2, p3) => `<SearchableSelect options={${uomOptionsStr}} value={${p1}} onChange={(val) => updateLine(${p2}, 'uom', val)} className="${p3}" placeholder="UoM" />`
);
appTsx = appTsx.replace(/<input type="text" list="uom_list" value=\{([^}]+)\} onChange=\{\(e\) => updateFclProduct\(([^,]+),\s*'uom',\s*e\.target\.value\.toUpperCase\(\)\)\} className="([^"]+)" placeholder="UoM" \/>/g, 
  (match, p1, p2, p3) => `<SearchableSelect options={${uomOptionsStr}} value={${p1}} onChange={(val) => updateFclProduct(${p2}, 'uom', val)} className="${p3}" placeholder="UoM" />`
);

fs.writeFileSync('src/App.tsx', appTsx);
console.log('App.tsx updated');

// Also update VendorBillView.tsx
let vendorTsx = fs.readFileSync('src/VendorBillView.tsx', 'utf8');
if (!vendorTsx.includes('const SearchableSelect =')) {
  vendorTsx = vendorTsx.replace(/(import [^\n]+;\n)+/, (match) => match + '\n' + SearchableSelectComponent + '\n');
}
vendorTsx = vendorTsx.replace(/<datalist id="uom_list">[\s\S]*?<\/datalist>/g, '');
vendorTsx = vendorTsx.replace(/<input type="text" list="uom_list" disabled={(\![^}]+)} value=\{([^}]+)\} onChange=\{\(e\) => handleLineChange\(([^,]+),\s*'uom',\s*e\.target\.value\.toUpperCase\(\)\)\} className="([^"]+)" placeholder="UoM" \/>/g, 
  (match, p1, p2, p3, p4) => `<SearchableSelect options={${uomOptionsStr}} disabled={${p1}} value={${p2}} onChange={(val) => handleLineChange(${p3}, 'uom', val)} className="${p4}" placeholder="UoM" />`
);
fs.writeFileSync('src/VendorBillView.tsx', vendorTsx);
console.log('VendorBillView.tsx updated');
