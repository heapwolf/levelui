# node-du
A simple JavaScript / Node.js implementation of `du -sb`. Available in npm as *du*

```js
require('du')('/home/rvagg/.npm/', function (err, size) {
  console.log('The size of /home/rvagg/.npm/ is:', size, 'bytes')
})
```

Also comes with a `dujs` command if installed with `npm install du -g`, just in case `du -sb` was too many 2 too many characters for you to type.

## options

An optional `options` object may be passed as the second argument. Currently there is only one option, a `'filter'` function that is passed a full file path and is expected to return a truthy/falsy value to indicate whether the file is included in size calculations.

```js
du(
    '/tmp/foo.leveldb/'
  , { filter: function (f) { return /\.sst$/.test(f) } }
  , function (err, size) {
      console.log('The size of the sst files in /tmp/foo.leveldb/ is:', size, 'bytes')
    }
)
```

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