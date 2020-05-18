const axios = require('axios')

function twitchAPI (path, args) {
  const api = `https://api.twitch.tv${path}`
  const options = {
    headers: {
      Accept: 'application/vnd.twitchtv.v5+json',
      'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko'
    },
    params: { ...{ as3: 't' }, ...args }
  }

  return axios.get(api, options)
}

const twitchAPIAsync = async (path, args) => {
  const api = `https://api.twitch.tv${path}`
  const options = {
    headers: {
      Accept: 'application/vnd.twitchtv.v5+json',
      'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko'
    },
    params: { ...{ as3: 't' }, ...args }
  }

  try {
    const response = await axios.get(api, options)
    return response
  } catch (error) {
    console.log(error)
  }
}

function usherAPI (path, args) {
  const api = `https://usher.ttvnw.net${path}`
  const options = {
    params: { ...{ client_id: 'kimne78kx3ncx6brgo4mv6wki5h1ko' }, ...args }
  }
  return axios.get(api, options)
}

function hostingAPI (path, args) {
  const api = `https://tmi.twitch.tv${path}`
  const options = {
    params: { ...{ client_id: 'kimne78kx3ncx6brgo4mv6wki5h1ko' }, ...args }
  }
  return axios.get(api, options)
}

module.exports = { twitchAPI, usherAPI, hostingAPI, twitchAPIAsync }
