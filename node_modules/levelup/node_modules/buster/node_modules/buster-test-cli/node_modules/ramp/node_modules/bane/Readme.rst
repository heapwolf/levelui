.. default-domain:: js
.. highlight:: javascript

====
BANE
====

    Browser globals, AMD and Node Events

.. raw:: html

    <a href="http://travis-ci.org/busterjs/bane" class="travis">
      <img src="https://secure.travis-ci.org/busterjs/bane.png">
    </a>

``bane`` is a small event emitter library that works in browsers (including old
and rowdy ones, like IE6) and Node. It will define itself as an AMD module if
you want it to (i.e. if there's a ``define`` function available).

``bane`` is not entirely API compatible with Node's event emitter, but it does
provide the iconic ``on`` and ``emit`` functions.

Developers - Running tests
==========================

::

    npm install
    ./node_modules/buster/bin/buster-test --node
    ./node_modules/buster/bin/buster-server
    ./node_modules/buster/bin/buster-test --browser

Emitter creation API
====================

``var emitter = bane.createEventEmitter([object]);``
----------------------------------------------------

Create a new event emitter. If an object is passed, it will be modified by
adding the event emitter methods (see below).

Emitter API
===========

``on(event, listener)``
-----------------------

Register the ``listener`` function to be called when the emitter emits the
``event`` (which is a string).

``on(listener)``
----------------

Register the ``listener`` function as a "supervisor". It will be called for
any event emitted from the emitter.

``off(event, listener)``
------------------------

Remove a previously registered ``listener`` function for the specified ``event``
(which is a string). If the function has not previously been registered, it is
silently ignored.

``once(event, listener)``
-------------------------

Register a ``listener`` function for the given ``event`` (which is a string)
only once. After the first event has been emitted, the listener is removed.

``bind(object)``
----------------

Register all methods on ``object`` as listeners for the event named as the
method name. Convenient way to bind many event listeners in one go:

::

    var listener = {
        start: function () {
            console.log("Started!");
        },

        end: function () {
            console.log("Ended");
        }
    };

    emitter.bind(listener);

The above example will bind ``listener.start`` to the ``"start"`` event and vice
versa with ``end``. Note that property names can be quoted to bind to any kind of
event name (e.g. ``"test:start"``).

``bind(object, events)``
------------------------

Binds methods on ``object`` to corresponding events (see ``bind(object)``
above), but instead of binding all methods on the object, only binds the
events listed in the provided ``events`` array.

``emit(event[, data1[, data2[, ...]]])``
----------------------------------------

Emit the ``event`` (which is a string) with optional data. Will cause all
registered listeners for the named event to be called. If additional arguments
are provided, the listeners will be called with them.

License
=======

Two-clause BSD-license, see `LICENSE <https://raw.github.com/busterjs/bane/master/LICENSE>`_
