const { getStreamInfo } = require('./get_stream_info.js')
const { isHosting } = require('./check_if_hosting.js')
const { isOnline } = require('./check_if_online.js')
const { getAllEdge } = require('./get_all_edge.js')

function getAllEdgeSummary (channel) {
  return getAllEdge(channel)
    .then(response => {
      return {
        fields: {
          num_edge: Object.keys(response).length,
          ip_list: Object.keys(response).join(','),
          fq_count: Object.values(response).join(',')
        }
      }
    })
}

function getDataPackage (channel) {
  return isOnline(channel)
    .then(response => {
      if (response) {
        return isHosting(channel)
      } else { throw new Error(`${channel} is not online`) }
    })
    .then(hosting => {
      if (!hosting) {
        return Promise.all([getStreamInfo(channel), getAllEdgeSummary(channel)])
      } else { throw new Error(`${channel} is hosting`) }
    })
    .then(response => {
      const info = response[0]; const summary = response[1]
      info.fields = { ...info.fields, ...summary.fields }
      return info
    })
}

module.exports = { getDataPackage }

if (require.main === module) {
  (async () => {
    console.log('Start')
    try {
      const channels = ['sees360', 'westdoor', 'failverde']

      for (const channel of channels) {
        getDataPackage(channel)
          .then(data => { console.log(data) })
          .catch(error => { console.log(error) })
      }
    } catch (error) {
      console.log(error)
    }
  })()
}
