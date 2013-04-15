#!/usr/bin/env node

if (process.argv.length < 3) {
  console.error('Usage: dujs <directory | file>')
  return process.exit(-1)
}

require('./')(process.argv[2], function (err, size) {
  if (err) {
    console.error(err)
    return process.exit(-1)
  }
  console.log(size, process.argv[2])
})