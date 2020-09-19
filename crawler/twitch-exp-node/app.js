const express = require('express')
const assert = require('assert');
const AssertionError = require('assert').AssertionError;
const ProbingPool = require('./Probe.js')
const API = require('./Api.js')

const app = express()
const port = 3000

const pool = new ProbingPool('zh')

app.get('/api/info/liveprobes', (req, res) => {
    res.send({ liveProbes: pool.getLiveProbes() })
})

app.get('/api/count', (req, res) => {
    res.send({ requestCount: API.getRequestCount() })
})

app.post('/api/pool/stop', (req, res) => {
    try {
        assert(pool.isActive)
        pool.stop()
    } catch(e) {
        if (e instanceof AssertionError) { res.send({ status: false, msg: 'pool already stopped'}) }
    }
    res.send({ status: true, msg: 'probingPool stopped' })
})

app.listen(port, () => {
    console.log(`ProbingPool listening at http://localhost:${port}`)
})
