const { global_axios } = require('./global_axios.js')
// let promises = [];
// for(i=0;i<10;i++){
//     promises.push(
//         global_axios
//         .get('https://www.google.com').then(response =>{console.lo})
//       )
// }
setInterval(test, 3000)
// Promise.all(promises).then(() => console.log('finished'));
function test(){
    global_axios
        .get('https://api.twitch.tv')
}
