const { getStreamInfo } = require('./get_stream_info.js')
const { isHosting } = require('./check_if_hosting.js')
const { isOnline } = require('./check_if_online.js')
const { getAllEdge } = require('./get_all_edge.js')

function getAllEdgeSummary (channel) {
  return getAllEdge(channel)
    .then(response => {
      let ipList = response.ipList
      // console.log(response.time)
      return {
          fields: {
          num_edge: Object.keys(ipList).length,
          ip_list: Object.keys(ipList).join(','),
          fq_count: Object.values(ipList).join(',')
        },
          time: response.time
      }
    })
}

async function getDataPackage (channel) {
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
      return new Promise((resolve, reject) => { 
          pkg = {time: summary.time, info: info}
          resolve(pkg) 
      })
    })
}

module.exports = { getDataPackage }

if (require.main === module) {
  (async () => {
    console.log('Start')
    try {
      const channels = ['pestily', 'esl_csgo', 'pimpcsgo', 'gorgc']

      for (const channel of channels) {
        getDataPackage(channel)
          .then(pkg => { console.log(pkg) })
          .catch(error => { console.log(error) })
      }
    } catch (error) {
      console.log(error)
    }
  })()
}
