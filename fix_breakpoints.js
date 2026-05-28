import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Sidebar responsive breakpoints LG -> XL
content = content.replace(/z-40 lg:hidden/g, "z-40 xl:hidden");
content = content.replace(/z-50 lg:relative/g, "z-50 xl:relative");
content = content.replace(/} lg:translate-x-0/g, "} xl:translate-x-0");
content = content.replace(/className="lg:hidden absolute top-4/g, 'className="xl:hidden absolute top-4');
content = content.replace(/className="lg:hidden p-2 -ml-2/g, 'className="xl:hidden p-2 -ml-2');

fs.writeFileSync('src/App.tsx', content);
