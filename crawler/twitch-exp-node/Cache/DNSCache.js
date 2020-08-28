const dns = require('dns')
const util = require('util')
const BaseCache = require('./BaseCache.js')

class DnsCache extends BaseCache {
  constructor() {
    super()
    this.childClass = 'DnsCache'
    this.dnsLookup = util.promisify(dns.lookup)
  }

  async onMiss(hostname) {
    await this.dnsLookup(hostname).then(response => { this.cache[hostname] = response.address })
  }
}

const localDnsCache = {
  cache: new DnsCache()
}

const lookupDNSCache = async (hostname) => {
  return localDnsCache.cache.lookup(hostname)
}

module.exports = { lookupDNSCache }
