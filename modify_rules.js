import fs from 'fs';

let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  "match /containerTypes/{id} { allow read: if true; allow write: if isSignedIn(); }",
  "match /containerTypes/{id} { allow read: if true; allow write: if isSignedIn(); }\n    match /uoms/{id} { allow read, write: if isSignedIn(); }"
);

fs.writeFileSync('firestore.rules', content);
