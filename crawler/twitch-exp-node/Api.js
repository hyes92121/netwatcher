const { URL } = require('url') // (native) provides utilities for URL resolution and parsing
const axios = require('axios')
const { lookupDNSCache } = require('./Cache/DNSCache.js')
const { Pen } = require('./Pen.js')
// const { access } = require('fs')
const axiosLookupBeforeRequest = axios.create({})

let requestCount = 0
let accessToken = '0b2luuxo8cxnhsttgzbxenvlfzvfxw'
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
  
  if (config.headers.Host === 'api.twitch.tv') {
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

/* For testing */
if (require.main === module) {
  const channel = 'Destiny'
  const sleep = async (ms) => {
    return new Promise(resolve => {
      setTimeout(resolve, ms)
    })
  }
  const test = async () => {
    const token = await API.authAPI('request').then(res => { return res.data })
    console.log(token)
    /// get Channel Id
    // const testId = await API.twitchAPI('/helix/users', { login: channel })
    //   .then(response => { return response.data.data[0].id })
    // console.log(testId)
    // await sleep(1000)
    // /// check Online
    // const isOnline = await API.twitchAPI('/helix/streams', { user_id: testId })
    //   .then(response => {
    //     const stream = response.data.data
    //     if (stream.length > 0) { return true }
    //     return false
    //   })
    // console.log(isOnline)
    // /// search channel title
    // const channelTitle = await API.twitchAPI('/helix/search/channels', { query: '簡到槍' })
    //   .then(response => {
    //     return response.data.data.filter(candidate => candidate.is_live)[0].display_name
    //   })
    // console.log(channelTitle)
    /// getChannels
    let keepGoing = true
    let localOffset = 0
    let after = ''
    const records = []
    // while (keepGoing && localOffset <= 200) {
    //   const response = await API.twitchAPI('/helix/streams', { language: 'zh', limit: 100, after: after })
    //   const liveChannels = response.data.data
    //   const liveChannelsDisplayName = await Promise.all(liveChannels.map(channel => {
    //     return API.twitchAPI('/helix/search/channels', { query: channel.user_name })
    //       .then(response => {
    //         return Promise.resolve(response.data.data.filter(candidate => candidate.is_live)[0].display_name)
    //       })
    //   }))
    //   records.push(liveChannels.map((channel, index) => { return { display_name: liveChannelsDisplayName[index], viewer_count: channel.viewer_count } }))
    //   after = response.data.pagination.cursor
    //   localOffset += response.data.data.length
    //   if (liveChannels.length === 0) { keepGoing = false }
    // }
    // console.log([].concat.apply([], records).sort((a, b) => (a.viewer_count > b.viewer_count) ? -1 : ((b.viewer_count > a.viewer_count) ? 1 : 0)))
    /// get channel access token
    // await API.twitchAPI(`/api/channels/${channel}/access_token`)
    //   .then(response => console.log(response.data))
    /// check is hosting
    // await API.hostingAPI('/hosts', { include_logins: 1, host: testId })
    //   .then(response => {
    //     const hostInfo = response.data.hosts[0]
    //     if (('target_login' in hostInfo) && (hostInfo.target_login.toLowerCase() !== channel)) {
    //       return true
    //     }
    //     return false
    //   })
  }
  test()
}

module.exports = API
