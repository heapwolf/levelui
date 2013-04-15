var Stream = require('stream').Stream
  , util   = require('util')

var instance = 0

function SlowStream (options) {
  this.instance = instance++

  Stream.call(this)

  this.options    = options

  this.writable   = true
  this.readable   = true

  this.queue      = []

  this._lastWrite = process.hrtime()
  this._timeout   = null
  this._ended     = false
  this._paused    = false
}

util.inherits(SlowStream, Stream)

SlowStream.prototype.write = function write (data) {
  this.queue.push(data)
  this.flush()
  return this.queue.length === 0
}

SlowStream.prototype.resume = function resume () {
  this._paused = false
  this.flush()
}

SlowStream.prototype.pause = function pause () {
  this._paused = true
}

SlowStream.prototype.flush = function flush () {
  var interval = process.hrtime(this._lastWrite)
    , gap      = interval[1] / 1000000 - this.options.maxWriteInterval

  if (this._paused) return

  if (this.queue.length) {
    if (gap >= 0) {
      this.emit('data', this.queue.shift())
      this._lastWrite = process.hrtime()
    }

    if (!this._timeout) {
      this._timeout = setTimeout(function () {
        this._timeout = null
        this.flush()
      }.bind(this), gap < 0 ? -gap : this.options.maxWriteInterval)
    }
  } else if (this._ended) {
    if (!this._closed) {
      this._closed = true
      this.emit('end')
      this.emit('close')
    }
  } else {
    this.emit('drain')
  }
}

SlowStream.prototype.end = function end () {
  this._ended = true
  this.flush()
}

SlowStream.prototype.destroySoon = function destroySoon () {
  this.end()
}

SlowStream.prototype.destroy = function destroy () {
  this.end()
}

module.exports = SlowStream