const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
c = c.replace(/<style>\{`[\s\S]*?`\}<\/style>/g, '');
fs.writeFileSync('src/App.tsx', c);
