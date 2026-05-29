const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/setIsMobileMenuOpen\(false\)/g, "(window.closeMobileMenu ? window.closeMobileMenu() : null)");
code = code.replace(/setIsMobileMenuOpen\(true\)/g, "(window.openMobileMenu ? window.openMobileMenu() : null)");

const originalHook = "const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);";
const mappedHook = `const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  React.useEffect(() => {
    window.closeMobileMenu = () => setIsMobileMenuOpen(false);
    window.openMobileMenu = () => setIsMobileMenuOpen(true);
  }, []);`;
  
code = code.replace(originalHook, mappedHook);

fs.writeFileSync('src/App.tsx', code);
