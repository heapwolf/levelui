var B = require("buster-core");
var bcGroup = require("./group");
var when = require("when");
var path = require("path");
var fileLoader = require("./file-loader");

function getGroup(groups, name) {
    var i, l;
    for (i = 0, l = groups.length; i < l; ++i) {
        if (groups[i].name === name) { return groups[i]; }
    }
}

function delegateListeners(group, listeners) {
    var event, listen = function (listener) { group.on(event, listener); };
    for (event in listeners) { listeners[event].forEach(listen); }
}

function safeRequire(fileName, rootPath) {
    var mod = path.resolve(rootPath, fileName);
    try {
        return require(mod);
    } catch (e) {
        if (e.message !== "Cannot find module '" + mod + "'") {
            throw e;
        }
    }
}

module.exports = {
    create: function () {
        return B.extend(B.create(this), {
            groups: [],
            listeners: {},
            sources: []
        });
    },

    addGroup: function (name, group, rootPath) {
        var ext = "extends"; // Tricking JsLint :(
        if (group[ext]) {
            group = getGroup(this.groups, group[ext]).extend(group, rootPath);
        } else {
            group = bcGroup.create(group, rootPath);
        }

        group.name = name;
        this.groups.push(group);
        delegateListeners(group, this.listeners);
        return group;
    },

    loadFile: function (fileName) {
        this.sources.push(fileName);
        var group, groupName, groups = safeRequire.call(this, fileName) || [];
        var dir = path.dirname(fileName);
        for (groupName in groups) {
            group = this.addGroup(groupName, groups[groupName], dir);
            group.source = fileName;
        }
    },

    loadFiles: function (patterns, baseName, defaultLocations, callback) {
        var loader = fileLoader.create(this, baseName, defaultLocations);
        loader.load(patterns, callback);
    },

    filterEnv: function (env) {
        if (!!env && typeof env === "string") {
            this.groups = this.groups.filter(function (group) {
                return group.environment === env;
            });
        }
        return this;
    },

    filterGroup: function (regex) {
        if (!(regex instanceof RegExp)) { return; }
        this.groups = this.groups.filter(function (group) {
            return regex.test(group.name);
        });
        return this;
    },

    on: function (event, listener) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(listener);
        this.groups.forEach(function (group) {
            group.on(event, listener);
        });
    }
};

B.defineVersionGetter(module.exports, __dirname);
