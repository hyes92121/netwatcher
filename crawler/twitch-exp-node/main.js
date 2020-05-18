const config = require('./config.json')
const { getDataPackage } = require('./get_data_package.js')
const { getTopKChannelsByLanguage } = require('./get_top_k_channels.js')
const Influx = require('influx')
const influx = new Influx.InfluxDB({ host: config.host.name, database: config.database.name })

// Some global variable and functions
const sleep = async (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
let INFLUXBUFFER = []

const record = async (hostIP, location = 'tw', languages = 'zh-tw', percentage = 0.8) => {
  const liveChannels = {}
  influx.getDatabaseNames()
	.then(names => {
    	  if (!names.includes(config.database.name)) {
 	   console.log('Database does not exist')
           return influx.createDatabase(config.database.name);
    	  }
  })
  for (const lang of languages) {
    liveChannels[lang] = await getTopKChannelsByLanguage(lang, percentage)
  }

  const write = async (language) => {
    let flag = true
    let i = 0
    for (const channel of liveChannels[language]) {
      if (flag) {
        i += 1
        if (i === 5) {
          await sleep(3500)
          i = 0
        }
  let pkg = await getDataPackage(channel)
	pkg.timestamp = new Date()
	pkg.tags.client_location = location
	pkg.tags.client_ip = hostIP
	console.log(pkg)
	INFLUXBUFFER.push(pkg)
	if (INFLUXBUFFER.length === 1000) {
	  influx.writePoints(INFLUXBUFFER)
	  INFLUXBUFFER = []
	}
      } else {
        console.log('Going to sleep...')
        await sleep(60000 * 5)
        flag = true
      }
    }
  }
  /* After initialization, schedule the recorder to shuffle between languages */
  let topKCounter = 0
  let writeCounter = 0

  console.log(`${new Date()} - Writing topK streams for ${languages[writeCounter]} channels into database`)
  await write(languages[writeCounter])
  console.log(`${new Date()} - Finished writing topK streams for ${languages[writeCounter]} channels into database`)
  writeCounter += 1
  if ((writeCounter % languages.length) === 0) { writeCounter = 0 }

  setInterval(async () => {
    console.log(`${new Date()} - Renewing topK list for ${languages[topKCounter]} channels...`)
    liveChannels[languages[topKCounter]] = await getTopKChannelsByLanguage(languages[topKCounter], percentage)
    console.log(`${new Date()} - Finished renewing topK list for ${languages[topKCounter]} channels!`)
    topKCounter += 1
    if ((topKCounter % languages.length) === 0) { topKCounter = 0 }
  }, 60000 * 10)
  setInterval(async () => {
    console.log(`${new Date()} - Writing topK streams for ${languages[writeCounter]} channels into database`)
    await write(languages[writeCounter])
    console.log(`${new Date()} - Finished writing topK streams for ${languages[writeCounter]} channels into database`)
    writeCounter += 1
    if ((writeCounter % languages.length) === 0) { writeCounter = 0 }
  }, 60000 * 3.75)
}

module.exports = { record }

if (require.main === module) {
  record(config.vpn_host.ip, config.vpn_host.country, config.languages, config.viewer_percentage)
  //record('211.197.11.10', 'ko', ['ko'], 0.8)
}
