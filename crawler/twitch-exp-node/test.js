const Twitch = require('./Twitch.js')

const sleep = async (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
const channel = 'riotgames'
const testStream = async () => {
  Twitch.cacheGetStreamInfo(channel)
    .then(response => console.log(response.data.stream.game))

  await sleep(1000)

  Twitch.cacheGetStreamInfo(channel)
    .then(response => console.log(response.data.stream.game))

  await sleep(1000)

  Twitch.cacheGetStreamInfo(channel)
    .then(response => console.log(response.data.stream.game))

  await sleep(1000)
}

if (require.main === module) {
  testStream()
}
