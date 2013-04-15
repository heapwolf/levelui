# fs-watch-tree - Recursive fs.watch #

[![Build status](https://secure.travis-ci.org/busterjs/fs-watch-tree.png?branch=master)](http://travis-ci.org/busterjs/fs-watch-tree/)

**fs-watch-tree** is a small tool to watch directories for changes recursively.
It uses
[fs-watch](http://nodejs.org/docs/latest/api/fs.html#fs_fs_watch_filename_options_listener)
to watch for changes, thus should work on most platforms.

## Synopsis ##

    var watchTree = require("fs-watch-tree").watchTree;

    var watch = watchTree("/home/christian", function (event) {
        // See description of event below
    });

    watch.end(); // Release watch

    watch = watchTree("/home/christian", {
        exclude: ["node_modules", "~", "#", /^\./]
    }, function (event) {
        // Respond to change
    });

## `watchTree(dir, callback)` ##

Watches directory `dir` recursively for changes.

The callback is called with an `event` object. The event is described below.

## `watchTree(dir, options, callback)` ##

Watch a directory recursively, with some specific options. Currently, you can
only specify a single option:

    { exclude: [] }

The `exclude` array specifies file patterns to exclude from watches. If a
pattern matches a directory, `watch-tree` will not recurse into it. If it
matches a file, changes to that file will not trigger an event.

The excludes can be either strings or regular expressions, but are always
treated as regular expressions. That means that

    { exclude: [".git", "node_modules"] }

Will be treated the same way as:

    { exclude: [new RegExp(".git"), new RegExp("node_modules")] }

If you only want to exclude specific files, be sure to provide full
paths. `watch-tree` does not expand paths, it will resolve all paths relative to
the original directory. So this:

    watchFile(".git", function (event) { /* ... *) });

Will watch (and consider excludes for) directories like `.git/branches`. And
this:

    watchFile("/home/christian/projects/watch-tree/.git", function (event) {});

Will watch (and consider excludes for) directories like
`/home/christian/projects/watch-tree/.git`.

## `event` ##

The event object has the following properties:

### `name` ###

The full (relative) path to the file/directory that changed.

### `isDirectory()` ###

Returns true if the cause of the change was a directory. In some cases,
e.g. when the directory was deleted, it's not possible to know if the
source was a directory. In that case, this method returns false.

### `isMkdir()` ###

Returns true if the cause of the event was a newly created directory.

### `isDelete()` ###

Returns true if the cause of the event was a deleted file/directory.

### `isModify()` ###

Returns true if the cause of the event was a modified file/directory.
