import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting TheAgencyIQ Development Server...');

// Try to start the proper TypeScript server
const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

serverProcess.on('error', (err) => {
  console.error('❌ Failed to start TypeScript server:', err.message);
  console.log('🔄 Falling back to backup server...');
  
  // Fallback to the working backup server
  const backupProcess = spawn('node', ['app.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  backupProcess.on('error', (err) => {
    console.error('❌ Backup server also failed:', err.message);
  });
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log(`⚠️  Server exited with code ${code}, restarting...`);
    setTimeout(() => {
      // Restart the server
      console.log('🔄 Restarting server...');
      import('./dev-server.js');
    }, 2000);
  }
});

console.log('✅ Development server started');