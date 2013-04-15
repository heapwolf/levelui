# buster-evented-logger

[![Build status](https://secure.travis-ci.org/busterjs/buster-evented-logger.png?branch=master)](http://travis-ci.org/busterjs/buster-evented-logger)

buster-evented-logger is an evented console logger. Rather than writing to an
output stream, it simply emits events. It supports log levels and formatting of
arguments, suitable for JSON serialization. By default the logger uses
buster-format for ascii formatting of objects passed to it.

# Running tests

    $ ./run-tests

To run tests in the browser:

    node_modules/buster-util/jstdhtml

Open test/test.html in a browser

You can also run JsTestDriver from the root directory.
