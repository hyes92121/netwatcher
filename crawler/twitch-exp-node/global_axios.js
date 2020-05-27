const axios = require("axios");
const URL = require ("url");
const net = require("net");
const {getAddress} = require('./local_dns_cache.js')
const global_axios = axios.create({})

global_axios.interceptors.request.use( async (config) =>{
    let url = URL.parse(config.url);
    if (net.isIP(url.hostname)) {
        //skip all
        return config;
    }else{
        config.headers.Host = url.hostname 
        url.hostname = await getAddress(url.hostname)
        delete url.host
        config.url = URL.format(url)
        return config;
    }
});
module.exports = {global_axios}