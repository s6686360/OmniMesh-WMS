import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The replacement should be done specifically on the onClick handlers of nav buttons
content = content.replace(/onClick=\{\(\) => setActiveTab\('([^']+)'\)\}/g, "onClick={() => { setActiveTab('$1'); setIsMobileMenuOpen(false); }}");

content = content.replace(/onClick=\{\(\) => \{ ([^}]+) setActiveTab\('([^']+)'\); \}\}/g, "onClick={() => { $1 setActiveTab('$2'); setIsMobileMenuOpen(false); }}");

fs.writeFileSync('src/App.tsx', content);
