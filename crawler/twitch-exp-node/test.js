const Twitch = require('./Twitch.js')
const Aggregator = require('./Aggregator.js')

const sleep = async (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const sleepDuration = 1000

const testStream = async (channel) => {
  Twitch.cacheGetStreamInfo(channel)
    .then(response => console.log(response.data.stream.game))

  await sleep(sleepDuration)

  Twitch.cacheGetStreamInfo(channel)
    .then(response => console.log(response.data.stream.game))

  await sleep(sleepDuration)

  Twitch.cacheGetStreamInfo(channel)
    .then(response => console.log(response.data.stream.game))

  await sleep(sleepDuration)
  console.log('End')
}

const testGetEdgeAddr = async (channel) => {
  Twitch.getEdgeAddrByChannel(channel)
    .then(addr => console.log(addr))

  await sleep(sleepDuration)

  Twitch.getEdgeAddrByChannel(channel)
    .then(addr => console.log(addr))

  await sleep(sleepDuration)

  Twitch.getEdgeAddrByChannel(channel)
    .then(addr => console.log(addr))

  await sleep(sleepDuration)
  console.log('End')
}

const testGetChannelsByLang = async (lang) => {
  Twitch.getChannelsByLanguage(lang)
    .then(response => console.log(response.length))
}

const testGetTopKChannelsByLang = async (lang) => {
  Aggregator.getTopKChannelsByLanguage(lang)
    .then(response => console.log(response.length))
}

if (require.main === module) {
  const language = 'zh'
  const channel = 'riotgames'
  const main = async () => {
    testStream(channel)
    await sleep(5000)
    testGetEdgeAddr(channel)
    await sleep(5000)
    // testGetChannelsByLang(language)
    testGetTopKChannelsByLang(language)
  }
  main()
}
