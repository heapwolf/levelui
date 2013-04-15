/*global delayed:true, buster:true, D:true */

if (typeof process != 'undefined' && typeof module != 'undefined' && typeof require != 'undefined') {
  // Node
  delayed = 'success'
  delayed = require('./delayed')
  buster = require('buster')
}

D = delayed.noConflict()

var expectedNullCtx = typeof window != 'undefined' ? window : null

buster.testCase('Delayed', {

    'noConflict': function () {
      assert.equals(delayed, 'success')
      assert(D)
      assert.isFunction(D.delayed)
    }

  , 'delay()': {
        'no-arg 100ms': function (done) {
          var spy = this.spy()

          D.delay(spy, 0.1)

          assert.equals(spy.callCount, 0)

          setTimeout(function () { assert.equals(spy.callCount, 0) }, 50)
          setTimeout(function () { assert.equals(spy.callCount, 0) }, 75)
          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args.length, 0)
            assert.same(spy.thisValues[0], expectedNullCtx)
            done()
          }, 110)
        }

      , 'curried arguments': function (done) {
          var spy = this.spy()
            , ctx = {}

          D.delay(spy, 0.01, ctx, 'foo', 'bar')

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args, [ 'foo', 'bar' ])
            assert.same(spy.thisValues[0], ctx)
            done()
          }, 20)
        }

      , 'cancelable': function (done) {
          var spy = this.spy()
            , timeout = D.delay(spy, 0.1)

          assert.equals(spy.callCount, 0)
          clearTimeout(timeout)

          setTimeout(function () {
            assert.equals(spy.callCount, 0)
            done()
          }, 20)
        }
    }

  , 'defer()': {
        'no-arg': function (done) {
          var spy = this.spy()

          D.defer(spy)

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args.length, 0)
            assert.same(spy.thisValues[0], expectedNullCtx)
            done()
          }, 5)
        }

      , 'curried arguments': function (done) {
          var spy = this.spy()
            , ctx = {}

          D.defer(spy, ctx, 'foo', 'bar')

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args, [ 'foo', 'bar' ])
            assert.same(spy.thisValues[0], ctx)
            done()
          }, 5)
        }

      , 'cancelable': function (done) {
          var spy = this.spy()
            , timeout = D.defer(spy)

          assert.equals(spy.callCount, 0)
          clearTimeout(timeout)

          setTimeout(function () {
            assert.equals(spy.callCount, 0)
            done()
          }, 5)
        }
    }

  , 'delayed()': {
        'no-arg 100ms': function (done) {
          var spy = this.spy()

          D.delayed(spy, 0.1)()

          assert.equals(spy.callCount, 0)

          setTimeout(function () { assert.equals(spy.callCount, 0) }, 50)
          setTimeout(function () { assert.equals(spy.callCount, 0) }, 75)
          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args.length, 0)
            assert.same(spy.thisValues[0], expectedNullCtx)
            done()
          }, 110)
        }

      , 'curried arguments': function (done) {
          var spy = this.spy()
            , ctx = {}

          D.delayed(spy, 0.01, ctx, 'foo', 'bar')('bang', 'boo')

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args, [ 'foo', 'bar', 'bang', 'boo' ])
            assert.same(spy.thisValues[0], ctx)
            done()
          }, 20)
        }

      , 'multiple calls, curried': function (done) {
          var spy = this.spy()
            , ctx = {}
            , fn = D.delayed(spy, 0.01, ctx, 'spicy')

          fn('foo', 'bar')

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args, [ 'spicy', 'foo', 'bar' ])
            assert.same(spy.thisValues[0], ctx)
            fn('boom', 'bang')

            setTimeout(function () {
              assert.equals(spy.callCount, 2)
              assert.equals(spy.secondCall.args, [ 'spicy', 'boom', 'bang' ])
              assert.same(spy.thisValues[1], ctx)
              done()
            }, 20)
          }, 20)
        }
    }

  , 'deferred()': {
        'no-arg': function (done) {
          var spy = this.spy()

          D.deferred(spy)()

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args.length, 0)
            assert.same(spy.thisValues[0], expectedNullCtx)
            done()
          }, 5)
        }

      , 'curried arguments': function (done) {
          var spy = this.spy()
            , ctx = {}

          D.deferred(spy, ctx, 'foo', 'bar')('bang', 'boo')

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args, [ 'foo', 'bar', 'bang', 'boo' ])
            assert.same(spy.thisValues[0], ctx)
            done()
          }, 5)
        }

      , 'multiple calls, curried': function (done) {
          var spy = this.spy()
            , ctx = {}
            , fn = D.deferred(spy, ctx, 'spicy')

          fn('foo', 'bar')

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args, [ 'spicy', 'foo', 'bar' ])
            assert.same(spy.thisValues[0], ctx)
            fn('boom', 'bang')

            setTimeout(function () {
              assert.equals(spy.callCount, 2)
              assert.equals(spy.secondCall.args, [ 'spicy', 'boom', 'bang' ])
              assert.same(spy.thisValues[1], ctx)
              done()
            }, 5)
          }, 5)
        }
    }

  , 'cumulativeDelayed()': {
        'no-arg 100ms': function (done) {
          var spy = this.spy()

          D.delayed(spy, 0.1)()

          assert.equals(spy.callCount, 0)

          setTimeout(function () { assert.equals(spy.callCount, 0) }, 50)
          setTimeout(function () { assert.equals(spy.callCount, 0) }, 75)
          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args.length, 0)
            assert.same(spy.thisValues[0], expectedNullCtx)
            done()
          }, 110)
        }

      , 'curried arguments': function (done) {
          var spy = this.spy()
            , ctx = {}

          D.delayed(spy, 0.01, ctx, 'foo', 'bar')('bang', 'boo')

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args, [ 'foo', 'bar', 'bang', 'boo' ])
            assert.same(spy.thisValues[0], ctx)
            done()
          }, 20)
        }

      , 'multiple calls within same tick, curried': function (done) {
          var spy = this.spy()
            , ctx = {}
            , fn = D.cumulativeDelayed(spy, 0.01, ctx, 'spicy')

          fn('foo1', 'bar1')
          fn('foo2', 'bar2')
          fn('foo3', 'bar3')

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 1)
            assert.equals(spy.firstCall.args, [ 'spicy', 'foo3', 'bar3' ])
            assert.same(spy.thisValues[0], ctx)
            done()
          }, 20)
        }

      , 'multiple calls across ticks, curried': function (done) {
          var spy = this.spy()
            , ctx = {}
            , fn = D.cumulativeDelayed(spy, 0.05, ctx, 'spicy')

          fn('foo1', 'bar1')

          assert.equals(spy.callCount, 0)

          setTimeout(function () {
            assert.equals(spy.callCount, 0)
            fn('foo2', 'bar2')
            setTimeout(function () {
              assert.equals(spy.callCount, 0)
              fn('foo3', 'bar3')
              setTimeout(function () {
                assert.equals(spy.callCount, 0)
                fn('foo4', 'bar4')
                setTimeout(function () {
                  assert.equals(spy.callCount, 1)
                  assert.equals(spy.firstCall.args, [ 'spicy', 'foo4', 'bar4' ])
                  assert.same(spy.thisValues[0], ctx)
                  done()
                }, 100)
              }, 30)
            }, 30)
          }, 30)
        }
    }
})