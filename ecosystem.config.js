module.exports = {
  apps: [
    {
      name: 'bot',
      script: 'npm',
      args: 'run bot:dev',
      watch: false, // PM2 ne surveille pas, `tsx` le fait déjà
      env: {
        NODE_ENV: 'development', // On utilise le mode dev
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
