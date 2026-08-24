const { execSync } = require('child_process');

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
      const lines = stdout.split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
          const pid = parts[4];
          if (pid && pid !== '0') pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`[clean-port] Successfully killed old process ${pid} on port ${port}`);
        } catch (e) {
          // ignore
        }
      }
    } else {
      execSync(`fuser -k ${port}/tcp`);
    }
  } catch (e) {
    // Port was free
  }
}

console.log('[clean-port] Cleaning ports 3000, 3001, 3002...');
killPort(3000);
killPort(3001);
killPort(3002);
console.log('[clean-port] Ports cleared. Launching dev server on port 3000...');
