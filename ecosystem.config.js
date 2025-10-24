module.exports = {
  apps: [
    {
      name: 'bot',
      script: 'dist/bot/main.js',
      instances: 'max', // Lance une instance par cœur de CPU disponible
      exec_mode: 'cluster', // Active le mode cluster pour la haute disponibilité
      watch: false, // PM2 ne surveille pas les fichiers, on relance manuellement après une mise à jour
      max_memory_restart: '1G', // Redémarre si une instance dépasse 1 Go de RAM
      env: {
        NODE_ENV: 'production',
      },
    },
    // Vous pouvez ajouter d'autres applications ici si nécessaire, par exemple le panel web.
    // {
    //   name: 'panel',
    //   script: 'npm',
    //   args: 'run start',
    //   env: {
    //     NODE_ENV: 'production',
    //   }
    // }
  ],
};
