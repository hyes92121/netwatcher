const API = require('./Api.js')
const { lookupStreamCache, updateChannelToken } = require('./Cache/StreamInfoCache.js')
const { getEdgeAddr } = require('./Utils/getEdgeAddr.js')
const { getChannels } = require('./Utils/getChannels.js')

/**
 * All methods under the Twitch class returns a Promise
 */
class Twitch {
  static lookupStream (channel) { return lookupStreamCache(channel) }

  static cacheGetStreamInfo (channel) {
    return lookupStreamCache(channel)
      .then(channelInfo => channelInfo.channelId)
      .then(id => API.twitchAPI(`/kraken/streams/${id}`))
  }

  static getEdgeAddrByChannel (channel) { return getEdgeAddr(channel) }

  static updateChannelToken (channel) { return updateChannelToken(channel) }

  static getChannelsByLanguage (language) { return getChannels(language) }
}

module.exports = Twitch
