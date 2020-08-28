/* eslint-disable space-before-function-paren */
const { twitchAPI } = require('./api.js')
const { lookupStreamCache } = require('./Cache/StreamInfoCache.js')

class Twitch {
  static cacheGetStreamInfo(channel) {
    return lookupStreamCache(channel)
      .then(channelInfo => { return channelInfo.channelId })
      .then(id => { return twitchAPI(`/kraken/streams/${id}`) })
  }

  static getEdgeAddr(channel) {

  }
}

module.exports = Twitch
