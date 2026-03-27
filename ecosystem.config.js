const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'apps/api/.env') });

module.exports = {
  apps: [
    {
      name: 'tactix-api',
      script: 'apps/api/dist/main.js',
      watch: false,
      out_file: '/root/.pm2/logs/tactix-api-out.log',
      error_file: '/root/.pm2/logs/tactix-api-error.log',
      merge_logs: true,
      env: {
        ...process.env,
        APP_MODE: 'api',
        PORT: 5500,
      },
    },
    {
      name: 'tactix-worker',
      script: 'apps/api/dist/main.js',
      watch: false,
      out_file: '/root/.pm2/logs/tactix-worker-out.log',
      error_file: '/root/.pm2/logs/tactix-worker-error.log',
      merge_logs: true,
      env: {
        ...process.env,
        APP_MODE: 'worker',
      },
    },
  ],
};
