import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update save logic (line 1090)
content = content.replace(
  "if (activeMaster === 'locations' || activeMaster === 'miscChargeTypes') {",
  "if (activeMaster === 'locations' || activeMaster === 'miscChargeTypes' || activeMaster === 'uoms') {"
);

// 2. Add form UI
content = content.replace(
  "{activeMaster === 'miscChargeTypes' && (",
  "{activeMaster === 'uoms' && (\n              <div className=\"md:col-span-2\">\n                <label className=\"block text-sm font-medium text-slate-700 mb-1\">UoM Name <span className=\"text-red-500\">*</span></label>\n                <input type=\"text\" value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} className=\"w-full p-2 border border-slate-300 rounded-md\" placeholder=\"e.g. Pallet, Carton, KG\" />\n              </div>\n            )}\n\n            {activeMaster === 'miscChargeTypes' && ("
);

// 3. Add table column header
content = content.replace(
  "{activeMaster === 'csvExportTemplates' && <th className=\"p-3 text-sm font-semibold\">Integration Type / Columns</th>}",
  "{activeMaster === 'csvExportTemplates' && <th className=\"p-3 text-sm font-semibold\">Integration Type / Columns</th>}\n              {activeMaster === 'uoms' && <th className=\"p-3 text-sm font-semibold\">Standard Unit of Measure</th>}"
);

// 4. Update the item name rendering logic
content = content.replace(
  "(activeMaster === 'containerTypes' ? item.type : item.name)",
  "(activeMaster === 'containerTypes' ? item.type : item.name)"
); // actually it already falls back to item.name

// 5. Check if some other rendering rule is needed, it seems UOM is just name so no need for extra td in table rows. We'll simply let it render nothing extra if no specific activeMaster rule.
// Oh wait, does the header need a matching empty <td> or no?
// If we add a <th> we must add a <td>:
content = content.replace(
  "{activeMaster === 'csvExportTemplates' && (",
  "{activeMaster === 'uoms' && (\n                  <td className=\"p-3 text-sm text-slate-600\">\n                    UoM Definition\n                  </td>\n                )}\n                {activeMaster === 'csvExportTemplates' && ("
);

fs.writeFileSync('src/App.tsx', content);
