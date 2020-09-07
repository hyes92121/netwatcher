const { twitchAPI } = require('../api.js')

function getStreamInfo (channel) {
  return twitchAPI('/kraken/users', { login: channel })
    .then(response => response.data.users[0]._id) // get channel id
    .then(id => twitchAPI(`/kraken/streams/${id}`))
    .then(response => {
      // console.log(`Streamer ${channel} is playing ${game} in ${language} with ${viewers} viewers watching`);
      const pkg = {
        measurement: channel,
        tags: {
          stream_language: response.data.stream.channel.language
        },
        fields: {
          viewer: response.data.stream.viewers
        }
      }
      if (response.data.stream.channel.game !== '') { pkg.game = response.data.stream.channel.game }
      return pkg
    })
}

module.exports = { getStreamInfo }

if (require.main === module) {
  getStreamInfo('bijoulolz')
    .then(response => { console.log(response) })
}
