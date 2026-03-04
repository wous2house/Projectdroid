import { execSync } from 'child_process';

// Disable auto-discovery of code signing certificates to prevent signtool errors
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

try {
  execSync('npx electron-builder', { stdio: 'inherit' });
} catch (error) {
  console.error('Electron builder failed:', error.message);
  process.exit(1);
}
