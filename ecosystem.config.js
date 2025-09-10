module.exports = {
  apps: [{
    name: 'eo-clinica-hostinger',
    script: 'npx tsx src/index-hostinger.ts',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    // Logs
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Performance
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512',
    
    // Monitoring
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      '.git',
      'frontend/node_modules',
      'frontend/.next',
      'frontend/out'
    ],
    
    // Restart strategy
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Advanced options
    kill_timeout: 5000,
    listen_timeout: 5000,
    
    // Health monitoring
    health_check_url: 'http://localhost:3000/health',
    health_check_grace_period: 3000
  }]
};