const { twitchAPI } = require('../api.js')

// TODO: implement id cache and lookup function
const idCache = {}

const lookupIdCache = (channel) => {
  return idCache[channel]
}

const getChannelId = async (channel) => {
  await twitchAPI('/kraken/users', { login: channel })
    .then(response => { return response.data.users[0]._id }) // get channel id
}

const lookupIdBeforeGet = async (channel) => {
  let channelId = lookupIdCache(channel)
  if (!channelId) {
    channelId = await getChannelId(channel)
    idCache[channel] = channelId
  }
  return channelId
}

module.exports = { lookupIdBeforeGet }

if (require.main === module) {
  lookupIdBeforeGet('riotgames')
  lookupIdBeforeGet('riotgames')
}
