const BaseCache = require('./BaseCache.js')
const API = require('../Api.js')

class StreamInfoCache extends BaseCache {
  constructor() { super(); this.childClass = 'StreamInfoCache' }

  async onMiss(channel) {
    await Promise.all([this.getChannelId(channel), this.getChannelAccessToken(channel)])
      .then(response => {
        this.cache[channel] = { channelId: response[0], accessToken: response[1] }
      })
  }

  getChannelId(channel) {
    return API.twitchAPI('/kraken/users', { login: channel })
      .then(response => response.data.users[0]._id) // get channel id
  }

  getChannelAccessToken(channel) {
    return API.twitchAPI(`/api/channels/${channel}/access_token`)
      .then(response => response.data)
  }
}

const localStreamCache = {
  cache: new StreamInfoCache()
}

const lookupStreamCache = async (channel) => {
  return localStreamCache.cache.lookup(channel)
}

module.exports = { lookupStreamCache }
