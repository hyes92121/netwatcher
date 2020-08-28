const Redis = require("ioredis")
const redis = new Redis({
	port: 6379, 
	host: 'localhost',
	db: 0
})


redis.set("foo", "bar").then(response => console.log(response))
redis.get('foo').then(response => console.log(response))