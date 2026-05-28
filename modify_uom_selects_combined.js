import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The generic pattern I injected earlier:
// <select value={line.uom} ...>{(!uoms || uoms.length === 0) && <><option>Bundle...}{(uoms || []).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>

// Replace all those with a robust one that simply renders the default + new custom UOMs

// PickupForm Replacement
content = content.replace(
  /<select value=\{line\.uom\} onChange=\{\(e\) => updateLine\(line\.id, 'uom', e\.target\.value\)\} className="w-full p-1\.5 text-sm border rounded">\s*\{\(\!uoms \|\| uoms\.length === 0\) && <><option>Pallet<\/option><option>Carton<\/option><option>Box<\/option><option>Loose<\/option><option>Bundle<\/option><\/>\}\s*\{\(uoms \|\| \[\]\)\.map\(u => <option key=\{u\.id\} value=\{u\.name\}>\{u\.name\}<\/option>\)\}\s*<\/select>/g,
  `<select value={line.uom} onChange={(e) => updateLine(line.id, 'uom', e.target.value)} className="w-full p-1.5 text-sm border rounded">
     <option value="Pallet">Pallet</option><option value="Carton">Carton</option><option value="Box">Box</option><option value="Loose">Loose</option><option value="Bundle">Bundle</option>
     {(uoms || []).filter(u => !['Pallet','Carton','Box','Loose','Bundle'].includes(u.name)).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
   </select>`
);

// ReceiptForm Replacement
content = content.replace(
  /<select value=\{line\.uom\} onChange=\{\(e\) => updateLine\(line\.id, 'uom', e\.target\.value\)\} className="w-full p-1\.5 text-sm border rounded">\{\(\!uoms \|\| uoms\.length === 0\) && <><option>Bundle<\/option><option>Pallet<\/option><option>Carton<\/option><option>Box<\/option><option>Loose<\/option><\/>\}\{\(uoms \|\| \[\]\)\.map\(u => <option key=\{u\.id\} value=\{u\.name\}>\{u\.name\}<\/option>\)\}<\/select>/g,
  `<select value={line.uom} onChange={(e) => updateLine(line.id, 'uom', e.target.value)} className="w-full p-1.5 text-sm border rounded"><option value="Bundle">Bundle</option><option value="Pallet">Pallet</option><option value="Carton">Carton</option><option value="Box">Box</option><option value="Loose">Loose</option>{(uoms || []).filter(u => !['Bundle','Pallet','Carton','Box','Loose'].includes(u.name)).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>`
);

// ManifestForm FCL Replacement
content = content.replace(
  /<select value=\{p\.uom \|\| 'Carton'\} onChange=\{\(e\) => updateFclProduct\(idx, 'uom', e\.target\.value\)\} className="w-full p-2 border border-slate-300 rounded text-sm">\{\(\!uoms \|\| uoms\.length === 0\) && <><option>Carton<\/option><option>Pallet<\/option><option>Pieces<\/option><option>Bundle<\/option><option>Unit<\/option><\/>\}\{\(uoms \|\| \[\]\)\.map\(u => <option key=\{u\.id\} value=\{u\.name\}>\{u\.name\}<\/option>\)\}<\/select>/g,
  `<select value={p.uom || 'Carton'} onChange={(e) => updateFclProduct(idx, 'uom', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm"><option value="Carton">Carton</option><option value="Pallet">Pallet</option><option value="Pieces">Pieces</option><option value="Bundle">Bundle</option><option value="Unit">Unit</option>{(uoms || []).filter(u => !['Carton','Pallet','Pieces','Bundle','Unit'].includes(u.name)).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>`
);

// BreakbulkForm Replacement
content = content.replace(
  /<select value=\{line\.uom\} onChange=\{e => updateLine\(line\.id, 'uom', e\.target\.value\)\} className="w-full p-1\.5 border rounded">\{\(\!uoms \|\| uoms\.length === 0\) && <><option>Bundle<\/option><option>Pallet<\/option><option>Carton<\/option><option>Box<\/option><option>Loose<\/option><\/>\}\{\(uoms \|\| \[\]\)\.map\(u => <option key=\{u\.id\} value=\{u\.name\}>\{u\.name\}<\/option>\)\}<\/select>/g,
  `<select value={line.uom} onChange={e => updateLine(line.id, 'uom', e.target.value)} className="w-full p-1.5 border rounded"><option value="Bundle">Bundle</option><option value="Pallet">Pallet</option><option value="Carton">Carton</option><option value="Box">Box</option><option value="Loose">Loose</option>{(uoms || []).filter(u => !['Bundle','Pallet','Carton','Box','Loose'].includes(u.name)).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select>`
);

fs.writeFileSync('src/App.tsx', content);
