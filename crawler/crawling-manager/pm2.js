var pm2 = require('pm2');

pm2.connect(function(err) {
  if (err) {
    console.error(err);
    process.exit(2);
  }
  
  pm2.start({
    name : "Twitch-Crawler",
    script    : './twitch-exp-node/main.js',         // Script to be run
    exec_mode : 'cluster',        // Allows your app to be clustered
    instances : 4,                // Optional: Scales your app by 4
    max_memory_restart : '450M',   // Optional: Restarts your app if it reaches 100Mo
    cron : "0 */4 * * *",
    watch : true,
    node_args: "--inspect --experimental-worker"
  }, function(err, apps) {
    pm2.disconnect();   // Disconnects from PM2
    if (err) throw err
  });
});