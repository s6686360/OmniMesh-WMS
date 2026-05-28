import React, { useState } from 'react';
import { Palette, ChevronDown, Check } from 'lucide-react';
import { AppContext } from './App';

export const ThemePicker = () => {
  const { appTheme, updateAppTheme } = React.useContext(AppContext);
  const [open, setOpen] = useState(false);

  const sidebarThemes = [
    { id: 'dark', name: 'Dark Slate' },
    { id: 'light', name: 'Clean White' },
    { id: 'blue', name: 'Deep Blue' }
  ];

  const mainThemes = [
    { id: 'slate', name: 'Light Gray' },
    { id: 'white', name: 'Pure White' },
    { id: 'zinc', name: 'Zinc' },
    { id: 'stone', name: 'Warm Stone' }
  ];

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-1 text-sm text-slate-600 hover:text-indigo-600 transition-colors bg-slate-100 hover:bg-slate-200 px-2 md:px-3 py-1.5 rounded-full border border-slate-200"
      >
        <Palette className="w-4 h-4 md:mr-1" />
        <span className="hidden md:inline">Theme</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-100 font-semibold text-xs text-slate-500 uppercase tracking-wider">
              Sidebar Theme
            </div>
            <div className="p-2 space-y-1">
              {sidebarThemes.map(t => (
                <button 
                  key={t.id}
                  onClick={() => { updateAppTheme('sidebar', t.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded flex justify-between items-center ${appTheme.sidebar === t.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  {t.name}
                  {appTheme.sidebar === t.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
            
            <div className="p-3 bg-slate-50 border-y border-slate-100 font-semibold text-xs text-slate-500 uppercase tracking-wider">
              Main Background
            </div>
            <div className="p-2 space-y-1">
              {mainThemes.map(t => (
                <button 
                  key={t.id}
                  onClick={() => { updateAppTheme('main', t.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded flex justify-between items-center ${appTheme.main === t.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  {t.name}
                  {appTheme.main === t.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
