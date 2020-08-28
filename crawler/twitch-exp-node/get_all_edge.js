const { getEdgeAddr } = require('./get_edge_addr.js')

const sleep = async (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function getAllEdge (channel) {
  let errorCount = 0
  async function safeGetEdgeAddr (channel) {
    getEdgeAddr(channel)
      .catch(error => {
        if (errorCount > 10) {
          // console.log('Too many errors. Rejecting...')
          reject(new Error('TooManyErrors'))
        }
        if (Object.prototype.hasOwnProperty.call(error, 'response')) { // error originated from axios
          if (error.response === undefined) {
            errorCount += 1
            console.log(`Error from get_all_edge.js: ${error.message}`)
          }
          else if (![403, 404].includes(error.response.status)) {
            errorCount += 1
            console.log(`Error from axios: ${error.message}`)
          }
        }
        else {
          errorCount += 1
          console.log(`Other error: ${error.message}`)
        }
      }) // no 'return' here to propagate error to upper level, so we handle the error locally
  }

  while (true) {
    safeGetEdgeAddr(channel)
    await sleep(5000)
  }
}

module.exports = { getAllEdge }

if (require.main === module) {
  getAllEdge('lcs')
    .then(response => console.log(response))
}
