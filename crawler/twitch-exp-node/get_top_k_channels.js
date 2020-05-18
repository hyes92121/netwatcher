const { Worker } = require('worker_threads')
const { getChannels } = require('./get_channels.js')

function runService (workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./service.js', { workerData })
    worker.on('message', resolve)
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) { reject(new Error(`Worker stopped with exit code ${code}`)) }
    })
  })
}

const getTopKChannelsByLanguage = async (language = 'zh-tw', percentage = 0.8) => {
  try {
    const allChannels = await getChannels(language)
    const topKChannels = await runService({ data: allChannels, percentage: percentage })
    console.log(`Returning ${topKChannels.length} out of ${allChannels.length} for ${language} channels`)
    return topKChannels
  } catch (error) {
    console.log(error.message)
  }
}

module.exports = { getTopKChannelsByLanguage }

if (require.main === module) {
  (async () => {
    console.log('Start')
    try {
      const allChannels = await getChannels('ko')
      const result = await runService({ data: allChannels, percentage: 0.8 })
      console.dir(result, { depth: null })
      console.log(result.length)
    } catch (error) {
      console.log(error)
    }
  })()
}
