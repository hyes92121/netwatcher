const { twitchAPIAsync } = require('./api.js')

const reqChannel = async (language, limit, offset) => {
  const response = await twitchAPIAsync('/kraken/streams', { language: language, limit: limit, offset: offset })
  return response
}

const getChannels = async (language = 'zh-tw', limit = 100, offset = 0) => {
  const records = []
  let keepGoing = true

  while (keepGoing) {
    try {
      const response = await reqChannel(language, limit, offset)
      records.push(response.data.streams)
      offset += limit

      if (response.data.streams.length < limit) {
        keepGoing = false
        return [].concat.apply([], records) // flatten nested array
      }
    } catch (error) {
      console.log(`${error.message}. Retry getting all channels.`)
    }
  }
}

module.exports = { getChannels }

if (require.main === module) {
  (async () => {
    console.log('Start')
    try {
      const response = await getChannels('ko')
      console.log(response.length)
    } catch (error) {
      console.log(error)
    }
  })()
}
