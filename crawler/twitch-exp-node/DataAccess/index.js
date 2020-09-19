const mongodb = require('mongodb')
const makeTransactionDb = require('./transaction-db.js')
const MongoClient = mongodb.MongoClient
const url = "mongodb://mongo_test:27017"
const dbName = "Twitch"
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true })

export async function makeDb () {
    if (!client.isConnected()) {
      await client.connect()
      await client.db("admin").command({ ping: 1 })
      console.log("Connected successfully to server")
    }
    return client.db(dbName)
}

const userDb = makeUserDb({makeDb})

