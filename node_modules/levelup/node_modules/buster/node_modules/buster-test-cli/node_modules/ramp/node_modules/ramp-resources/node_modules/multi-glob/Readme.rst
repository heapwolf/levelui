.. default-domain:: js
.. highlight:: javascript

==========
multi-glob
==========

    Glob all the patterns!

.. raw:: html

    <a href="http://travis-ci.org/busterjs/multi-glob" class="travis">
      <img src="https://secure.travis-ci.org/busterjs/multi-glob.png">
    </a>

``multi-glob`` is a small wrapper around `node-glob
<https://github.com/isaacs/node-glob>`_ that allows you to glob multiple
patterns in one go, and optionally treat it as a failure if any one pattern
matches no files.

If you just need to glob multiple patterns in one go, you can simply do:

::

    var glob = require("glob");
    glob("{all,the,patterns}", cb);

However, with ``multi-glob``, you can do a "strict" glob, which will cause an
error if e.g. the pattern ``"the"`` in the previous example matched no files.

API
===

``multiGlob.glob(patterns[, options], callback);``
--------------------------------------------------

Works like `node-glob's glob <https://github.com/isaacs/node-glob>`_, with the
following two exceptions:

* ``patterns`` may be either a string pattern or an array of string patterns
* ``options`` may include ``strict``. When set to ``true``, ``glob`` will yield
  an error if either one of ``patterns`` matches no files.
