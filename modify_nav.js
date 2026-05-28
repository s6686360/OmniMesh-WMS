import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/setActiveTab\('([^']+)'\)/g, "setActiveTab('$1'); setIsMobileMenuOpen(false);");

fs.writeFileSync('src/App.tsx', content);
