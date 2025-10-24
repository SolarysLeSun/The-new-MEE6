module.exports = {
  apps: [
    {
      name: 'bot',
      script: 'npm',
      args: 'run bot:dev',
      watch: false,
      exec_mode: 'cluster',
      instances: 'max',
    },
    {
      name: 'panel',
      script: 'npm',
      args: 'run start',
    },
    {
      name: 'watchdog',
      script: 'npm',
      args: 'run watchdog',
      watch: false,
    }
  ],
};

    