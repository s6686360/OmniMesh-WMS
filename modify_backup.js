import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const backupRestoreCode = `
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <Database className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-blue-800">Data Backup & Restore</h3>
            <p className="text-blue-700 mt-2 text-sm">
              Create a manual backup of all operational and master data. You can download the backup as a JSON file and restore it later if needed. Note that restoring will overwrite records with the same IDs.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-6">
              <button 
                onClick={handleBackupData} 
                disabled={isBackingUp || isRestoring}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors uppercase tracking-wider text-sm flex items-center space-x-2 disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                <span>{isBackingUp ? 'Exporting...' : 'Export Backup'}</span>
              </button>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleRestoreData}
                  disabled={isBackingUp || isRestoring}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <button 
                  disabled={isBackingUp || isRestoring}
                  className="px-6 py-2.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 font-bold rounded-lg shadow-sm transition-colors uppercase tracking-wider text-sm flex items-center space-x-2 disabled:opacity-50"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span>{isRestoring ? 'Restoring...' : 'Import Backup'}</span>
                </button>
              </div>
            </div>
            {(isBackingUp || isRestoring) && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-blue-700 font-medium mb-1">
                  <span>{backupRestoreStatus}</span>
                  <span>{backupRestoreProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: \`\${backupRestoreProgress}%\` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
`;

content = content.replace(
  '<div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-8">',
  backupRestoreCode + '\n\n      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-8">'
);

const stateAndFunctions = `
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupRestoreProgress, setBackupRestoreProgress] = useState(0);
  const [backupRestoreStatus, setBackupRestoreStatus] = useState('');

  const backupCollectionsList = [
    'receipts', 'returns', 'pickups', 'manifests', 'warehouses', 
    'containerTypes', 'fclTemplates', 'containerBookings', 'haulierBookings', 
    'commercialInvoices', 'breakbulks', 'activityLogs', 'notifications',
    'companies', 'ports', 'currencies', 'glCodes', 'services', 'csvExportTemplates',
    'storageEntries', 'storageZones', 'storageRates', 'vendorBills',
    'costRecoveries', 'masterTariffs', 'locations', 'miscChargeTypes', 'system'
  ];

  const handleBackupData = async () => {
    try {
      setIsBackingUp(true);
      setBackupRestoreProgress(0);
      setBackupRestoreStatus('Initializing backup...');
      
      const { collection, getDocs } = await import('firebase/firestore');
      const backupData = {};
      
      let completed = 0;
      for (const colName of backupCollectionsList) {
        setBackupRestoreStatus(\`Exporting \${colName}...\`);
        const querySnapshot = await getDocs(collection(db, colName));
        const docs = [];
        querySnapshot.forEach(doc => {
          docs.push({ _id: doc.id, ...doc.data() });
        });
        backupData[colName] = docs;
        
        completed++;
        setBackupRestoreProgress(Math.round((completed / backupCollectionsList.length) * 100));
      }
      
      setBackupRestoreStatus('Creating JSON file...');
      const backupString = JSON.stringify({ timestamp: new Date().toISOString(), data: backupData }, null, 2);
      const blob = new Blob([backupString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`omnimesh_backup_\${new Date().toISOString().replace(/[:.]/g, '-')}.json\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showMessage('Backup downloaded successfully.', 'success');
    } catch (error) {
      console.error(error);
      showMessage('Backup failed: ' + error.message, 'error');
    } finally {
      setIsBackingUp(false);
      setBackupRestoreProgress(0);
      setBackupRestoreStatus('');
    }
  };

  const handleRestoreData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!window.confirm('WARNING: Restoring a backup will add/overwrite existing records with the data from the backup file. Are you sure you want to proceed?')) {
      e.target.value = '';
      return;
    }

    try {
      setIsRestoring(true);
      setBackupRestoreProgress(0);
      setBackupRestoreStatus('Reading backup file...');
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!parsed.data) {
            throw new Error('Invalid backup file format.');
          }
          const backupData = parsed.data;
          
          const { collection, doc, setDoc } = await import('firebase/firestore');
          
          let completed = 0;
          const collectionsToRestore = Object.keys(backupData);
          
          for (const colName of collectionsToRestore) {
            setBackupRestoreStatus(\`Restoring \${colName}...\`);
            const docs = backupData[colName];
            for (const docData of docs) {
              const id = docData._id;
              const dataToSave = { ...docData };
              delete dataToSave._id; // Remove the artificial _id property
              await setDoc(doc(db, colName, id), dataToSave, { merge: true });
            }
            completed++;
            setBackupRestoreProgress(Math.round((completed / collectionsToRestore.length) * 100));
          }
          
          showMessage('Data restored successfully. You may need to refresh the page to see all changes.', 'success');
        } catch (err) {
          console.error(err);
          showMessage('Restore failed: ' + err.message, 'error');
        } finally {
          setIsRestoring(false);
          setBackupRestoreProgress(0);
          setBackupRestoreStatus('');
          // Clear file input
          e.target.value = '';
        }
      };
      reader.readAsText(file);
      
    } catch (error) {
      console.error(error);
      showMessage('Restore initialization failed: ' + error.message, 'error');
      setIsRestoring(false);
      setBackupRestoreProgress(0);
      setBackupRestoreStatus('');
      e.target.value = '';
    }
  };
`;

content = content.replace(
  'const handleWipeData = async () => {',
  stateAndFunctions + '\n\n  const handleWipeData = async () => {'
);

fs.writeFileSync('src/App.tsx', content);
