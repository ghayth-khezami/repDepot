/** PM2 config for VPS: run `pnpm build` first, then `pm2 start ecosystem.config.cjs` */
module.exports = {
  apps: [
    {
      name: "bebedepot-web",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
    },
  ],
};
