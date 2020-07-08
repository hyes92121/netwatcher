const url = require('url')
const dns = require('dns')
const axios = require('axios')
const { global_axios } = require('./global_axios.js')
const { twitchAPI, usherAPI } = require('./api.js')
const m3u8Parser = require('m3u8-parser')
const {getAddress, recordEdgeServer} = require('./local_dns_cache.js')

function getAccessToken (channel) {
  return twitchAPI(`/api/channels/${channel}/access_token`).then(
    (response) => { return response.data }
  )
}

function getMasterPlaylist (token, channel) {
  const params = {
    player: 'twitchweb',
    token: token.token,
    sig: token.sig,
    allow_audio_only: true,
    allow_source: true,
    p: Math.floor(Math.random() * 99999) + 1
  }
  return usherAPI(`/api/channel/hls/${channel}.m3u8`, params).then((response) => {
    return response.data
  })
}

//get Media Playlist that contains URLs of the files needed for streaming
function getEdgePlaylistUrl (playlist) {
  const parsedPlaylist = []
  const lines = playlist.split('\n')
  for (let i = 4; i < lines.length - 1; i += 3) {
    parsedPlaylist.push({
      quality: lines[i - 2].split('NAME="')[1].split('"')[0],
      resolution: (lines[i - 1].indexOf('RESOLUTION') !== -1 ? lines[i - 1].split('RESOLUTION=')[1].split(',')[0] : null),
      uri: lines[i]
    })
  }
  return parsedPlaylist[0].uri
}

function getPlaylist (uri) {
  return global_axios.get(uri).then((response) => {
    return response.data
  })
}

function getEdgeUrl (raw) {
  const parser = new m3u8Parser.Parser()
  parser.push(raw)
  parser.end()
  //return the uri of the last .ts file
  return parser.manifest.segments.slice(-1).pop().uri
}

function lookUpAndRecord (uri,channel) {
  const host = url.parse(uri, true).hostname
  return new Promise((resolve, reject) => {
    resolve(recordEdgeServer(host,channel))
  })
}

function getEdgeAddr (channel) {
  return getAccessToken(channel)
    .then(token => getMasterPlaylist(token, channel))
    .then(raw => getEdgePlaylistUrl(raw))
    .then(uri => getPlaylist(uri))
    .then(raw => getEdgeUrl(raw))
    .then(uri => lookUpAndRecord(uri,channel))
}

module.exports = { getEdgeAddr }

if (require.main === module) {
  getEdgeAddr('lpl')
    .then(response => console.log(response))
}
