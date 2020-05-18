const { getEdgeAddr } = require('./get_edge_addr.js')

function getAllEdge (channel) {
  const edges = {}
  let errorCount = 0
  let tries = 0
  return new Promise((resolve, reject) => {
    let batchGetEdgeAddr
    (batchGetEdgeAddr = function (channel) {
      for (let i = 0; i < 5; i++) {
        getEdgeAddr(channel)
          .then((ip) => {
            if (ip !== undefined) {
              if (Object.prototype.hasOwnProperty.call(edges, ip)) {
                edges[ip] += 1
                tries += 1
              } else { edges[ip] = 1 }
            }
          })
          .catch(error => {
            if (errorCount > 10) {
              // console.log('Too many errors. Rejecting...')
              reject(new Error('TooManyErrors'))
            }
            if (Object.prototype.hasOwnProperty.call(error, 'response')) { // error originated from axios
              if (error.response === undefined) {
                errorCount += 1
                console.log(`Error from get_all_edge.js: ${error.message}`)
              } else if (![403, 404].includes(error.response.status)) {
                errorCount += 1
                console.log(`Error from axios: ${error.message}`)
              }
            } else {
              errorCount += 1
              console.log(`Other error: ${error.message}`)
            }
          }) // no 'return' here to propagate error to upper level, so we handle the error locally
      }
    })(channel)

    const interval = setInterval(() => {
      batchGetEdgeAddr(channel)
      if (tries >= 10) { clearInterval(interval); resolve(edges) }
    }, 1500)
  })
}

module.exports = { getAllEdge }
