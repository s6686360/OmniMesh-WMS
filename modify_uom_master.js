import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state variable
content = content.replace(
  'const [miscChargeTypes, setMiscChargeTypes] = useState([]);',
  'const [miscChargeTypes, setMiscChargeTypes] = useState([]);\n  const [uoms, setUoms] = useState([]);'
);

// 2. Add to context value provider
content = content.replace(
  'miscChargeTypes, setMiscChargeTypes,',
  'miscChargeTypes, setMiscChargeTypes, uoms, setUoms,'
);

// 3. Add to useContext in MasterMaintenance
content = content.replace(
  'masterTariffs, setMasterTariffs, locations, setLocations, miscChargeTypes, setMiscChargeTypes\n  } = React.useContext(AppContext);',
  'masterTariffs, setMasterTariffs, locations, setLocations, miscChargeTypes, setMiscChargeTypes, uoms, setUoms\n  } = React.useContext(AppContext);'
);

// 4. Add to Operational Collections
content = content.replace(
  "{ path: 'notifications', setter: setNotifications }",
  "{ path: 'notifications', setter: setNotifications },\n      { path: 'uoms', setter: setUoms }"
);

// 5. Add to Backup collections
content = content.replace(
  "'locations', 'miscChargeTypes', 'system'",
  "'locations', 'miscChargeTypes', 'system', 'uoms'"
);

// 6. Add to masterCategories
content = content.replace(
  "{ id: 'containerTypes', name: 'Container Types' }\n      ]\n    },",
  "{ id: 'containerTypes', name: 'Container Types' },\n        { id: 'uoms', name: 'Unit of Measure (UoM)' }\n      ]\n    },"
);

fs.writeFileSync('src/App.tsx', content);
