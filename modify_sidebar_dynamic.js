import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Insert theme helpers
const themeHelpers = `
  const getSidebarThemeClasses = (theme) => {
    if (theme === 'light') return { bg: 'bg-white', text: 'text-slate-700', active: 'bg-blue-600 text-white', hover: 'hover:bg-slate-100 hover:text-blue-600', border: 'border-slate-200' };
    if (theme === 'blue') return { bg: 'bg-blue-900', text: 'text-blue-100', active: 'bg-blue-600 text-white', hover: 'hover:bg-blue-800 hover:text-white', border: 'border-blue-800' };
    return { bg: 'bg-slate-900', text: 'text-slate-300', active: 'bg-indigo-600 text-white', hover: 'hover:bg-slate-800 hover:text-white', border: 'border-slate-800' };
  };
  const getMainThemeClasses = (theme) => {
    if (theme === 'white') return 'bg-white';
    if (theme === 'zinc') return 'bg-zinc-50';
    if (theme === 'stone') return 'bg-stone-50';
    return 'bg-slate-50';
  };
`;

content = content.replace(/const contextValue = \{/g, themeHelpers + '\n  const contextValue = {');

// Modify return JSX wrapper to use dynamic main theme
content = content.replace(/<div className="flex h-screen bg-slate-50 font-sans text-slate-900 relative">/g, 
  '<div className={`flex h-screen ${getMainThemeClasses(appTheme.main)} font-sans text-slate-900 relative`}>');

// Modify sidebar background to use dynamic sidebar theme
// Previously: className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white text-slate-700 flex flex-col...
content = content.replace(/<div className=\{`\$\{isSidebarCollapsed \? 'w-20' : 'w-64'\} bg-white text-slate-700 flex flex-col overflow-y-auto no-print shadow-xl main-app-container transition-all duration-300`\}>/g,
  '<div className={`\$\{isSidebarCollapsed ? \'w-20\' : \'w-64\'} ${getSidebarThemeClasses(appTheme.sidebar).bg} ${getSidebarThemeClasses(appTheme.sidebar).text} flex flex-col overflow-y-auto no-print shadow-xl main-app-container transition-all duration-300`}>');

// Modify sidebar header
content = content.replace(/<div className=\{`p-6 sticky top-0 bg-white z-10 border-b border-slate-200 flex items-center justify-between`\}>/g,
  '<div className={`p-6 sticky top-0 ${getSidebarThemeClasses(appTheme.sidebar).bg} z-10 border-b ${getSidebarThemeClasses(appTheme.sidebar).border} flex items-center justify-between`}>');

// Apply hover and active styles dynamically for all nav buttons 
// E.g. ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 hover:text-indigo-600'}
content = content.replace(/\$\{activeTab === '([^']+)' \? 'bg-[^']+' : 'hover:bg-[^']+'\}/g, (match, tab) => {
  return `\$\{activeTab === '${tab}' ? getSidebarThemeClasses(appTheme.sidebar).active : getSidebarThemeClasses(appTheme.sidebar).hover}`;
});
// also fix ${activeGroup === ... for modules
content = content.replace(/\$\{activeTab === '([^']+)' \? 'bg-[^']+' : 'hover:bg-slate-100 hover:text-blue-600'\}/g, (match, tab) => {
  return `\$\{activeTab === '${tab}' ? getSidebarThemeClasses(appTheme.sidebar).active : getSidebarThemeClasses(appTheme.sidebar).hover}`;
});

fs.writeFileSync('src/App.tsx', content);
console.log('Script completed');
