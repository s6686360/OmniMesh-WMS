import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// For grids that were 1 -> 2 -> 3 or something similar, let's make sure they are friendly for tablets
// In Dashboard metrics:
content = content.replace(/className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pb-6 border-b border-slate-100"/g, 'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 pb-6 border-b border-slate-100"');
content = content.replace(/className="grid grid-cols-1 md:grid-cols-3 gap-6"/g, 'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"');
content = content.replace(/className="grid grid-cols-1 md:grid-cols-4 gap-4"/g, 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"');
content = content.replace(/className="grid grid-cols-1 md:grid-cols-4 gap-3"/g, 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"');
content = content.replace(/className="grid grid-cols-2 md:grid-cols-4 gap-3"/g, 'className="grid grid-cols-2 lg:grid-cols-4 gap-3"');
content = content.replace(/className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"/g, 'className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"');

fs.writeFileSync('src/App.tsx', content);
