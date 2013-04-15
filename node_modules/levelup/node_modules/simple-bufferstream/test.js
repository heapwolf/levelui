var tape   = require('tape')
  , fs     = require('fs')
  , concat = require('concat-stream')
  , bogan  = require('boganipsum')
  , rimraf = require('rimraf')
  , sbuff  = require('./')

tape('test simple concat', function (t) {
  t.plan(2)

  var inp = new Buffer(bogan())

  sbuff(inp).pipe(
    concat(function (err, body) {
      t.notOk(err, 'no error')

      t.equals(body.toString(), inp.toString(), 'output = input')
      t.end()
    })
  )
})

tape('test against fs write-stream', function (t) {
  t.plan(1)

  var inp = new Buffer(bogan())
    , f   = '$$.test.$$'

  sbuff(inp)
    .pipe(fs.createWriteStream(f))
    .on('error', function (err) {
      t.fail(err)
      rimraf(f, t.end.bind(t))
    })
    .on('close', function () {
      var outp = fs.readFileSync(f)
      t.equals(outp.toString(), inp.toString(), 'output = input')
      rimraf(f, t.end.bind(t))
    })
})


tape('test pause & resume', function (t) {
  t.plan(3)

  var inp    = new Buffer(bogan())
    , stream = sbuff(inp)
    , ccstream

  stream.pipe(
    ccstream = concat(function (err, body) {
      t.notOk(err, 'no error')
      t.equals(body.toString(), inp.toString(), 'output = input')
      t.end()
    })
  )

  stream.pause()

  setTimeout(function () {
    t.equal(ccstream.body.length, 0, 'nothing in concat-stream, stream is paused')
    stream.resume()
  }, 100)
})