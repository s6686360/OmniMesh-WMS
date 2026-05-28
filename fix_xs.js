import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/xs:block/g, 'sm:block');

fs.writeFileSync('src/App.tsx', content);
