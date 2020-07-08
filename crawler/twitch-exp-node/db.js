const config = require('./config.json')
const Influx = require('influx')
const db = new Influx.InfluxDB({ host: config.host.name, database: config.database.name })
db.getDatabaseNames()
	.then(names => {
    	  if (!names.includes(config.database.name)) {
 	   console.log('Database does not exist')
           return db.createDatabase(config.database.name);
    	  }
  })
  module.exports = { db }