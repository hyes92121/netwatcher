const { URL } = require('url') // (native) provides utilities for URL resolution and parsing
const axios = require('axios')
const { lookupDNSCache } = require('./Cache/DNSCache.js')
// const { getAddress } = require('./local_dns_cache.js')

function buildOptions(hostname, args) {
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

function axiosLookupBeforeGet(api, args) {
  const urlObj = new URL(api)
  // urlObj.host = getAddress(urlObj.host) // getAddress is blocking
  urlObj.host = lookupDNSCache(urlObj.host)

  return axios.get(urlObj.toString(), buildOptions(urlObj.hostname, args))
}

function twitchAPI(path, args) {
  const api = `https://api.twitch.tv${path}`
  return axiosLookupBeforeGet(api, args)
}

const twitchAPIAsync = async (path, args) => {
  const api = `https://api.twitch.tv${path}`

  try {
    const response = await axiosLookupBeforeGet(api, args)
    return response
  } catch (error) {
    console.log(error)
  }
}

function usherAPI(path, args) {
  const api = `https://usher.ttvnw.net${path}`
  return axiosLookupBeforeGet(api, args)
}

function hostingAPI(path, args) {
  const api = `https://tmi.twitch.tv${path}`
  return axiosLookupBeforeGet(api, args)
}

if (require.main === module) {
  const channel = 'lcs'
  const sleep = async (ms) => {
    return new Promise(resolve => {
      setTimeout(resolve, ms)
    })
  }
  const test = async () => {
    twitchAPI(`/api/channels/${channel}/access_token`)
      .then(response => { console.log(response.data) })
    await sleep(1000)
    twitchAPI(`/api/channels/${channel}/access_token`)
      .then(response => { console.log(response.data) })
  }
  test()
}

// return axios.get(api, options)
module.exports = { axiosLookupBeforeGet, twitchAPI, usherAPI, hostingAPI, twitchAPIAsync }
