const dns = require('dns')
const axios = require("axios");
const net = require("net");
const URL = require ("url");
const LRU = require("lru-cache")
const stringify = require('json-stringify-safe');
const util = require('util')

const dnsResolve = util.promisify(dns.resolve)

const local_dns = {lru_cache_config:{ 
                                    max: 1000,
                                    maxAge: 1000 * 60 * 60 },
                          options:{
                                    dnsTtlMs: 50000, //time to wait for updating actively used entry after last update
                                    dnsIdleTtlMs: 1000 * 60 * 30, //how long to wait before removing an unused entry
                                    dnsPrunePeriod: 1000 * 60 * 45, // cache pruning for every 45 mintues
                                    dnsEntriesRefreshMs: 3000 //refresh rate for updating entries and deleting unused entries
                          },
                          stats:{
                            dnsEntries: 0,
                            refreshed: 0,
                            hits: 0,
                            misses: 0,
                            idleExpired: 0,
                            errors: 0,
                            lastError: 0,
                          },
                          entriesRefreshing: false,
                          refreshProcess: undefined,
                          pruneProcess: undefined,
                          cache: undefined
}
// dnsEntry = {
//   host: 'www.google.com',
//   ips: [
//     '34.205.98.207',
//     '3.82.118.51',
//   ],
//   nextIdx: 0, return ip in next index from ips
//   lastUsedMs: 1555771516581, last time this entry is used in millisecond
//   lastUpdatedMs: 1555771516581, last time this entry is updated in millisecond
//   exceptional: false
// }
class LocalDnsCache{
    constructor(){
        console.log(`Initiating DNS cache...`)
        this.cache = new LRU({ 
                            max: 1000,
                            maxAge: 1000 * 60 * 60 })
        this.stats = {
            dnsEntries: 0,
            refreshed: 0,
            hits: 0,
            misses: 0,
            idleExpired: 0,
            errors: 0,
            lastError: 0,
        }
        this.entriesRefresh = false;
        this.refreshProcess = null;
        this.pruneProcess = null;
        this.startPeriodicCachePrune()
        this.startEntriesRefresh()
    }
    startPeriodicCachePrune() {
        if (local_dns.pruneProcess) clearInterval(local_dns.pruneProcess)
        local_dns.pruneProcess = setInterval(() => local_dns.cache.prune(), local_dns.options.dnsPrunePeriod)
    }
    startEntriesRefresh() {
        if (local_dns.refreshProcess) clearInterval(local_dns.refreshProcess)
        refreshProcess = setInterval(entriesRefresh, local_dns.dnsEntriesRefreshMs)
    }
    async entriesRefresh(){
        let dnsTtlMs = local_dns.options.dnsTtlMs
        let dnsIdleTtlMs = local_dns.options.dnsIdleTtlMs
        if(local_dns.entriesRefreshing) return
        local_dns.entriesRefreshing = true
        try {
          local_dns.cache.forEach(async (value,key) =>{
              try{
                  if(value.lastUpdatedMs + dnsTtlMs > Date.now()){
                      return // havent reach update time for this entry 
                  }
                  if(value.lastUsedMs + dnsIdleTtlMs <= Date.now()){
                      ++local_dns.stats.idleExpired
                      local_dns.cache.del(key)
                      return
                  }
                  const ips = await dnsResolve(value.host)
                  value.ips = ips
                  value.lastUpdatedMs = Date.now()
                  local_dns.cache.set(key,value)
                  ++local_dns.stats.refreshed
                  
              } catch (err) {
                console.log(`Error refreshing host: ${key}, ${stringify(value)}, ${err.message}`)
                local_dns.stats.lastError = err
              } 
          })
        } catch (err){
            console.log(`Error refreshing DNS entries, ${err.message}`)
        } finally {
            local_dns.entriesRefreshing = false //stop refreshing
            // console.log( local_dns.cache.values())
        }
    }
    
}


async function entriesRefresh(){
    let dnsTtlMs = local_dns.options.dnsTtlMs
    let dnsIdleTtlMs = local_dns.options.dnsIdleTtlMs
    if(local_dns.entriesRefreshing) return
    local_dns.entriesRefreshing = true
    try {
      local_dns.cache.forEach(async (value,key) =>{
          try{
              if(value.lastUpdatedMs + dnsTtlMs > Date.now()){
                  return // havent reach update time for this entry 
              }
              if(value.lastUsedMs + dnsIdleTtlMs <= Date.now()){
                  ++local_dns.stats.idleExpired
                  local_dns.cache.del(key)
                  return
              }
              const ips = await dnsResolve(value.host)
              value.ips = ips
              value.lastUpdatedMs = Date.now()
              local_dns.cache.set(key,value)
              ++local_dns.stats.refreshed
              
          } catch (err) {
            console.log(`Error refreshing host: ${key}, ${stringify(value)}, ${err.message}`)
            local_dns.stats.lastError = err
          } 
      })
    } catch (err){
        console.log(`Error refreshing DNS entries, ${err.message}`)
    } finally {
        local_dns.entriesRefreshing = false //stop refreshing
        // console.log( local_dns.cache.values())
    }
}

function getStats(){
    return local_dns.stats
}

async function getAddress(host){
    let dnsEntry = local_dns.cache.get(host)
    if (dnsEntry) {
        ++local_dns.stats.hits
        dnsEntry.lastUsedTs = Date.now()
        // eslint-disable-next-line no-plusplus
        const ip = dnsEntry.ips[dnsEntry.nextIdx++ % dnsEntry.ips.length] // round-robin
        local_dns.cache.set(host, dnsEntry)
        return ip
    }
    ++local_dns.stats.misses
    //use dns.resolve to find ip
    const ips = await dnsResolve(host)
    dnsEntry = {
        host,
        ips,
        nextIdx: 0,
        lastUsedMs: Date.now(),
        lastUpdatedMs: Date.now(),
    }
    const ip = dnsEntry.ips[0]
    local_dns.cache.set(host, dnsEntry)
    console.log(local_dns.cache.values())
    return ip  
}
// axios.interceptors.request.use( async (config) =>{
//     let url = URL.parse(config.url);
//     if (net.isIP(url.hostname)) {
//         //skip all
//         return config;
//     }else{
//         config.headers.Host = url.hostname 
//         url.hostname = await getAddress(url.hostname)
//         delete url.host
//         config.url = URL.format(url)
//         return config;
//     }
// });

module.exports = { local_dns, init, startPeriodicCachePrune, startEntriesRefresh, entriesRefresh, getStats, getAddress }
// init()
// console.log(getStats())
// axios
//     .get('https://www.google.com')
//     .then(function(response) {
//         console.log(response.config);
//     })
//     .catch(function(response) {
//         console.log(response);
//     })
//     .finally(
//         console.log(getStats())
//     );
// axios
//     .get('https://api.twitch.tv')
//     .then(function(response) {
//         console.log(response.config);
//     })
//     .catch(function(response) {
//         console.log(response);
//     });

