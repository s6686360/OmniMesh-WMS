import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/z-40 lg:hidden/g, "z-40 md:hidden");
content = content.replace(/z-50 lg:relative/g, "z-50 md:relative");
content = content.replace(/} lg:translate-x-0/g, "} md:translate-x-0");
content = content.replace(/className="lg:hidden absolute top-4/g, 'className="md:hidden absolute top-4');
content = content.replace(/className="lg:hidden p-2 -ml-2/g, 'className="md:hidden p-2 -ml-2');

fs.writeFileSync('src/App.tsx', content);
