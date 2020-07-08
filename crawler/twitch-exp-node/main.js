const config = require('./config.json')
const { getDataPackage } = require('./get_data_package.js')
const { getTopKChannelsByLanguage } = require('./get_top_k_channels.js')
const { db } = require('./db.js')
// const Influx = require('influx')
// const influx = new Influx.InfluxDB({ host: config.host.name, database: config.database.name })

// Some global variable and functions
const sleep = async (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
let INFLUXBUFFER = []
let sleepDuration = 60*1000
let is_first = true

const record = async (hostIP, location = 'tw', languages = 'zh-tw', percentage = 0.8) => {
  const liveChannels = {}
  // influx.getDatabaseNames()
	// .then(names => {
  //   	  if (!names.includes(config.database.name)) {
 	//    console.log('Database does not exist')
  //          return influx.createDatabase(config.database.name);
  //   	  }
  // })
  for (const lang of languages) {
    liveChannels[lang] = await getTopKChannelsByLanguage(lang, percentage)
  }

  const write = async (language) => {
    let flag = true
    let i = 0
    for (const channel of liveChannels[language]) {
      if (flag) {
        i += 1
        if (i === 4) {
          await sleep(sleepDuration)
          i = 0
          is_first = true
        }
        console.log(`Sending probe to ${channel}`)
        getDataPackage(channel)
          .then((response) => {
            const time = response.time
            if (is_first) { 
                if (time < sleepDuration) { sleepDuration = time*1000; is_first = false; console.log(`Changing sleep duration to ${sleepDuration}`) } 
            } else { 
                if (time > sleepDuration) { sleepDuration = time*1000; console.log(`Changing sleep duration to ${sleepDuration}`) }
            }
            const pkg = response.info
            // add in necessary data fields
            pkg.timestamp = new Date()
            pkg.tags.client_location = location
            pkg.tags.client_ip = hostIP
            // influx.writePoints([pkg])
            INFLUXBUFFER.push(pkg)
            if (INFLUXBUFFER.length === 50) {
              db.writePoints(INFLUXBUFFER)
              console.log('Writing data from buffer into DB')
              INFLUXBUFFER = []
            }
          })
          .catch((error) => {
            if (error.message === 'TooManyErrors') {
              console.log(`Too many server errors. Pause getting all addresses for ${language} channels`)
              flag = false
            } else { console.log(`Warning: ${error.message}`) }
          })
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
  }, 60000 * 15)
  setInterval(async () => {
    let  hrstart = process.hrtime()
    console.log(`${new Date()} - Writing topK streams for ${languages[writeCounter]} channels into database`)
    await write(languages[writeCounter])
    console.log(`${new Date()} - Finished writing topK streams for ${languages[writeCounter]} channels into database`)
    console.info('Finished writing : %ds %dms', process.hrtime(hrstart)[0], process.hrtime(hrstart)[1] / 1000000)
    writeCounter += 1
    if ((writeCounter % languages.length) === 0) { writeCounter = 0 }
  }, 60000 * 10)
}

module.exports = { record }

if (require.main === module) {
  record(config.vpn_host.ip, config.vpn_host.country, config.languages, config.viewer_percentage)
  //record('211.197.11.10', 'ko', ['ko'], 0.8)
}
