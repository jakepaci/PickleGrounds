/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'picklegrounds',
      script: 'dist/server/index.js',
      cwd: __dirname + '/..',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
