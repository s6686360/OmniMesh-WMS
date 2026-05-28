import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace sidebar dark mode classes within the sidebar markup
// Our sidebar has className bg-slate-900 text-slate-300
content = content.replace(/bg-slate-900 text-slate-300/g, 'bg-white text-slate-700');
content = content.replace(/bg-slate-900 z-10/g, 'bg-white z-10');
content = content.replace(/border-slate-800/g, 'border-slate-200');
content = content.replace(/text-white tracking-tight/g, 'text-slate-800 tracking-tight');
content = content.replace(/hover:bg-slate-800 hover:text-white/g, 'hover:bg-slate-100 hover:text-indigo-600');
content = content.replace(/bg-slate-800 text-white/g, 'bg-slate-100 text-indigo-600'); // Check for active state if any

fs.writeFileSync('src/App.tsx', content);
