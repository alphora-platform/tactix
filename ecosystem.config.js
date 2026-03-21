const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'apps/api/.env') });

module.exports = {
  apps: [
    {
      name: 'tactix-api',
      script: 'apps/api/dist/main.js',
      watch: false,
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
      env: {
        ...process.env,
        APP_MODE: 'worker',
      },
    },
  ],
};
