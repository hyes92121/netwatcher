const { twitchAPI, hostingAPI } = require('./api.js')
const { lookupIdBeforeGet } = require('./helper.js')

export class Checker {
  // TODO: add DB and DNS check

  static hosting (channel) {
    return lookupIdBeforeGet(channel)
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

  static online (channel) {
    return twitchAPI('/kraken/users', { login: channel })
      .then(response => response.data.users[0]._id) // get channel id
      .then(id => twitchAPI(`/kraken/streams/${id}`))
      .then(response => {
        const stream = response.data.stream
        // TODO: stream might be undefined instead of null
        if (stream) { return true }
        return false
      })
  }
}
