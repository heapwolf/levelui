/*
 * Keeps track of items being created or deleted in a list
 * - emits events about changes when .poll is called
 * - events are: delete, create
 *
 * Usage:
 *
 *     var tracker = changeTracker.create(updateItems, items);
 *
 * - updateItems is a function to fetch the current state of the items you want
 *   to watch. It should return a list of objects with a unique 'name'.
 *
 * - items is the current list, as given by running updateItems now
 *
 *     tracker.on("create", createListener);
 *     tracker.on("delete", deleteListener);
 *     tracker.poll();
 *
 * When calling poll, updateItems is called, the result is compared to the old
 * list, and events are emitted.
 *
 */

var EventEmitter = require("events").EventEmitter;
var when = require("when");

function create(updateItems, items) {
    var instance = Object.create(this);
    instance.updateItems = updateItems;
    instance.items = items;
    return instance;
}

function eq(item1) {
    return function (item2) { return item1.name === item2.name; };
}

function notIn(coll) {
    return function (item) { return !coll.some(eq(item)); };
}

function poll() {
    var d = when.defer();

    this.updateItems(function (err, after) {
        if (err) { return d.reject(err); }

        var before = this.items;

        var created = after.filter(notIn(before));
        var deleted = before.filter(notIn(after));

        created.forEach(this.emit.bind(this, "create"));
        deleted.forEach(this.emit.bind(this, "delete"));

        this.items = after;

        d.resolve();
    }.bind(this));

    return d.promise;
}

module.exports = new EventEmitter();
module.exports.create = create;
module.exports.poll = poll;
