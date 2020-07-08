const config = require('./config.json')
const Influx = require('influx')
const db = new Influx.InfluxDB({ host: config.host.name, database: config.database.name })
const stream_db = new Influx.InfluxDB({ host: config.host.name, database: 'stream_edge_history' })

db.getDatabaseNames()
	.then(names => {
    	  if (!names.includes(config.database.name)) {
 	   console.log('Database does not exist')
           return db.createDatabase(config.database.name);
    	  }
  })

stream_db.getDatabaseNames()
	.then(names => {
    	  if (!names.includes('stream_edge_history')) {
 	   console.log('Database does not exist')
           return db.createDatabase('stream_edge_history');
    	  }
  })
  module.exports = { db, stream_db }