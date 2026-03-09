module.exports = {
  apps: [
    {
      name: "backend",
      script: "dist/server.js",
      cwd: "/var/www/backend-buscador/code-back",
      watch: false,
      autorestart: true,

      env: {
        NODE_ENV: "production"
      },

      out_file: "/var/www/backend-buscador/logs/backend-out.log",
      error_file: "/var/www/backend-buscador/logs/backend-error.log",
      combine_logs: true,
      time: false,
      log_type: "raw"
    }
  ]
};

