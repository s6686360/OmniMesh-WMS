import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/\\n\\n  const backupCollectionsList = \[/, '\n\n  const backupCollectionsList = [');
content = content.replace(/\\n\\n      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-8">/g, '\n\n      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-8">');

fs.writeFileSync('src/App.tsx', content);
