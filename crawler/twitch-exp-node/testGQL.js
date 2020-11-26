// const axios = require('axios')
// axios.defaults.headers.common['Client-Id'] = 'kimne78kx3ncx6brgo4mv6wki5h1ko' // for all requests
// const query = 'query user(login:"faker") {\n followers(first:25) {\n totalCount\n edges {\n followedAt\n node {\n displayName\n }\n }\n }\n }\n }\n'
// axios({
//   url: 'https://gql.twitch.tv/gql',
//   method: 'POST',
//   data: [{
//     operationName: 'user',
//     query: query
//   }]
// }).then(res => console.log(res.data, res.data[0].errors[0])).catch(err => console.log(err))
