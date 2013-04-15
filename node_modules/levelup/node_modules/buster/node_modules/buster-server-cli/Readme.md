# buster-server-cli #

[![Build status](https://secure.travis-ci.org/busterjs/buster-server-cli.png?branch=master)](http://travis-ci.org/busterjs/buster-server-cli)

Command-line interface API for running [ramp](https://github.com/busterjs/ramp/)
instances with a simple interface that allows capturing and viewing a list of
connected browsers.

In Buster, this module is the implementation of the `buster server` command. It
does not define the binary however, as it is intended to be generic enough to be
reused outside of Buster.

## Possible use cases ##

The capture server is the central piece in Buster's multiple browser automation
capabilities. This module can be used as is to run tests for any framework, as
it does not know anything about tests at all. However, if you're shipping a
capture server for your own framework, you may want to brand your server a
little.

The following example shows how to create a custom capture server for the
fictional `checkit` test framework.

### The binary ###

    // checkit/bin/checkit-server
    var path = require("path");
    var serverCli = require("buster-server-cli");

    serverCli.create(process.stdout, process.stderr, {
        missionStatement: "Checkit crazy multi-browser test runner server",
        description: "checkit-server [options]",
        templateRoot: path.join(__dirname, "..", "views"),
        documentRoot: path.join(__dirname, "..", "public")
    }).run(process.argv.slice(2));

### The index template ###

You need to define two templates for the server to work correctly. The first one
is `index.ejs`, which is an [ejs](http://embeddedjs.com/) template for the
index page of the server. [Buster's index template](https://github.com/busterjs/buster-server-cli/blob/master/views/index.ejs)
renders a list of captured browsers and a link to `/capture`, which is the
URL that causes the browser to become a captured slave.

The `index.ejs` template is rendered with one piece of data — `slaves` — which
is an array of slave objects:

* `slave.browser` A string, i.e. "Firefox"
* `slave.platform` A string, i.e. "Linux"
* `slave.version` A string, i.e. "12.0"
* `slave.os` A string, contains a richer OS/platform description
* `slave.userAgent` The original user agent

### The header template ###

The second template is the `header.ejs` template. It is used in the top frame
in the frameset that is displayed in captured slaves. Currently this is just
a static template, but future versions will expose an API to communicate with
the server here to display progress etc.

See [Buster's header template](https://github.com/busterjs/buster-server-cli/blob/master/views/header.ejs)
for a reference implementation.
