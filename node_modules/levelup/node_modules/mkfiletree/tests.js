var fs = require('fs')
  , path = require('path')
  , assert = require('assert')
  , temp = require('temp')
  , rimraf = require('rimraf')
  , xregexp    = require('xregexp')
  , mkfiletree = require('./mkfiletree')

  , assertFile = function (dir, file, expectedContents) {
      fs.readFile(path.join(dir, file), 'utf-8', function (err, contents) {
        assert.ifError(err)
        assert.equal(contents, expectedContents)
      })
    }

  , assertTreeFileCount = function (dir, count, callback) {
      var total = 0
        , counting = 0
        , finish = function () {
            assert.equal(total, count)
            callback()
          }
        , countDir = function (dir) {
            counting++
            fs.readdir(dir, function (err, list) {
              assert.ifError(err)
              list.forEach(function (d) {
                counting++
                fs.stat(path.join(dir, d), function (err, stat) {
                  assert.ifError(err)
                  if (stat.isDirectory())
                    countDir(path.join(dir, d))
                  else
                    total++
                  if (--counting === 0) finish()
                })
              })
              if (--counting === 0) finish()
            })
          }
      countDir(dir)
    }

  , runTest = function (asTemp) {
      var root = asTemp ? temp.dir : __dirname
        , name = +new Date() + 'foobar'

      fs.readdir(root, function (err, originalList) {
        mkfiletree[asTemp ? 'makeTemp' : 'make'](
            name
          , {
                'foo': 'FOO'
              , 'bam': {
                    'one': '1'
                  , 'two': '2'
                  , 'three': {
                        'a': 'A'
                      , 'b': 'B'
                      , 'c': 'A\nB\nC\n'
                    }
                }
              , 'bar': 'BAR'
            }
          , function(err, madeDir) {
              assert.ifError(err)
              assert(madeDir)
              assert(typeof madeDir == 'string')
              // dir is appropriately named
              if (asTemp)
                assert(new RegExp('^' + xregexp.escape(path.join(temp.dir, name)) + '[^\\/]+$').test(madeDir))
              else
                assert.equal(madeDir, path.join(root, name))

              fs.readdir(root, function (err, newList) {
                assert.ifError(err)
                var list = newList.filter(function (f) { return originalList.indexOf(f) === -1 })
                assert.equal(path.join(root, list[0]), madeDir) // yee haw, we made the dir!
                // test all files and contents
                assertFile(madeDir, 'foo', 'FOO')
                assertFile(madeDir, 'bam/one', '1')
                assertFile(madeDir, 'bam/two', '2')
                assertFile(madeDir, 'bam/three/a', 'A')
                assertFile(madeDir, 'bam/three/b', 'B')
                assertFile(madeDir, 'bam/three/c', 'A\nB\nC\n')
                assertFile(madeDir, 'bar', 'BAR')
                // make sure there are the right number of files in there, no more than expected
                assertTreeFileCount(madeDir, 7, function () {
                  mkfiletree.cleanUp(function (err) {
                    assert.ifError(err)

                    fs.readdir(root, function (err, cleanList) {
                      list = cleanList.filter(function (f) { return originalList.indexOf(f) === -1 })
                      if (asTemp)
                        assert.equal(list.length, 0) // cleanup worked, back where we started!
                      else {
                        // cleanup shouldn't do anything for non-temp dirs
                        assert.equal(list.length, 1)
                        assert.equal(list[0], name)
                        // clean up manually
                        rimraf(path.join(__dirname, name), function () {})
                      }
                    })
                  })
                })
              })
            }
        )
      })
    }

runTest(true)  // makeTemp & cleanUp
runTest(false) // make

console.log('Running... no assertions means no worries!')