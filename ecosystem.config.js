module.exports = {
  apps: [
    {
      name: "obs-media-share-v2",
      script: "./dashboard/start_gunicorn.sh",
      interpreter: "/bin/bash",
      watch: false,
      ignore_watch: ["node_modules", "logs"], // Exclude directories to watch
      autorestart: true, // Automatically restart if the app crashes
      max_restarts: 10, // Maximum number of restarts in case of an error
      restart_delay: 5000, // Delay between restarts (in milliseconds)
      min_uptime: 10000, // Minimum uptime before considering a restart (in milliseconds)
      max_memory_restart: "500M", // Restart if the app uses more than 500MB of memory
    }
  ]
};
