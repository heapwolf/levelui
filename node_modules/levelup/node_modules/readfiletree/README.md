# node-readfiletree

Deserialize an file/directory tree into an object. Available in npm as *readfiletree*

Particularly useful for testing where you need to do a `deepEqual()` on a simple tree of files. **See [node-mkfiletree](https://github.com/rvagg/node-mkfiletree) for file tree serialization.**

### require('readfiletree')(directory, callback)

Read the directory and the files it contains, recursively, and return an object representing the directory structure with nodes containing the utf8 string contents of each file. The arguments of the callback are: `(err, object)`.

Using both *mkfiletree* and *readfiletree* we can do the following:

```js
require('mkfiletree').makeTemp(
  'testfiles',
  {
    'adir': {
      'one.txt': '1\n2\n3\n',
      'two.txt': 'a\nb\nc\n',
      'deeper': {
        'depths.txt': 'whoa...'
      }
    },
    'afile.txt': 'file contents'
  },
  function (err, dir) {
    require('readfiletree')(dir, function (err, obj) {
      console.log(obj)
    })
  }
)
```

The directory structre created above looks like the following:

```
$ find /tmp/testfiles11240-23530-r7rs3 -type f -exec sh -c "echo '\n{}: ' && cat '{}'" \;
  →  /tmp/testfiles11240-23530-r7rs3/afile.txt: 
      file contents
      /tmp/testfiles11240-23530-r7rs3/adir/deeper/depths.txt: 
      whoa...
      /tmp/testfiles11240-23530-r7rs3/adir/two.txt: 
      a
      b
      c

      /tmp/testfiles11240-23530-r7rs3/adir/one.txt: 
      1
      2
      3

```

And the output of the program should be the same as the input to *mkfiletree*:

```js
{
  'adir': {
    'one.txt': '1\n2\n3\n',
    'two.txt': 'a\nb\nc\n',
    'deeper': {
      'depths.txt': 'whoa...'
    }
  },
  'afile.txt': 'file contents'
}
```

## Contributing

Tests can be run with `npm test`. I'm more than happy to receive contributions so fork away!

## Synchronous version

No, there is no sync version, do it async, it's good for your health and contains additional vitamin C, B1, B2 and folate.


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