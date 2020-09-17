const { URL } = require('url') // (native) provides utilities for URL resolution and parsing
const axios = require('axios')
const { lookupDNSCache } = require('./Cache/DNSCache.js')
const Pen = require('./Pen.js')

let requestCount = 0
const reportRequestCountInterval = 30 // seconds
const reportRequestCountTimer = setInterval(() => {
  Pen.write(`Sent requests to Twitch: ${requestCount}`, 'cyan')
}, reportRequestCountInterval * 1000)

const buildOptions = (hostname, args) => {
  /**
   * Builds request arguments based on API type
   * Public APIs have different argument format than private ones
   */
  const options = {}
  const accessKey = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
  const acceptType = 'application/vnd.twitchtv.v5+json'

  switch (hostname) {
    case 'api.twitch.tv':
      options.headers = { Accept: acceptType, 'Client-ID': accessKey }
      options.params = { ...{ as3: 't' }, ...args }
      break
    case 'usher.ttvnw.net':
    case 'tmi.twitch.tv':
      options.params = { ...{ client_id: accessKey }, ...args }
      break
  }

  return options
}

const axiosLookupBeforeGet = (api, args) => {
  const urlObj = new URL(api)
  urlObj.host = lookupDNSCache(urlObj.host)
  requestCount += 1

  return axios.get(urlObj.toString(), buildOptions(urlObj.hostname, args))
}

class API {
  static axiosLookupBeforeGet(api, args) { return axiosLookupBeforeGet(api, args) }

  static twitchAPI(path, args) {
    const api = `https://api.twitch.tv${path}`
    return axiosLookupBeforeGet(api, args)
  }

  static usherAPI(path, args) {
    const api = `https://usher.ttvnw.net${path}`
    return axiosLookupBeforeGet(api, args)
  }

  static hostingAPI(path, args) {
    const api = `https://tmi.twitch.tv${path}`
    return axiosLookupBeforeGet(api, args)
  }

  static clearReportTimer() { clearInterval(reportRequestCountTimer) }

  static getRequestCount() { return requestCount }
}

if (require.main === module) {
  const channel = 'lcs'
  const sleep = async (ms) => {
    return new Promise(resolve => {
      setTimeout(resolve, ms)
    })
  }
  const test = async () => {
    API.twitchAPI(`/api/channels/${channel}/access_token`)
      .then(response => { console.log(response.data) })
    await sleep(1000)
    API.twitchAPI(`/api/channels/${channel}/access_token`)
      .then(response => { console.log(response.data) })
    await sleep(5000)
    API.clearReportTimer()
  }
  test()
}

module.exports = API
