import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// replace md: with lg: for sidebar drawer classes
content = content.replace(/z-40 md:hidden/g, "z-40 lg:hidden");
content = content.replace(/z-50 md:relative/g, "z-50 lg:relative");
content = content.replace(/} md:translate-x-0/g, "} lg:translate-x-0");
content = content.replace(/className="md:hidden absolute top-4/g, 'className="lg:hidden absolute top-4');
content = content.replace(/className="md:hidden p-2 -ml-2/g, 'className="lg:hidden p-2 -ml-2');

fs.writeFileSync('src/App.tsx', content);
