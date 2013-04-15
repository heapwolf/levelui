# node-slow-stream

A throttleable stream, for working in the slow-lane; i.e. good for testing when you need things to slow down. Available in npm as *slow-stream*

## Example

```js
var fs = require('fs')
  , SlowStream = require('slow-stream')

fs.createReadStream('infile', { bufferSize: 64 })
  .pipe(new SlowStream({ maxWriteInterval: 5 }))
  .pipe(fs.createWriteStream('outfile'))
```

Throttling is performed on a per-write basis, so in this example the `ReadStream` from the file is writing 64-byte chunks at a time. The `SlowStream` is only allowing them through at a rate of one per 5ms.

Back-pressure is properly applied so if you're working with properly implemented streams you shouldn't run into memory issues.

## Contributing

Tests can be run with `npm test`. I'm more than happy to receive contributions so fork away!

## Copyright and licence

*Copyright (c) 2012 [Rod Vagg](https://github.com/rvagg) ([@rvagg](https://twitter.com/rvagg))*

Made available under the MIT licence:

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.