const { twitchAPI, hostingAPI } = require('../api.js')

function isHosting (channel) {
  return twitchAPI('/kraken/users', { login: channel })
    .then(response => response.data.users[0]._id)
    .then(id => { return { include_logins: 1, host: id } })
    .then(params => hostingAPI('/hosts', params))
    .then(response => {
      const hostInfo = response.data.hosts[0]
      if (('target_login' in hostInfo) && (hostInfo.target_login.toLowerCase() !== channel)) {
        return true
      }
      return false
    })
}

module.exports = { isHosting }
if (require.main === module) {
  isHosting('caps')
    .then(response => console.log(response))
}
