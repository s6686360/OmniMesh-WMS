const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// ContainerBookingForm
code = code.replace(
  "setActiveTab, ports, showMessage, containerTypes, generateBookingNo, setBookingCounter, bookingCounter, companies, logActivity",
  "setActiveTab, ports, showMessage, containerTypes, generateBookingNo, setBookingCounter, bookingCounter, companies, logActivity, setPrintingBookingForm"
);

const containerBookingButton = `<div className="flex justify-end space-x-3 pt-4">
        <button onClick={() => { setEditBookingId(null); setActiveTab('booking-list'); (window.closeMobileMenu ? window.closeMobileMenu() : null); }} className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition">Cancel</button>
        <button onClick={save} className="px-8 py-2 bg-sky-600 text-white rounded-lg flex items-center space-x-2 hover:bg-sky-700 transition shadow-sm font-medium"><Save className="w-5 h-5 mr-1" /> Save Booking</button>
      </div>`;

const newContainerBookingButton = `<div className="flex justify-between items-center pt-4">
        <div>
          {editBookingId && (
            <button onClick={() => setPrintingBookingForm(containerBookings.find(b => b.id === editBookingId))} className="flex items-center space-x-2 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
              <Printer className="w-5 h-5" /><span>Print Booking Form</span>
            </button>
          )}
        </div>
        <div className="flex space-x-3">
          <button onClick={() => { setEditBookingId(null); setActiveTab('booking-list'); (window.closeMobileMenu ? window.closeMobileMenu() : null); }} className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition">Cancel</button>
          <button onClick={save} className="px-8 py-2 bg-sky-600 text-white rounded-lg flex items-center space-x-2 hover:bg-sky-700 transition shadow-sm font-medium"><Save className="w-5 h-5 mr-1" /> Save Booking</button>
        </div>
      </div>`;

code = code.replace(containerBookingButton, newContainerBookingButton);

// We need to find the correct context variables for the other forms or just match the buttons.
fs.writeFileSync('src/App.tsx', code);
console.log('ContainerBooking fixed');
