const { twitchAPI } = require('./api.js')

function isOnline (channel) {
  return twitchAPI('/kraken/users', { login: channel })
    .then(response => response.data.users[0]._id) // get channel id
    .then(id => twitchAPI('helix/streams', { user_id: id }))
    .then(response => {
      const stream = response.data.stream
      // TODO: stream might be undefined instead of null
      if (stream) { return true }
      return false
    })
}

module.exports = { isOnline }
if (require.main === module) {
  isOnline('westdoor')
    .then(response => console.log(response))
}
