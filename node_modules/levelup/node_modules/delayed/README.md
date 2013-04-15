# Delayed

**Delayed** is a collection of helper functions for your functions, using `setTimeout()` to delay and defer.

**Delayed** is designed for use across JavaScript platforms, including the browser and within Node.js. It conforms to CommonJS and AMD and can be included within an [Ender](http://ender.no.de) build. It is available in npm (for Node.js and Ender) as *"delayed"* or can be [downloaded](https://raw.github.com/rvagg/delayed/master/delayed.js) straight from GitHub repository.

**Delayed** is tested against all modern browsers, plus Internet Explorer 6 and above.

## API

 * [delay()](#delay)
 * [defer()](#defer)
 * [delayed()](#delayed)
 * [deferred()](#deferred)
 * [cumulativeDelayed()](#cumulativeDelayed)
 * [noConflict()](#noConflict)

---------------------------------------------

<a name="delay"></a>
### delay(fn, seconds)<br/>delay(fn, seconds, context)<br/>delay(fn, seconds, context, arg1, arg2...)

*Available in an Ender build as `$.delay(fn, seconds...)`*

`delay()` is an interface to `setTimeout()` but with better `this` handling, cross-browser argument passing and seconds instead of milliseconds.

Example:

```js
var D = delayed // require('delayed') in Node.js or $ in Ender

// print "beep" to the console after 1/2 a second
D.delay(function () { console.log('beep') }, 0.5)

// print "Hello world" after 5 seconds
D.delay(
    function (a, b) { console.log(this[a], this[b]) }
  , 5                                  // timeout
  , { 'foo': 'Hello', 'bar': 'world' } // context, or 'this'
  , 'foo'                              // first argument
  , 'bar'                              // second argument
)

```

`delay()` returns the timer reference from `setTimeout()` so it's possible to retain it and call `clearTimeout(timer)` to cancel execution.

---------------------------------------------

<a name="defer"></a>
### defer(fn)<br/>defer(fn, context)<br/>defer(fn, context, arg1, arg2...)

*Available in an Ender build as `$.delay(fn, seconds...)`*

`defer()` is essentially a shortcut for `delay(fn, 0.001...)`, which achieves a similar effect to `process.nextTick()` in Node.js or the proposed `setImmediate()` that we should start seeing in browsers soon (it exists in IE10). Use it to put off execution until the next time the browser/environment is ready to execute JavaScript. Given differences in timer resolutions across browsers, the exact timing will vary.

*Note: future versions of **delayed** will likely detect for and use `setImmediate()` and `process.nextTick()` for deferred functions.*

`defer()` returns the timer reference from `setTimeout()` so it's possible to retain it and call `clearTimeout(timer)` to cancel execution, as long as it's done within the same execution *tick*.

---------------------------------------------

<a name="delayed"></a>
### delayed(fn, seconds)<br/>delayed(fn, seconds, context)<br/>delayed(fn, seconds, context, arg1, arg2...)

*Available in an Ender build as `$.delayed(fn, seconds...)`*

Returns a new function that will delay execution of the original function for the specified number of seconds when called.

Example:

```js
var D = delayed // require('delayed') in Node.js or $ in Ender

// a new function that will print "beep" to the console after 1/2 a second when called
var delayedBeeper = D.delay(function () { console.log('beep') }, 0.5)

delayedBeeper()
delayedBeeper()
delayedBeeper()

// 1/2 a second later we should see:
//   beep
//   beep
//   beep
// each will have executed on a different timer
```

The new delayed function will retur the timer reference from `setTimeout()` so it's possible to retain it and call `clearTimeout(timer)` to cancel execution *of that particular call*.

---------------------------------------------

<a name="deferred"></a>
### deferred(fn)<br/>deferred(fn, context)<br/>deferred(fn, context, arg1, arg2...)

*Available in an Ender build as `$.deferred(fn...)`*

Returns a new function that will defer execution of the original function, in the same manner that `defer()` defers execution.

The new delaying function will return the timer reference from `setTimeout()` so it's possible to retain it and call `clearTimeout(timer)` to cancel execution *of that particular call*, as long as it's done within the same execution *tick*.

---------------------------------------------

<a name="cumulativeDelayed"></a>
### cumulativeDelayed(fn, seconds)<br/>cumulativeDelayed(fn, seconds, context)<br/>cumulativeDelayed(fn, seconds, context, arg1, arg2...)

*Available in an Ender build as `$.cumulativeDelayed(fn, seconds...)`*

Returns a new function that will delay execution of the original functino for the specified number of seconds when called. Execution will be **further delayed** for the same number of seconds upon each subsequent call before execution occurs.

The best way to explain this is to show its most obvious use-case: keyboard events in the browser.

```html
<!doctype html>
<html>
<body>
<textarea id="input" style="width: 100%; height: 250px;">Type in here</textarea>
<div id="output" style="border: solid 1px black;">Show in here</div>

<script src="https://raw.github.com/rvagg/delayed/master/delayed.js" type="text/javascript"></script>
<script>
  function render (event) {
    var content = event.target.value
    content = content.replace('&', '&amp;')
                     .replace('>', '&gt;')
                     .replace('<', '&lt;')
                     .replace('\n', '<br>')
    document.getElementById('output').innerHTML = content
  }

  var delayedRender = delayed.cumulativeDelayed(render, 0.5)

  document.getElementById('input').addEventListener('keyup', delayedRender)
</script>
</body>
</html>
```

(You can run this example [here](https://github.com/rvagg/delayed/cumulativeDelayed.html))

`cumulativeDelayed()` is a way of putting off tasks that need to occur in reaction to potentially repeating events, particularly where the task may be expensive or require some time to execute such as an AJAX call.

In our example, we're reacting to keyboard events but instead of running the `render()` function each time a key is pressed, we keep on pushing back execution while keyboard events keep coming in. Only when we have a pause in keyboard events of at least 500ms does `render()` actually get called.

The new delaying function will return the timer reference from `setTimeout()` so it's possible to retain it and call `clearTimeout(timer)` to cancel execution *of that particular call*.

---------------------------------------------

<a name="noConflict"></a>
### noConflict()

Changes the value of 'delayed' back to its original value and returns a reference to *delayed*.

---------------------------------------------

## Contributing

I'm more than happy to consider contributions if they are roughly within the remit of the project. Bugfixes and suggestions for improveents are always welcome! Delayed uses [Buster](http://busterjs.org) for unit testing, simply run `npm install` from within the cloned registry to install Bufer. Tests can be run for Node.js with `npm test`, browsers can be pointed to *tests.html* to run the same suite.

## Licence & copyright

*Delayed* is Copyright (c) 2012 Rod Vagg <@rvagg> and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.