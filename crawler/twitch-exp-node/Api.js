const { URL } = require('url') // (native) provides utilities for URL resolution and parsing
const axios = require('axios')
const { lookupDNSCache } = require('./Cache/DNSCache.js')
const Pen = require('./Pen.js')
const axiosLookupBeforeRequest = axios.create({})

let requestCount = 0
const reportRequestCountInterval = 30 // seconds
const reportRequestCountTimer = setInterval(() => {
  Pen.write(`Sent requests to Twitch: ${requestCount}`, 'cyan')
}, reportRequestCountInterval * 1000)

/* Add axios interceptor to do address replacement before every request */
axiosLookupBeforeRequest.interceptors.request.use(async (config) => {
  requestCount += 1
  const urlObj = new URL(config.url)
  const addr = await lookupDNSCache(urlObj.hostname)
  
  config.headers.Host = urlObj.hostname // need original host name for TLS certificate 
  urlObj.host = addr
  config.url = urlObj.toString()

  return config
})

const buildOptions = (api, args) => {
  /**
   * Builds request arguments based on API type
   * Public APIs have different argument format than private ones
   */
  const options = {}
  const accessKey = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
  const acceptType = 'application/vnd.twitchtv.v5+json'
  const urlObj = new URL(api)

  switch (urlObj.hostname) {
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

class API {
  static axiosLookupBeforeGet(api, args) { return axiosLookupBeforeRequest.get(api, args) }

  static twitchAPI(path, args) {
    const api = `https://api.twitch.tv${path}`
    return axiosLookupBeforeRequest.get(api, buildOptions(api, args))
  }

  static usherAPI(path, args) {
    const api = `https://usher.ttvnw.net${path}`
    return axiosLookupBeforeRequest.get(api, buildOptions(api, args))
  }

  static hostingAPI(path, args) {
    const api = `https://tmi.twitch.tv${path}`
    return axiosLookupBeforeRequest.get(api, buildOptions(api, args))
  }

  static clearReportTimer() { clearInterval(reportRequestCountTimer) }

  static getRequestCount() { return requestCount }
}

/* For testing */
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
      .catch(error => {  console.log(error) })
    await sleep(1000)
    API.twitchAPI(`/api/channels/${channel}/access_token`)
      .then(response => { console.log(response.data) })
    await sleep(5000)
    API.clearReportTimer()
  }
  test()
}

module.exports = API
