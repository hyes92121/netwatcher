const express = require('express')
// const readLastLines = require('read-last-lines')
const assert = require('assert')
const AssertionError = require('assert').AssertionError
const ProbingPool = require('./Probe.js')
const API = require('./Api.js')
const { logBuffer } = require('./Pen.js')

const app = express()
const port = 3000
const languages = process.env.LANGUAGE.split(',')
const percentages = process.env.PERCENTAGES.split(',')
const poolParams = languages.map((e, i) => {
  return [e, percentages[i]]
})
const pools = []
poolParams.forEach((poolParam) => pools.push(new ProbingPool(poolParam[0], poolParam[1])))
// const pool = new ProbingPool(process.env.LANGUAGE)

// app.get('/api/info/liveprobes', (req, res) => {
//   res.send({ liveProbes: pools.reduce((accumulator, currentPool) => accumulator + currentPool.getLiveProbes()) })
//   // res.send({ liveProbes: pool.getLiveProbes() })
// })

// app.get('/api/count', (req, res) => {
//   res.send({ requestCount: API.getRequestCount() })
// })
app.get('/api/status', (req, res) => {
  // readLastLines.read('log.txt', 20).then((lines) => {
  //   res.send({
  //     requestCount: API.getRequestCount(),
  //     liveProbes: pools.reduce((accumulator, currentPool) => accumulator + currentPool.getLiveProbes(), 0),
  //     latestLogs: lines
  //   })
  // }).catch(err => console.log(err))
  res.send({
    requestCount: API.getRequestCount(),
    liveProbes: pools.reduce((accumulator, currentPool) => accumulator.concat(currentPool.getLiveProbes()), []),
    // liveProbes: pools[0].getLiveProbes(),
    latestLogs: logBuffer
  })
})

app.post('/api/pool/start', (req, res) => {
  pools.forEach(pool => pool.run())
  // pool.run()
  res.send({ status: true, msg: 'Probing pool started' })
})

app.post('/api/pool/stop', (req, res) => {
  try {
    pools.forEach(pool => {
      assert(pool.isActive)
      pool.stop()
    })
  } catch (e) {
    if (e instanceof AssertionError) { res.send({ status: false, msg: 'pool already stopped' }) }
  }
  res.send({ status: true, msg: 'probingPool stopped' })
})

app.listen(port, () => {
  console.log(`ProbingPool listening at http://localhost:${port}`)
})
