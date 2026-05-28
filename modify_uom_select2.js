import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Line 5665 area: ContainerBookingModule FCL
content = content.replace(
  /<select value=\{p\.uom \|\| 'Carton'\} onChange=\{\(e\) => updateFclProduct\(idx, 'uom', e\.target\.value\)\} className="w-full p-2 border border-slate-300 rounded text-sm">\s*<option>Carton<\/option><option>Pallet<\/option><option>Pieces<\/option><option>Bundle<\/option><option>Unit<\/option>\s*<\/select>/g,
  `<select value={p.uom || 'Carton'} onChange={(e) => updateFclProduct(idx, 'uom', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm">{(!uoms || uoms.length === 0) && <><option>Carton</option><option>Pallet</option><option>Pieces</option><option>Bundle</option><option>Unit</option></>}{(uoms || []).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>`
);

fs.writeFileSync('src/App.tsx', content);
