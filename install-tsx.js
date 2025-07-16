import { execSync } from 'child_process';

try {
  console.log('Installing tsx...');
  execSync('npm install tsx --save-dev', { stdio: 'inherit' });
  console.log('tsx installed successfully');
} catch (error) {
  console.error('Failed to install tsx:', error.message);
  process.exit(1);
}