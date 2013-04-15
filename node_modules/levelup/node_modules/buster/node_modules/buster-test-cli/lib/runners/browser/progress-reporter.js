var colorizer = require("ansi-colorizer");
var ag = require("ansi-grid");

function createMatrix(ostream) {
    var matrix = ag.createMatrix({ outputStream: ostream,  columns: 2 });
    matrix.resizeColumn(1, 80);
    matrix.freezeColumn(1);
    return matrix;
}

module.exports = {
    create: function (opt) {
        var instance = Object.create(this);
        instance.color = colorizer.configure(opt);
        instance.matrix = createMatrix(opt && opt.outputStream);
        return instance;
    },

    listen: function (runner) {
        runner.bind(this);
        return this;
    },

    "progress:test:success": function (test) {
        this.print(test.client, ".");
    },

    "progress:test:error": function (test) {
        this.print(test.client, this.color.yellow("E"));
    },

    "progress:test:failure": function (test) {
        this.print(test.client, this.color.red("F"));
    },

    "progress:test:timeout": function (test) {
        this.print(test.client, this.color.red("T"));
    },

    uncaughtException: function (msg) {
        if (!this.clients || !this.clients[msg.client.id]) {
            return this.queueException(msg.client.id, msg.data.message);
        }
        this.printUncaughtException(msg.client.id, msg.data.message);
    },

    displayProgress: function (client, output) {
        if (!this.list) {
            return this.bufferOutput(client, output);
        }

        this.print(client, output);
    },

    print: function (client, output) {
        this.matrix.rowById(this.clients[client.id].id).append(1, output);
    },

    addSlave: function (clientId, agent) {
        this.clients = this.clients || {};
        this.clients[clientId] = {
            id: this.matrix.addRow([agent.toString() + ":", ""]),
            name: agent.toString()
        };
        this.printUncaughtExceptions(clientId);
    },

    queueException: function (id, message) {
        if (!this.exceptionQueue) { this.exceptionQueue = {}; }
        if (!this.exceptionQueue[id]) { this.exceptionQueue[id] = []; }
        this.exceptionQueue[id].push(message);
    },

    printUncaughtException: function (clientId, message) {
        var name = this.clients[clientId].name;
        var pattern = /Uncaught ([^\s]+Error): /;
        var matches = message.match(pattern);
        var err = matches && matches[1] || "Exception";
        var pieces = message.split(/^([^\s]+:\d+)/);
        message = pieces.shift() + pieces.shift() + " Uncaught " + err + ":" +
            pieces.join(" ").replace(pattern, "");
        this.matrix.insertRow(0, [this.color.yellow(name),
                                  this.color.yellow(message)]);
    },

    printUncaughtExceptions: function (id) {
        if (!this.exceptionQueue || !this.exceptionQueue[id]) { return; }
        this.exceptionQueue[id].forEach(function (ex) {
            this.printUncaughtException(id, ex);
        }.bind(this));
    }
};
