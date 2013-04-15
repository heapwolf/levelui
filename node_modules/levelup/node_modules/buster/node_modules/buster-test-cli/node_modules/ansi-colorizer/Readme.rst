.. default-domain:: js
.. highlight:: javascript

==============
ansi-colorizer
==============

    Dim and bright pretty shell colors

.. raw:: html

    <a href="http://travis-ci.org/busterjs/ansi-colorizer" class="travis">
      <img src="https://secure.travis-ci.org/busterjs/ansi-colorizer.png">
    </a>

``ansi-colorizer`` is a small utility to add ANSI escape sequences to strings to
output them with color. Configuring the colorizer produces an object that may
or may not colorize or brighten text.

`configure(options)`
--------------------

Returns a new colorizer instance. Configuration options are ``color`` and
``bright``. Both are booleans, and both are ``false`` by default. If both
settings are ``false`` (the default), the colorizer will not really do anything.
When ``color`` is ``true``, methods colorize strings. When ``bright`` is
``true``, all color methods will result in the bright color variant.

::

    var ansiColorizer = require("ansi-colorizer");

    var colorizer = ansiColorizer.configure({ color: true, bright: false });
    colorizer.red("Hey"); //=> "\x1b[31mHey\x1b[0m"

    colorizer = ansiColorizer.configure({ color: true, bright: trie });
    colorizer.red("Hey"); //=> "\x1b[1m\x1b[31mHey\x1b[0m"

    colorizer = ansiColorizer.configure();
    colorizer.red("Hey"); //=> "Hey"

``bold(string)``
----------------

Brightens the string.


``red(string)``
---------------

Colors string red.

``yellow(string)``
------------------

Colors string yellow.

``green(string)``
-----------------

Colors string green.

``purple(string)``
------------------

Colors string purple.

``cyan(string)``
----------------

Colors string cyan.

``grey(string)``
----------------

Colors string grey.
