/*****************************************************************
  * Delayed: A collection of setTimeout-related function wranglers
  * Copyright (c) Rod Vagg (@rvagg) 2012
  * https://github.com/rvagg/delayed
  * License: MIT
  */

!(function (name, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define === 'function' && define.amd) define(name, definition)
  else this[name] = definition()
}('delayed', function () {

  var context      = this
    , old          = context.delayed
    , deferSeconds = 0.001

    , slice = function (arr, i) {
        return Array.prototype.slice.call(arr, i)
      }

    , delay = function (fn, seconds, ctx) {
        var args = slice(arguments, 3)
        return setTimeout(function() {
          fn.apply(ctx || null, args)
        }, seconds * 1000)
      }

    , defer = function (fn, ctx) {
        return delay.apply(null, [ fn, deferSeconds, ctx ].concat(slice(arguments, 2)))
      }

    , delayed = function () {
        var args = slice(arguments)
        return function () {
          return delay.apply(null, args.concat(slice(arguments)))
        }
      }

    , deferred = function (fn, ctx) {
        return delayed.apply(null, [ fn, deferSeconds, ctx ].concat(slice(arguments, 2)))
      }

    , cumulativeDelayed = function (fn, seconds, ctx) {
        var args = slice(arguments, 3)
          , timeout = null

        return function() {
          var _args = slice(arguments)
            , f = function() {
                return fn.apply(ctx || null, args.concat(_args))
              }
          if (timeout != null)
            clearTimeout(timeout)
          return timeout = setTimeout(f, seconds * 1000)
        }
      }

    , noConflict = function () {
        context.delayed = old
        return this
      }


  return {
      delay             : delay
    , defer             : defer
    , delayed           : delayed
    , deferred          : deferred
    , noConflict        : noConflict
    , cumulativeDelayed : cumulativeDelayed
  }

}));