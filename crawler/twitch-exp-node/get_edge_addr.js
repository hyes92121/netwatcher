const url = require('url')
const dns = require('dns')
const axios = require('axios')
const { twitchAPI, usherAPI } = require('./api.js')
const m3u8Parser = require('m3u8-parser')

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
  return axios.get(uri).then((response) => {
    return response.data
  })
}

function getEdgeUrl (raw) {
  const parser = new m3u8Parser.Parser()
  parser.push(raw)
  parser.end()
  return parser.manifest.segments.slice(-1).pop().uri
}

function lookUp (uri) {
  const host = url.parse(uri, true).hostname
  return new Promise((resolve, reject) => {
    dns.resolve(host, (err, addrs, family) => {
      if (err != null) {
        reject(err)
      } else { resolve(addrs[0]) }
    })
  })
}

function getEdgeAddr (channel) {
  return getAccessToken(channel)
    .then(token => getMasterPlaylist(token, channel))
    .then(raw => getEdgePlaylistUrl(raw))
    .then(uri => getPlaylist(uri))
    .then(raw => getEdgeUrl(raw))
    .then(uri => lookUp(uri))
}

module.exports = { getEdgeAddr }

if (require.main === module) {
  getEdgeAddr('xargon0731')
    .then(response => console.log(response))
}
