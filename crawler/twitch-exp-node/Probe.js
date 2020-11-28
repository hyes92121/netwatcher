/* eslint-disable brace-style */
/* eslint-disable space-infix-ops */
/* eslint-disable promise/param-names */
const Twitch = require('./Twitch.js')
const controllerApi = require('./Utils/controllerApi')
const { Pen } = require('./Pen.js')
const { getTopKChannelsByLanguage } = require('./Aggregator.js')
const { transactionDb } = require('./DataAccess/index.js')
const intervalGenerator = require("./Utils/intervalGenerator.js")

class ProbingPool {
  constructor(language, percentage = 0.8) {
    /* Constant properties. Shouldn't change since object initialization till deletion */
    this.language = language
    this.percentage = percentage
    this.isActive = true

    /* Variables that change across the probing period */
    // TODO: let timer interval to be settable by api
    this.liveProbes = {}
    this.cleanupInterval = 5 // minutes
    this.refreshInterval = 20 // minutes

    /* Timers */
    this.cleanUpInactiveProbesTimer = null
    this.refreshTopKChannelsTimer = null

    /* Network related variables */
    this.networkErrorProbes = 0
    this.refreshFailCount = 0
  }

  setup() {
    /* Cleanup inactive probes can run more frequently, but refreshing topK should be settable */
    this.cleanUpInactiveProbesTimer = setInterval(() => { this.cleanUpInactiveProbes() }, this.cleanupInterval * 60 * 1000)
    this.refreshTopKChannelsTimer = setInterval(() => { this.refreshTopKChannels() }, this.refreshInterval * 60 * 1000)
    this.start()
  }

  run() { this.setup() }

  async start() {
    getTopKChannelsByLanguage(this.language, this.percentage)
      .then(async channels => {
        let initStatus = true
        for (const channel of channels) {
          if (initStatus) { await new Promise(r => setTimeout(r, 2000)); initStatus = false } // wait for cache to initialize
          else { await new Promise(r => setTimeout(r, 500)) } // prevent sending burst of requests
          this.liveProbes[channel] = new StreamProbe(channel, this.language)
        }
      })
  }

  async refreshTopKChannels() {
    Pen.write('Refreshing top k channels...', 'blue')
    const oldTopKChannels = new Set(Object.keys(this.liveProbes))
    getTopKChannelsByLanguage(this.language, this.percentage)
      .then(channels => {
        const newTopKChannels = new Set(channels)
        const toBeAdded = [...newTopKChannels].filter(x => !oldTopKChannels.has(x))
        const toBeDeleted = [...oldTopKChannels].filter(x => !newTopKChannels.has(x))
        if (toBeAdded.length) { Pen.write(`Adding ${toBeAdded}`, 'blue') }
        if (toBeDeleted.length) { Pen.write(`Clearing ${toBeDeleted}`, 'blue') }

        for (const channel of toBeAdded) {
          if (this.isActive) { this.liveProbes[channel] = new StreamProbe(channel, this.language) }
        }
        for (const channel of toBeDeleted) {
          if (channel in this.liveProbes) this.liveProbes[channel].clearProbingFunc()
        }
      })
      .catch((error) => {
        this.refreshFailCount += 1
        Pen.write(`${error.message}. Retry getting all channels. Refresh failed ${this.refreshFailCount} times`, 'red')
        if (this.refreshFailCount > 3) {
          controllerApi.reportError(3)
          Pen.write('Reported error to controller')
        }
      })
  }

  cleanUpInactiveProbes() {
    Pen.write('Cleaning up inactive probes...', 'magenta')
    for (const [channel, probe] of Object.entries(this.liveProbes)) {
      if (!probe.isActive) {
        if (!probe.networkIsUp) {
          this.networkErrorProbes += 1
          Pen.write(`Prober "${probe.channel} cannot connect to the Internet."`, 'red')
        }
        delete this.liveProbes[channel]
        Pen.write(`Deleted ${channel} from probing list`, 'magenta')
      }
    }
    if (this.networkErrorProbes > 15) {
      this.stop()
      Pen.write(`VPN connection ${process.env.CONNECT} is down. Reporting incident to controller...`, 'red')
      // TODO: report incident to controller and output log file
      /*
       * axios.post({CONTROLLER_CONTAINER_ID}/${APIRoot}/error/{THIS_CONTAINER_ID})
       */
      controllerApi.reportError(3)
    } else { Pen.write(`Current number of live probes: ${Object.keys(this.liveProbes).length}`, 'magenta') }
  }

  async stop() {
    clearInterval(this.cleanUpInactiveProbesTimer)
    clearInterval(this.refreshTopKChannelsTimer)
    while (Object.keys(this.liveProbes).length !== 0) {
      // eslint-disable-next-line no-unused-vars
      for (const [_, probe] of Object.entries(this.liveProbes)) { probe.clearProbingFunc(); await new Promise(r => setTimeout(r, 300)) }
      this.cleanUpInactiveProbes()
    }
    this.isActive = false
  }

  // information reporting methods
  getLiveProbes() { return Object.keys(this.liveProbes) }
}

class StreamProbe {
  constructor(channel, language) {
    this.channel = channel
    this.language = language
    // TODO: Load channel specific info from cache instead of function accessing cache directly
    this.id = null
    this.token = null
    this.probingTimer = null
    this.createdTimestamp = this.getCurrentTimeString()
    this.max = 5 // minutes
    this.min = 1 // minutes
    this.isActive = true
    this.serverPool = {}
    this.transactionBuffer = {}
    // modes: 'random', 'backoff-strict', 'exp-backoff'
    this.intervalGenerator = new intervalGenerator('backoff-strict' ,this.max, this.min)

    // network connection related variables
    this.networkErrorCount = 0
    this.networkIsUp = true

    this.setup()
  }

  setup() {
    Twitch.lookupStream(this.channel)
      .then(response => { this.id = response.channelId; this.token = response.accessToken })
      .then(() => { this.start() })
  }

  start() {
    Twitch.getEdgeAddrByChannel(this.channel)
      .then(addr => { this.onAddressHit(addr) })
      .then(() => { this.setProbingFunc() })
      .catch(error => { this.handleError(error) })
  }

  setProbingFunc() {
    this.probingTimer = setTimeout(() => {
      Twitch.getEdgeAddrByChannel(this.channel)
        .then(addr => { this.onAddressHit(addr) })
        .then(() => { this.setProbingFunc() })
        .catch(error => { this.handleError(error) })
    }, this.intervalGenerator.generateInterval() * 60 * 1000)
  }

  onAddressHit(addr) {
    Pen.write(`Edge server of ${this.channel}(${this.language}) is ${addr}`, 'white')
    if (Object.prototype.hasOwnProperty.call(this.serverPool, addr)) {
      this.serverPool[addr] += 1
      // TODO: write transaction to DB
    } else {
      this.serverPool[addr] += 1
    }
    this.intervalGenerator.updateServerCount(Object.keys(this.serverPool).length)
    this.transactionBuffer[this.getCurrentTimeString()] = addr
  }

  async handleError(error) {
    try {
      const errorStatus = error.response.status
      const errorMessage = error.response.data[0].error
      const errorCode = error.response.data[0].error_code
      const outputErrorMsg = `Channel: "${this.channel}" returned status "${errorStatus}" with error code "${errorCode}" and message "${errorMessage}"`

      Pen.write(outputErrorMsg, 'red')

      switch (errorStatus) {
        /* 404: page not found, meaning channel is offline */
        case 404:
          this.clearProbingFunc()
          break

        /* 403: forbidden, currently I've identified two cases:
          - content_geoblocked (e.g. franchiseglobalart )
          - nauth_token_expired
        */
        case 403:
          // use switch case instead of if/else in case there are other kinds of errors in the future
          switch (errorCode) {
            case 'content_geoblocked':
              this.clearProbingFunc()
              break
            case 'nauth_token_expired':
              clearTimeout(this.probingTimer)
              Pen.write(`Updating token for channel ${this.channel}`, 'yellow')
              Twitch.updateChannelToken(this.channel)
                .then((token) => {
                  this.token = token
                  Pen.write(`Restarting probing for channel ${this.channel}`, 'yellow')
                  this.start()
                }) // restart probing with new token
              break
          }
          break

        default:
          // TODO: some logic to handle other errors (e.g. server errors)
          this.clearProbingFunc()
      }
    } catch (error) {
      /* This happens when the error is undefined, which usually means that Nord is changing servers
          and there is a temporary network disconnection
       */
      this.networkErrorCount += 1
      if (this.networkErrorCount > 10) {
        this.networkIsUp = false
        this.clearProbingFunc()
      } else {
        Pen.write(`Nord is probally changing its servers. Probe for ${this.channel} temporarily sleeping for 60 seconds...`, 'red')
        clearTimeout(this.probingTimer)
        await new Promise(r => setTimeout(r, 60 * 1000))
        this.start()
      }
    }
  }

  clearProbingFunc() {
    const serverList = Object.keys(this.serverPool)

    clearTimeout(this.probingTimer)
    this.isActive = false
    if (serverList.length > 0) { this.writeTransaction() }

    Pen.write(`${this.channel} cleared. All probed addresses: ${serverList}`, 'yellow')
  }

  writeTransaction() {
    const transaction = {
      vpnServerId: process.env.CONNET,
      channel: this.channel,
      language: process.env.LANGUAGE,
      start: this.createdTimestamp,
      end: this.getCurrentTimeString(),
      transactionList: this.transactionBuffer,
      serverPool: Object.keys(this.serverPool)
    }
    transactionDb.insert(transaction)
      .then(res => {
        if (res) { Pen.write(`Finished writing transaction for ${this.channel} to database`, 'green') }
      })
  }

  // TODO: set timer interval based on frequency of return edge address (exponetial backoff)
  randomNum() { return Math.random() * (this.max - this.min) + this.min }

  getCurrentTimeString() { return new Date().toISOString().replace(/\..+/, '') }

  setTimerRange(min, max) { this.min = min; this.max = max }
}

module.exports = ProbingPool

if (require.main === module) {
  const probe = new StreamProbe('loltyler1')
}
