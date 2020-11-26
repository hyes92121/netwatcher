const API = require('../Api.js')

const getChannels = async (language = 'zh', limit = 100, offset = 0) => {
  const records = []
  let keepGoing = true
  let localOffset = offset

  // parameter offset is capped at 900, see https://dev.twitch.tv/docs/v5/reference/streams#get-stream-by-user
  while (keepGoing && localOffset <= 900) {
    // try {
    const response = await API.twitchAPI('/kraken/streams', { language: language, limit: limit, offset: localOffset })
    records.push(response.data.streams)
    localOffset += response.data.streams.length
    if (response.data.streams.length === 0) { keepGoing = false } // else { console.log(localOffset); console.log(response.data.streams[0]._id) }
    // } catch (error) {
    //   console.log(`${error.message}. Retry getting all channels.`)
    // }
  }

  return [].concat.apply([], records) // flatten nested array
}

module.exports = { getChannels }
