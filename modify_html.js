import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const newFields = `
          <div className="md:col-span-2 lg:col-span-3 pt-4 mt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Shipment Condition</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="radio" name="conditionStatus" value="Good" checked={formData.conditionStatus === 'Good'} onChange={handleFormChange} className="text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700">Received in Good Condition</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" name="conditionStatus" value="Partial Defect/Damage" checked={formData.conditionStatus === 'Partial Defect/Damage'} onChange={handleFormChange} className="text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700">Defect/Damage (Partial)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" name="conditionStatus" value="Full Defect/Damage" checked={formData.conditionStatus === 'Full Defect/Damage'} onChange={handleFormChange} className="text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700">Defect/Damage (Full)</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Shipper DO Attachment (Image/PDF)</label>
                {formData.shipperDoAttachment ? (
                  <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50 rounded-md">
                    <span className="text-sm text-emerald-700 font-medium truncate flex-1">Shipper_DO_Attached</span>
                    <button type="button" onClick={() => setFormData(prev => ({...prev, shipperDoAttachment: ''}))} className="text-emerald-700 font-bold ml-4 hover:text-red-500">Remove</button>
                  </div>
                ) : (
                  <input type="file" accept="image/*,application/pdf" onChange={handleShipperDoAttachment} className="w-full p-2 border border-slate-300 rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Photos/Videos Attachments</label>
                <input type="file" multiple accept="image/*,video/*" onChange={handleOtherAttachments} className="w-full p-2 border border-slate-300 rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {formData.otherAttachments && formData.otherAttachments.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {formData.otherAttachments.map((att, i) => (
                      <div key={i} className="relative group rounded-md overflow-hidden border border-slate-200" style={{ height: '80px' }}>
                         {att.startsWith('data:video') ? (
                           <video src={att} className="w-full h-full object-cover" />
                         ) : (
                           <img src={att} alt="attachment" className="w-full h-full object-cover" />
                         )}
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <button type="button" onClick={() => removeOtherAttachment(i)} className="text-white text-xs bg-red-600 px-2 py-1 rounded">Remove</button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
`;

content = content.replace(
  '            <textarea rows="3" name="consigneeDeliveryAddress" value={formData.consigneeDeliveryAddress} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="Type a one-time delivery address or edit a selected one..."></textarea>\n          </div>',
  '            <textarea rows="3" name="consigneeDeliveryAddress" value={formData.consigneeDeliveryAddress} onChange={handleFormChange} className="w-full p-2 border border-slate-300 rounded-md" placeholder="Type a one-time delivery address or edit a selected one..."></textarea>\n          </div>\n' + newFields
);

fs.writeFileSync('src/App.tsx', content);
