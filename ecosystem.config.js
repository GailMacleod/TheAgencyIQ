module.exports = {
  apps: [
    {
      name: 'theagencyiq',
      script: 'server/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader tsx',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};