var mkfiletree   = require('mkfiletree')
  , assert       = require('assert')
  , readfiletree = require('./readfiletree')

  , mkfixture = function () {
      return {
          'foo.txt': 'FOO!'
        , 'bar': {
              'bang': {
                  '1.dat': '1\n'
                , '2.dat': '2\n\n'
                , '3.dat': '3\n\n\n'
              }
            , 'BAM': 'WOO HOO!!!\n'
          }
      }
    }

mkfiletree.makeTemp('readfiletree_test', mkfixture(), function (err, dir) {
  assert(!err)
  assert(dir)
  readfiletree(dir, function (err, obj) {
    assert(!err)
    assert.deepEqual(obj, mkfixture())
  })
})