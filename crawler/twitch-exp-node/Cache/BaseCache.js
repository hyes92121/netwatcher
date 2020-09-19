class BaseCache {
  constructor () {
    this.cache = {}
    this.childClass = null
  }

  lookup (entry) {
    return new Promise(async (resolve, reject) => {
      if (!this.cache[entry]) {
        console.log(`${this.childClass} cache miss: ${entry}`)
        await this.onMiss(entry)
      } 
      resolve(this.cache[entry])
    })
  }

  async onMiss () {
    throw new Error('Function onMiss is not implemented')
  }
}

module.exports = BaseCache
