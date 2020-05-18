const { workerData, parentPort } = require('worker_threads')

// You can do any heavy stuff here, in a synchronous way
// without blocking the "main thread"
// console.log(`Number of live streams: ${workerData.data.length}`)

const records = []

const getTotalViewers = () => {
  let count = 0
  for (const stream of workerData.data) { count += stream.viewers }
  return count
}

const totalViewers = getTotalViewers()
let accuViewers = 0
for (const stream of workerData.data) {
  accuViewers += stream.viewers
  records.push(stream.channel.name)
  if ((accuViewers / totalViewers) > workerData.percentage) { break }
}

parentPort.postMessage(records)
