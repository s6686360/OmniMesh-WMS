const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Rewrite handleShipperDoAttachment
const newHandler = `  const handleShipperDoAttachment = (e) => {
    const files = Array.from(e.target.files);
    Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.readAsDataURL(file);
      });
    })).then(results => {
      setFormData(prev => {
        let existing = [];
        if (Array.isArray(prev.shipperDoAttachment)) {
          existing = prev.shipperDoAttachment;
        } else if (typeof prev.shipperDoAttachment === 'string' && prev.shipperDoAttachment.trim() !== '') {
          existing = [prev.shipperDoAttachment];
        }
        return { ...prev, shipperDoAttachment: [...existing, ...results] };
      });
    });
  };

  const removeShipperDoAttachment = (index) => {
    setFormData(prev => {
      let existing = [];
      if (Array.isArray(prev.shipperDoAttachment)) {
        existing = prev.shipperDoAttachment;
      } else if (typeof prev.shipperDoAttachment === 'string' && prev.shipperDoAttachment.trim() !== '') {
        existing = [prev.shipperDoAttachment];
      }
      const arr = [...existing];
      arr.splice(index, 1);
      return { ...prev, shipperDoAttachment: arr.length > 0 ? arr : '' };
    });
  };`;

appTsx = appTsx.replace(
  /const handleShipperDoAttachment = \(e\) => {[\s\S]*?reader\.readAsDataURL\(file\);\s*\};/g,
  newHandler
);

// 2. Rewrite the Shipper DO Attachment rendering
const oldUI = `                {formData.shipperDoAttachment ? (
                  <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50 rounded-md">
                    <span className="text-sm text-emerald-700 font-medium truncate flex-1">Shipper_DO_Attached</span>
                    <button type="button" onClick={() => setFormData(prev => ({...prev, shipperDoAttachment: ''}))} className="text-emerald-700 font-bold ml-4 hover:text-red-500">Remove</button>
                  </div>
                ) : (
                  <input type="file" accept="image/*,application/pdf" onChange={handleShipperDoAttachment} className="w-full p-2 border border-slate-300 rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                )}`;

const checkIsArrayStr = `Array.isArray(formData.shipperDoAttachment)`;

const newUI = `                <input type="file" multiple accept="image/*,application/pdf" onChange={handleShipperDoAttachment} className="w-full p-2 border border-slate-300 rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {formData.shipperDoAttachment && (Array.isArray(formData.shipperDoAttachment) ? formData.shipperDoAttachment.length > 0 : formData.shipperDoAttachment !== '') && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(Array.isArray(formData.shipperDoAttachment) ? formData.shipperDoAttachment : [formData.shipperDoAttachment]).map((att, i) => (
                      <div key={i} className="relative group rounded-md overflow-hidden border border-slate-200" style={{ height: '80px' }}>
                         {att.startsWith('data:application/pdf') ? (
                           <div className="flex items-center justify-center w-full h-full bg-slate-100 text-slate-500 font-bold text-xs">PDF FILE</div>
                         ) : (
                           <img src={att} alt="attachment" className="w-full h-full object-cover" />
                         )}
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <button type="button" onClick={() => removeShipperDoAttachment(i)} className="text-white text-xs bg-red-600 px-2 py-1 rounded">Remove</button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}`;

appTsx = appTsx.replace(oldUI, newUI);

fs.writeFileSync('src/App.tsx', appTsx);
console.log('Done!');
