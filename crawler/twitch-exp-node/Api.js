const { URL } = require('url') // (native) provides utilities for URL resolution and parsing
const axios = require('axios')
const { lookupDNSCache } = require('./Cache/DNSCache.js')
const { Pen } = require('./Pen.js')
const { access } = require('fs')
const axiosLookupBeforeRequest = axios.create({})

let requestCount = 0
let accessToken = ''
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
  if(requestCount === 1){
     accessToken = await API.authAPI('request').then(res => { return res.data.access_token })
  }
  if(config.headers.Host === 'api.twitch.tv'){
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

const buildOptions = (api, args) => {
  /**
   * Builds request arguments based on API type
   * Public APIs have different argument format than private ones
   */
  const options = {}
  const clientIdForOldApi = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
  const acceptType = 'application/vnd.twitchtv.v5+json'
  const urlObj = new URL(api)
  switch (urlObj.hostname) {
    case 'api.twitch.tv':
      if (urlObj.pathname.split('/').slice(-1)[0] === 'access_token') {
        options.headers = { Accept: acceptType, 'Client-Id': clientIdForOldApi }
      } else {
        options.headers = { Accept: acceptType, Authorization: '', 'Client-Id': clientIdForHelixApi }
      }
      options.params = { ...{ as3: 't' }, ...args }
      break
    case 'id.twitch.tv':
      options.headers = { Authorization: `OAuth ${accessToken}` }
      break
    case 'usher.ttvnw.net':
    case 'tmi.twitch.tv':
      options.params = { ...{ client_id: clientIdForOldApi }, ...args }
      break
  }

  return options
}
// const buildOptions = (api, args) => {
//   /**
//    * Builds request arguments based on API type
//    * Public APIs have different argument format than private ones
//    */
//   const options = {}
//   const accessKey = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
//   const acceptType = 'application/vnd.twitchtv.v5+json'
//   const urlObj = new URL(api)
//   console.log(urlObj)
//   switch (urlObj.hostname) {
//     case 'api.twitch.tv':
//       if (urlObj.pathname.split('/').slice(-1)[0] === 'access_token') {

//       }
//       options.headers = { Accept: acceptType, 'Client-ID': accessKey }
//       options.params = { ...{ as3: 't' }, ...args }
//       break
//     case 'usher.ttvnw.net':
//     case 'tmi.twitch.tv':
//       options.params = { ...{ client_id: accessKey }, ...args }
//       break
//   }

//   return options
// }
const clientIdForHelixApi = '2xrd133djme37utzs215bqmwwz6hve' // client id for getting the api token
const clientSecret = 'l5rahrb544myhzf6dopcc9cy5aq95t' // client secret obtained from app registration
class API {
  static axiosLookupBeforeGet(api, args) { return axiosLookupBeforeRequest.get(api, args) }
  static authAPI(type, args) {
    const api = 'https://id.twitch.tv'
    if (type === 'request') { // request for api token
      return axiosLookupBeforeRequest.post(api + `/oauth2/token?client_id=${clientIdForHelixApi}&client_secret=${clientSecret}&grant_type=client_credentials`, buildOptions(api, args))
    } else if (type === 'validate') { // validate current token
      return axiosLookupBeforeRequest.get(api + '/oauth2/validate', buildOptions(api, args))
    }
  }

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
/* Fetch access token for helix apis */
// const sleep = async (ms) => {
//   return new Promise(resolve => {
//     setTimeout(resolve, ms)
//   })
// }
// const test2 = async () => {
//   await API.authAPI('request').then(res => { accessToken = res.data.access_token })
//   await sleep(5000)
// }
// test2()

/* For testing */
if (require.main === module) {
  const channel = 'Destiny'
  const sleep = async (ms) => {
    return new Promise(resolve => {
      setTimeout(resolve, ms)
    })
  }
  const test = async () => {
    const testId = await API.twitchAPI('/helix/users', { login: channel }) // get Channel Id
      .then(response => { return response.data.data[0].id })
    console.log(testId)
    await sleep(1000)
    const isOnline = await API.twitchAPI('/helix/streams', { user_id: testId }) // check Online
      .then(response => {
        const stream = response.data.data
        if (stream.length > 0) { return true }
        return false
      })
    console.log(isOnline)
    await API.twitchAPI(`/api/channels/${channel}/access_token`) // get channel access token
      .then(response => console.log(response.data))
    await API.hostingAPI('/hosts', { include_logins: 1, host: testId })
      .then(response => {
        const hostInfo = response.data.hosts[0]
        if (('target_login' in hostInfo) && (hostInfo.target_login.toLowerCase() !== channel)) {
          return true
        }
        return false
      })
  }
  test()
}

module.exports = API
