const { workerData, parentPort } = require('worker_threads')

// You can do any heavy stuff here, in a synchronous way
// without blocking the "main thread"
// console.log(`Number of live streams: ${workerData.data.length}`)

const records = []

const getTotalViewers = () => {
  let count = 0
  for (const stream of workerData.data) { count += stream.viewer_count }
  return count
}

const totalViewers = getTotalViewers()
let accuViewers = 0
for (const stream of workerData.data) {
  accuViewers += stream.viewer_count
  records.push(stream.display_name)
  if ((accuViewers / totalViewers) > workerData.percentage) { break }
}
console.log(records)
parentPort.postMessage(records)
