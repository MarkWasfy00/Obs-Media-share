module.exports = {
  apps: [
    {
      name: "obs-media-share-v2",
      script: "dashboard/wsgi.py", // Or the name of your main Python script
      interpreter: "python3",
      interpreter_args: "-u", // Add -u to run Python in unbuffered mode
      watch: false,
      ignore_watch: ["node_modules", "logs"], // Exclude directories to watch
    }
  ]
};
