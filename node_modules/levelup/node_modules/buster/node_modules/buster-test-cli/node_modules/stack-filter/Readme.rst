============
stack-filter
============

    Cleaner and more readable stack traces for all

.. raw:: html

    <a href="http://travis-ci.org/busterjs/stack-filter" class="travis">
      <img src="https://secure.travis-ci.org/busterjs/stack-filter.png">
    </a>

``stack-filter`` is a tiny module that strips out unwanted elements of a stack
trace and optimizing the remaining items for readability. ``stack-filter`` works
in browsers (including old and rowdy ones, like IE6) and Node. It will define
itself as an AMD module if you want it to (i.e. if there's a ``define`` function
available).

API
---

``stackFilter(stackTrace[, cwd])``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Accepts a stack trace as a string (e.g. one obtained from ``error.stack``) and
an optional working directory, and returns a pruned stack trace in the form of
an array of lines.

The ``cwd`` option is used to shorten paths by removing common prefixes. For
example, Buster.JS uses this option to trim down URLs like
``http://localhost:1111/sessions/0d15095714a93cd8f9a42e97b0b280fa1550a6ac/resources/lib/file.js``
to ``lib/files.js``. The current working directory is optional, and may be
either a string or a regular expression.

::

    var stackFilter = require("stack-filter");

    stackFilter.filters.push("jquery.js"); // Ignore lines from within jQuery
    stackFilter(error.stack); //=> Lines, excluding any lines from within jQuery

``stackFilter.filters``
~~~~~~~~~~~~~~~~~~~~~~~

This array contains all the filters. A filter may be either a string (partial
match against path) or a regular expression.
