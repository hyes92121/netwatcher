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
    return API.twitchAPI('/helix/users', { login: channel })
      .then(response => response.data.data[0].id ) // get channel id
  }

  getChannelAccessToken(channel) {
    return API.twitchAPI(`/api/channels/${channel}/access_token`)
      .then(response => response.data)
  }

  updateChannelAccessToken(channel) {
    return this.getChannelAccessToken(channel)
      .then(token => {
        this.cache[channel].accessToken = token
        return token
      })
  }

}

const localStreamCache = new StreamInfoCache()

const lookupStreamCache = async (channel) => { return localStreamCache.lookup(channel) }
const updateChannelToken = (channel) => { return localStreamCache.updateChannelAccessToken(channel) }

module.exports = { lookupStreamCache, updateChannelToken }
