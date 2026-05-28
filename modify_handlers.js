import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const handlers = `
  const handleShipperDoAttachment = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, shipperDoAttachment: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleOtherAttachments = (e) => {
    const files = Array.from(e.target.files);
    
    Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.readAsDataURL(file);
      });
    })).then(results => {
      setFormData(prev => ({ ...prev, otherAttachments: [...(prev.otherAttachments || []), ...results] }));
    });
  };

  const removeOtherAttachment = (index) => {
    setFormData(prev => {
      const arr = [...(prev.otherAttachments || [])];
      arr.splice(index, 1);
      return { ...prev, otherAttachments: arr };
    });
  };
`;

content = content.replace(
  "const handleFormChange = (e) => {",
  handlers + "\n\n  const handleFormChange = (e) => {"
);

fs.writeFileSync('src/App.tsx', content);
