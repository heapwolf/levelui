const stream = require('stream')
    , util   = require('util')

var SimpleBufferStream = function (buffer) {
  stream.Stream.call(this)
  this._state  = 'ready'
  this._buffer = buffer
  process.nextTick(this._dump.bind(this))
}

util.inherits(SimpleBufferStream, stream.Stream)

SimpleBufferStream.prototype._dump = function() {
  if (this._state != 'ready')
    return

  this._state = 'done'
  this.emit('data', this._buffer)
  this.emit('end')
  this.emit('close')
}

SimpleBufferStream.prototype.pause = function() {
  if (this._state != 'done')
    this._state = 'paused'
}
SimpleBufferStream.prototype.resume = function() {
  if (this._state == 'done')
    return
  this._state = 'ready'
  this._dump()
}

SimpleBufferStream.prototype.destroy = function() {}

module.exports = function (buffer) {
  return new SimpleBufferStream(buffer)
}