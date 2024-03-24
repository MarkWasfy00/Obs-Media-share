module.exports = {
  apps: [
    {
      name: "obs-media-share",
      script: "dashboard/main.py", // Or the name of your main Python script
      interpreter: "python",
      interpreter_args: "-u", // Add -u to run Python in unbuffered mode
      watch: true,
      ignore_watch: ["node_modules", "logs"], // Exclude directories to watch
    }
  ]
};
