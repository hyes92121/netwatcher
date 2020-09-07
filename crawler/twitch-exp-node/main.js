/* eslint-disable brace-style */
/* eslint-disable space-infix-ops */
/* eslint-disable promise/param-names */
const Twitch = require('./Twitch.js')
const Pen = require('./Pen.js')
const { getTopKChannelsByLanguage } = require('./Aggregator.js')

const main = async () => {
  const pool = new ProbingPool('zh')
  await new Promise(r => setTimeout(r, 10*60*1000))
  pool.stop()
}

class ProbingPool {
  constructor(language) {
    this.language = language
    this.topKChannels = null
    this.liveProbes = {}
    this.cleanUpInactiveProbesTimer = null
    this.refreshTopKChannelsTimer = null
    this.cleanupInterval = 1 // minutes
    this.refreshInterval = 2 // minutes
    this.isActive = true

    this.setup()
  }

  setup() {
    this.cleanUpInactiveProbesTimer = setInterval(() => { this.cleanUpInactiveProbes() }, this.cleanupInterval*60*1000)
    this.refreshTopKChannelsTimer = setInterval(() => { this.refreshTopKChannels() }, this.refreshInterval*60*1000)
    this.start()
  }

  async start() {
    getTopKChannelsByLanguage(this.language)
      .then(async channels => {
        let initStatus = true
        for (const channel of channels) {
          if (initStatus) { await new Promise(r => setTimeout(r, 2000)); initStatus = false } // wait for cache to initialize
          else { await new Promise(r => setTimeout(r, 500)) } // prevent sending burst of requests
          this.liveProbes[channel] = new StreamProbe(channel)
        }
      })
  }

  async refreshTopKChannels() {
    Pen.write('Refreshing top k channels...', 'blue')
    // console.log('Refreshing top k channels...')
    const oldTopKChannels = new Set(Object.keys(this.liveProbes))
    getTopKChannelsByLanguage(this.language)
      .then(channels => {
        const newTopKChannels = new Set(channels)
        const toBeAdded = [...newTopKChannels].filter(x => !oldTopKChannels.has(x))
        const toBeDeleted = [...oldTopKChannels].filter(x => !newTopKChannels.has(x))
        if (toBeAdded.length) { Pen.write(`Adding ${toBeAdded}`, 'blue') }
        if (toBeDeleted.length) { Pen.write(`Clearing ${toBeDeleted}`, 'blue') }

        for (const channel of toBeAdded) { 
          if (this.isActive) this.liveProbes[channel] = new StreamProbe(channel)
        }
        for (const channel of toBeDeleted) {
          if (channel in this.liveProbes) this.liveProbes[channel].clearProbingFunc()
        }
      })
  }

  cleanUpInactiveProbes() {
    Pen.write('Cleaning up inactive probes...', 'magenta')
    for (const [channel, probe] of Object.entries(this.liveProbes)) {
      if (!probe.isActive) { delete this.liveProbes[channel]; Pen.write(`Deleted ${channel} from probing list`, 'magenta') }
    }
    Pen.write(`Current number of live probes: ${Object.keys(this.liveProbes).length}`, 'magenta')
  }

  stop() {
    clearInterval(this.cleanUpInactiveProbesTimer)
    clearInterval(this.refreshTopKChannelsTimer)
    while (Object.keys(this.liveProbes).length !== 0) {
      for (const [_, probe] of Object.entries(this.liveProbes)) { probe.clearProbingFunc() }
      this.cleanUpInactiveProbes()
    }
  }
}

class StreamProbe {
  constructor(channel) {
    this.channel = channel
    // TODO: Load channel specific info from cache instead of function accessing cache directly
    this.id = null
    this.token = null
    this.probingTimer = null
    this.max = 1 // minutes
    this.min = 5 // minutes
    this.isActive = true
    this.serverPool = []

    this.setup()
  }

  setup() {
    Twitch.lookupStream(this.channel)
      .then(response => { this.id = response.channelId; this.token = response.accessToken })
      .then(() => { this.start() })
  }

  start() {
    Twitch.getEdgeAddrByChannel(this.channel)
      .then(addr => { console.log(`Edge server of ${this.channel} is ${addr}`); this.setProbingFunc() })
      .catch(error => { this.handleError(error) })
  }

  setProbingFunc() {
    this.probingTimer = setTimeout(() => {
      Twitch.getEdgeAddrByChannel(this.channel)
        .then(addr => { console.log(`Edge server of ${this.channel} is ${addr}`) })
        .then(() => { this.setProbingFunc() })
        .catch(error => { this.handleError(error) })
    }, this.randomNum() * 60 * 1000)
  }

  handleError(error) {
    try {
      if ([403, 404].includes(error.response.status)) Pen.write(`${this.channel} is not online.`, 'red')
      else console.log(error.response)
    } catch (err) { console.log(error); console.log(err) }
    this.clearProbingFunc()
  }

  clearProbingFunc() {
    clearTimeout(this.probingTimer)
    this.isActive = false
    Pen.write(`${this.channel} cleared.`, 'red')
  }

  randomNum() { return Math.random() * (this.max - this.min) + this.min }

  setTimerRange(min, max) { this.min = min; this.max = max }
}

main()
