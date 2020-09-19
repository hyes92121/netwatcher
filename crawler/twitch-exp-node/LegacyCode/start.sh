pm2 start main.js --watch --cron "0 */4 * * *" --max-memory-restart 450M  --node-args="--inspect --experimental-worker"
