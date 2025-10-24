module.exports = {
  apps: [
    {
      name: 'bot',
      script: 'npm',
      args: 'run bot:dev',
      watch: false,
      exec_mode: 'cluster',
      instances: 'max', // Utilise tous les cœurs disponibles
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'panel',
      script: 'npm',
      args: 'run start', // Lance le serveur Next.js en production
      env: {
        NODE_ENV: 'production',
      }
    }
  ],
};
