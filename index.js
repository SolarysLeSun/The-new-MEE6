// le index.js sert a faire les commandes entra-REPL
const { spawn } = require('child_process');

function runCommand(name, command, args = [], env = {}) {
  const proc = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });

  proc.on('close', (code) => {
    console.log(`🔚 ${name} terminé avec le code ${code}`);
  });

  proc.on('error', (err) => {
    console.error(`❌ Erreur dans ${name} : ${err.message}`);
  });
}

// Lancer npm run prod avec PORT=25872
//runCommand('Dev', 'git', ['clone', 'https://github.com/softpython2884/The-new-MEE6']);
// runCommand ('Rebuild', 'npm', ['rebuild', 'better-sqlite3'])
// Lancer npm run bot:dev
 runCommand('Bot', 'npm', ['run', 'bot:dev']);
 runCommand('Bot', 'npm', ['run', 'build']);