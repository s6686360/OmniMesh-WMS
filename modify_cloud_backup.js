import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const additionalStateAndFunctions = `
  const [cloudBackups, setCloudBackups] = useState([]);
  const [isCloudBackingUp, setIsCloudBackingUp] = useState(false);
  const [isCloudRestoring, setIsCloudRestoring] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => {
    return localStorage.getItem('omnimesh_auto_backup') === 'true';
  });

  const fetchCloudBackups = async () => {
    try {
      const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
      const q = query(collection(db, 'cloudBackups'), orderBy('timestamp', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      const backups = [];
      snapshot.forEach(doc => backups.push({ id: doc.id, ...doc.data() }));
      setCloudBackups(backups);
    } catch (e) {
      console.warn("Could not fetch cloud backups", e);
    }
  };

  useEffect(() => {
    fetchCloudBackups();
  }, []);

  useEffect(() => {
    localStorage.setItem('omnimesh_auto_backup', autoBackupEnabled.toString());
    
    // Auto backup every 1 hour if enabled
    let interval;
    if (autoBackupEnabled) {
      interval = setInterval(() => {
        handleCloudBackup("Auto Backup");
      }, 60 * 60 * 1000); 
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [autoBackupEnabled]);

  const handleCloudBackup = async (label = "Manual Backup") => {
    try {
      setIsCloudBackingUp(true);
      setBackupRestoreProgress(0);
      setBackupRestoreStatus('Initializing cloud backup...');
      
      const { collection, getDocs, doc, setDoc } = await import('firebase/firestore');
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
      
      setBackupRestoreStatus('Saving to cloud...');
      const backupId = \`backup_\${Date.now()}\`;
      const backupString = JSON.stringify({ timestamp: new Date().toISOString(), label, data: backupData });
      
      // We store it as a single chunk if small enough, but to be safe against firestore size limits, 
      // we'll try storing the stringified data in text chunks if it gets too big, or simply in one doc first.
      
      const chunks = backupString.match(/.{1,800000}/g) || [];
      await setDoc(doc(db, 'cloudBackups', backupId), {
        timestamp: new Date().toISOString(),
        label,
        chunks: chunks.length
      });
      
      for(let i=0; i<chunks.length; i++) {
         await setDoc(doc(db, \`cloudBackups/\${backupId}/chunks\`, \`chunk_\${i}\`), {
            data: chunks[i],
            index: i
         });
      }

      showMessage('Cloud Backup completed successfully.', 'success');
      fetchCloudBackups();
    } catch (error) {
      console.error(error);
      showMessage('Cloud Backup failed: ' + error.message, 'error');
    } finally {
      setIsCloudBackingUp(false);
      setBackupRestoreProgress(0);
      setBackupRestoreStatus('');
    }
  };

  const handleRestoreCloudBackup = async (backupId) => {
    if (!window.confirm('WARNING: Restoring a cloud backup will add/overwrite existing records with the data from the cloud backup. Are you sure you want to proceed?')) {
      return;
    }

    try {
      setIsCloudRestoring(true);
      setBackupRestoreProgress(0);
      setBackupRestoreStatus('Reading from cloud...');
      
      const { collection, getDocs, doc, setDoc } = await import('firebase/firestore');
      
      const chunksSnap = await getDocs(collection(db, \`cloudBackups/\${backupId}/chunks\`));
      const chunksData = [];
      chunksSnap.forEach(doc => chunksData.push(doc.data()));
      chunksData.sort((a,b) => a.index - b.index);
      
      const fullString = chunksData.map(c => c.data).join('');
      const parsed = JSON.parse(fullString);
      
      if (!parsed.data) {
        throw new Error('Invalid backup file format.');
      }
      const backupData = parsed.data;
      
      let completed = 0;
      const collectionsToRestore = Object.keys(backupData);
      
      for (const colName of collectionsToRestore) {
        setBackupRestoreStatus(\`Restoring \${colName}...\`);
        const docs = backupData[colName];
        for (const docData of docs) {
          const id = docData._id;
          const dataToSave = { ...docData };
          delete dataToSave._id;
          await setDoc(doc(db, colName, id), dataToSave, { merge: true });
        }
        completed++;
        setBackupRestoreProgress(Math.round((completed / collectionsToRestore.length) * 100));
      }
      
      showMessage('Cloud data restored successfully. You may need to refresh the page.', 'success');
    } catch (err) {
      console.error(err);
      showMessage('Restore failed: ' + err.message, 'error');
    } finally {
      setIsCloudRestoring(false);
      setBackupRestoreProgress(0);
      setBackupRestoreStatus('');
    }
  };
`;

const cloudBackupUI = `
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mt-8">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
            <Database className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-indigo-800">Cloud Data Backup & Restore</h3>
            <p className="text-indigo-700 mt-2 text-sm">
              Save your data directly to the cloud and restore from previous cloud backups. You can also enable automatic scheduled backups (runs while the app is active).
            </p>
            
            <div className="flex items-center space-x-3 mt-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={autoBackupEnabled} onChange={(e) => setAutoBackupEnabled(e.target.checked)} />
                <div className="w-11 h-6 bg-indigo-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-indigo-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <span className="text-sm font-medium text-indigo-800">Enable Auto-Backup (Every 1 Hour while app is open)</span>
            </div>

            <div className="mt-6 flex gap-4">
              <button 
                onClick={() => handleCloudBackup("Manual Cloud Backup")} 
                disabled={isCloudBackingUp || isCloudRestoring || isBackingUp || isRestoring}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors uppercase tracking-wider text-sm flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isCloudBackingUp ? 'Saving to Cloud...' : 'Create Cloud Backup Now'}</span>
              </button>
            </div>
            
            {(isCloudBackingUp || isCloudRestoring) && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-indigo-700 font-medium mb-1">
                  <span>{backupRestoreStatus}</span>
                  <span>{backupRestoreProgress}%</span>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: \`\${backupRestoreProgress}%\` }}></div>
                </div>
              </div>
            )}

            {cloudBackups.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold text-indigo-800 mb-3 text-sm uppercase">Recent Cloud Backups</h4>
                <div className="bg-white rounded-lg border border-indigo-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-indigo-50 text-indigo-800">
                      <tr>
                        <th className="px-4 py-3 border-b border-indigo-200">Date/Time</th>
                        <th className="px-4 py-3 border-b border-indigo-200">Label</th>
                        <th className="px-4 py-3 border-b border-indigo-200 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cloudBackups.map(backup => (
                        <tr key={backup.id} className="border-b border-indigo-100 last:border-0 hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-600">{new Date(backup.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-800 font-medium">{backup.label}</td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleRestoreCloudBackup(backup.id)}
                              disabled={isCloudBackingUp || isCloudRestoring || isBackingUp || isRestoring}
                              className="text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 flex items-center justify-end space-x-1"
                            >
                              <ArrowUpDown className="w-4 h-4" /> <span>Restore</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
`;

// Insert additional functions right after the original backupRestoreStatus line.
content = content.replace(
  'const backupCollectionsList = [',
  additionalStateAndFunctions + '\\n\\n  const backupCollectionsList = ['
);

// Insert cloud backup UI before the wiping UI
content = content.replace(
  '<div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-8">',
  cloudBackupUI + '\\n\\n      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-8">'
);

fs.writeFileSync('src/App.tsx', content);
