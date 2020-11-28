const API = require('../Api.js')

const getChannels = async (language = 'zh', limit = 100, offset = 0) => {
  const records = []
  let keepGoing = true
  let localOffset = offset
  let after = '' // Cursor for forward pagination: tells the server where to start fetching the next set of results, in a multi-page response. The cursor value specified here is from the pagination response field of a prior query.
  // parameter offset is capped at 900, see https://dev.twitch.tv/docs/v5/reference/streams#get-stream-by-user
  while (keepGoing && localOffset <= 900) {
    const response = await API.twitchAPI('/helix/streams', { language: language, limit: 100, after: after })
    const liveChannels = response.data.data
    const liveChannelsDisplayName = await Promise.all(liveChannels.map(channel => { // Need to get display name for each channel
      return API.twitchAPI('/helix/search/channels', { query: channel.user_name })
        .then(response => {
          return Promise.resolve(response.data.data.filter(candidate => candidate.is_live)[0].display_name) // Only choose the channel that matches name and is alive
        })
    }))
    records.push(liveChannels.map((channel, index) => { return { display_name: liveChannelsDisplayName[index], viewer_count: channel.viewer_count } }))
    after = response.data.pagination.cursor
    localOffset += response.data.data.length
    if (liveChannels.length === 0) { keepGoing = false }
  }

  return [].concat.apply([], records).sort((a, b) => (a.viewer_count > b.viewer_count) ? -1 : ((b.viewer_count > a.viewer_count) ? 1 : 0)) // flatten nested array
}

module.exports = { getChannels }
