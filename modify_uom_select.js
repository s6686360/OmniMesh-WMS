import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Line 3974 area: PickupForm
content = content.replace(
  /<select value=\{line\.uom\} onChange=\{\(e\) => updateLine\(line\.id, 'uom', e\.target\.value\)\} className="w-full p-1\.5 text-sm border rounded">\s*<option value="Pallet">Pallet<\/option><option value="Carton">Carton<\/option><option value="Box">Box<\/option><option value="Loose">Loose<\/option>\s*<\/select>/g,
  `<select value={line.uom} onChange={(e) => updateLine(line.id, 'uom', e.target.value)} className="w-full p-1.5 text-sm border rounded">
     {(!uoms || uoms.length === 0) && <><option>Pallet</option><option>Carton</option><option>Box</option><option>Loose</option><option>Bundle</option></>}
     {(uoms || []).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
   </select>`
);

// Line 4671 area: WarehouseReceiptForm
content = content.replace(
  /<select value=\{line\.uom\} onChange=\{\(e\) => updateLine\(line\.id, 'uom', e\.target\.value\)\} className="w-full p-1\.5 text-sm border rounded"><option>Bundle<\/option><option>Pallet<\/option><option>Carton<\/option><option>Box<\/option><option>Loose<\/option><\/select>/g,
  `<select value={line.uom} onChange={(e) => updateLine(line.id, 'uom', e.target.value)} className="w-full p-1.5 text-sm border rounded">{(!uoms || uoms.length === 0) && <><option>Bundle</option><option>Pallet</option><option>Carton</option><option>Box</option><option>Loose</option></>}{(uoms || []).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>`
);

// Line 5651 area: ContainerBookingModule FCL
content = content.replace(
  /<select value=\{p\.uom \|\| 'Carton'\} onChange=\{\(e\) => updateFclProduct\(idx, 'uom', e\.target\.value\)\} className="w-full p-2 border border-slate-300 rounded text-sm">\s*<option>Pallet<\/option>\s*<option>Carton<\/option>\s*<option>Box<\/option>\s*<option>Loose<\/option>\s*<\/select>/g,
  `<select value={p.uom || 'Carton'} onChange={(e) => updateFclProduct(idx, 'uom', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm">{(!uoms || uoms.length === 0) && <><option>Pallet</option><option>Carton</option><option>Box</option><option>Loose</option></>}{(uoms || []).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>`
);

// Line 7284 area: ReturnEntryModule (actually a sub component or similar?)
content = content.replace(
  /<select value=\{line\.uom\} onChange=\{e => updateLine\(line\.id, 'uom', e\.target\.value\)\} className="w-full p-1\.5 border rounded"><option>Bundle<\/option><option>Pallet<\/option><option>Carton<\/option><option>Box<\/option><option>Loose<\/option><\/select>/g,
  `<select value={line.uom} onChange={e => updateLine(line.id, 'uom', e.target.value)} className="w-full p-1.5 border rounded">{(!uoms || uoms.length === 0) && <><option>Bundle</option><option>Pallet</option><option>Carton</option><option>Box</option><option>Loose</option></>}{(uoms || []).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>`
);

fs.writeFileSync('src/App.tsx', content);
