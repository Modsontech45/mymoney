import fs from 'fs';
import path from 'path';

const logDir = path.join(__dirname, '../logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, 'app.log');

// Helper to write logs to file
const writeLog = (level: string, message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} [${level}] ${message}\n`;
  fs.appendFileSync(logFile, logMessage, { encoding: 'utf8' });
};

// Logger
export const logger = {
  startup: (message: string) => {
    console.log(`🚀 ${message}`);
    writeLog('STARTUP', message);
  },
  success: (message: string) => {
    console.log(`✅ ${message}`);
    writeLog('SUCCESS', message);
  },
  process: (message: string) => {
    console.log(`🔄 ${message}`);
    writeLog('PROCESS', message);
  },
  error: (message: string) => {
    console.error(`❌ ${message}`);
    writeLog('ERROR', message);
  },
  warning: (message: string) => {
    console.warn(`⚠️  ${message}`);
    writeLog('WARNING', message);
  },
  info: (message: string) => {
    console.log(`ℹ️  ${message}`);
    writeLog('INFO', message);
  },
  dev: (message: string) => {
    console.log(`🔧 ${message}`);
    writeLog('DEV', message);
  },
  heart: (message: string) => {
    console.log(`❤️  ${message}`);
    writeLog('HEART', message);
  },
  docs: (message: string) => {
    console.log(`📚 ${message}`);
    writeLog('DOCS', message);
  },
  world: (message: string) => {
    console.log(`🌍 ${message}`);
    writeLog('WORLD', message);
  },
  key: (message: string) => {
    console.log(`🔑 ${message}`);
    writeLog('KEY', message);
  },
  list: (message: string) => {
    console.log(`   ${message}`);
    writeLog('LIST', message);
  },
  boom: (message: string) => {
    console.error(`💥 ${message}`);
    writeLog('BOOM', message);
  },
};
