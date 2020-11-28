const Pen = require('../Pen.js')

class intervalGenerator {
  constructor(mode, max, min) {
    this.mode = mode
    this.max = max
    this.min = min
    this.serverCount = 0
    this.base = (this.max - this.min) / 10
    this.totalIntervals = 0
    this.epsilon = (this.max - this.min) / 10
  }

  generateInterval() {
      this.totalIntervals += 1
      var interval
      if (this.mode == 'backoff-strict'){
          if (this.serverCount == 0) {
            // irregular behavior, an Error might have happened
            interval = this.min
          } else {
          // Server Count - Total Request Ratio
          var SCTR = this.serverCount/this.totalIntervals
          // interval strictly between max and min
          interval = this.min + (this.max - this.min) * ((1 - SCTR + this.epsilon) ** SCTR)
          }
      } else if (this.mode == 'exp-backoff') {
          if (this.serverCount == 0) {
            // irregular behavior, an Error might have happened
            interval = this.min
          } else {
            // exponential backoff 
            interval = this.min + this.base * (2**(this.totalIntervals/this.serverCount))
          }
      } else {
        // Default random
        interval = Math.random() * (this.max - this.min) + this.min 
      }
      Pen.write(`Interval: ${interval}`, 'blue')
      return interval
  }

  updateServerCount(serverCount) {
      this.serverCount = serverCount
  }
}

module.exports = intervalGenerator
