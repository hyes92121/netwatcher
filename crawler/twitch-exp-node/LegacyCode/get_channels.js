const { twitchAPI } = require('../api.js')

const getChannels = async (language = 'zh', limit = 100, offset = 0) => {
  const records = []
  let keepGoing = true
  const localLimit = limit
  let localOffset = offset

  // parameter offset is capped at 900, see https://dev.twitch.tv/docs/v5/reference/streams#get-stream-by-user
  while (keepGoing && localOffset <= 900) {
    try {
      const response = await twitchAPI('/kraken/streams', { language: language, limit: localLimit, offset: localOffset })
      records.push(response.data.streams)
      localOffset += localLimit
      if (response.data.streams.length === 0) { keepGoing = false }
    } catch (error) {
      console.log(`${error.message}. Retry getting all channels.`)
    }
  }

  return [].concat.apply([], records) // flatten nested array
}

module.exports = { getChannels }

if (require.main === module) {
  const test = async () => {
    const response = await twitchAPI('/kraken/streams', { language: 'zh', limit: 100, offset: 0 })
    console.log(response.data.streams[0]._id)
  }

  const test2 = async () => {
    console.log('Start')
    try {
      const response = await getChannels('es')
      const set = new Set(response)
      console.log(response.length)
      console.log(set.size)
      // eslint-disable-next-line promise/param-names
      await new Promise(x => setTimeout(x, 1000))
      for (const stream of response) {
        console.log(`${stream.channel.name} | ${stream.viewers}`)
      }
    } catch (error) {
      console.log(error)
    }
  }

  // test()
  test2()
}
