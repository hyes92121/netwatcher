/* eslint-disable brace-style */
/* eslint-disable space-infix-ops */
/* eslint-disable promise/param-names */
const Twitch = require('./Twitch.js')
const { getTopKChannelsByLanguage } = require('./Aggregator.js')

class ProbingManager {
  constructor(language) {
    this.language = language
    this.topKChannels = null
    this.liveProbes = {}
    this.cleanUpInactiveProbesTimer = null
    this.refreshTopKChannelsTimer = null

    this.setup()
  }

  setup() {
    this.cleanUpInactiveProbesTimer = setInterval(() => { this.cleanUpInactiveProbes() }, 1 * 60 * 1000)
    this.refreshTopKChannelsTimer = setInterval(() => { this.refreshTopKChannels() }, 2 * 60 * 1000)
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
    console.log('Refreshing top k channels...')
    const oldTopKChannels = new Set(Object.keys(this.liveProbes))
    getTopKChannelsByLanguage(this.language)
      .then(channels => {
        const newTopKChannels = new Set(channels)
        const toBeAdded = [...newTopKChannels].filter(x => !oldTopKChannels.has(x))
        const toBeDeleted = [...oldTopKChannels].filter(x => !newTopKChannels.has(x))
        console.log(`Adding ${toBeAdded}`)
        console.log(`Deleting ${toBeDeleted}`)

        for (const channel of toBeAdded) { this.liveProbes[channel] = new StreamProbe(channel) }
        for (const channel of toBeDeleted) { this.liveProbes[channel].clearProbingFunc() }
      })
  }

  cleanUpInactiveProbes() {
    console.log('Cleaning up inactive probes...')
    for (const [channel, probe] of Object.entries(this.liveProbes)) {
      if (!probe.isActive) { delete this.liveProbes[channel]; console.log(`Deleted ${channel} from probing list`) }
    }
    console.log(`Current number of live probes: ${Object.keys(this.liveProbes).length}`)
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
    if ([403, 404].includes(error.response.status)) { console.log(`${this.channel} is not online.`) }
    else { console.log(error.response) }
    this.clearProbingFunc()
  }

  clearProbingFunc() {
    clearTimeout(this.probingTimer)
    this.isActive = false
    console.log(`${this.channel} cleared.`)
  }

  randomNum() { return Math.random() * (this.max - this.min) + this.min }

  setTimerRange(min, max) { this.min = min; this.max = max }
}

module.exports = { ProbingManager, StreamProbe }
