var B = require("buster-core");
var S = require("buster-terminal");

function helpTopicsFor(opt, helpTopics) {
    if (!helpTopics) { return ""; }
    var topics = Object.keys(helpTopics);
    var help = topics.length === 1 ? topics[0] : "[" + topics.join(",") + "]";
    return " See also " + opt.signature + " " + help + ".";
}

function logHelpTopic(logger, topics, topic) {
    if (topics[topic]) { return logger.log(topics[topic]); }
    var names = Object.keys(topics).join(",");
    logger.error("No such help topic '" + topic + "'. Try without a specific " +
                 "help topic, or one of: " + names + ".");
}

function reflowAndIndent(text) {
    var indDepth = this.sigWidth + this.spacing + this.indent;
    var indentation = S.repeat(" ", indDepth);
    var width = this.width - indentation.length;
    return S.reflow(text, width).split("\n").join("\n" + indentation);
}

function optionHelpSummary(option) {
    var topics = helpTopicsFor(option, this.cli.helpTopics);
    return S.repeat(" ", this.indent) +
        S.alignLeft(option.signature, this.sigWidth) +
        S.repeat(" ", this.spacing) +
        reflowAndIndent.call(this, option.description + topics);
}

module.exports = {
    width: 80,
    indent: 4,
    spacing: 3,

    create: function (cli, options) {
        return B.extend(B.create(this), { cli: cli }, options);
    },

    addHelpOption: function (missionStatement, description, topics) {
        this.cli.opt(["-h", "--help"], {
            description: "Show this message.",
            hasValue: true,
            // To allow for --help with no value when we have help topics.
            requiresValue: false
        });
        this.cli.helpTopics = topics;
        this.cli.on("args:parsed", this.helpLogger({
            missionStatement: missionStatement,
            description: description
        }));
    },

    helpLogger: function (options) {
        var logger = this.cli.logger;
        if (!logger) { return function () {}; }
        return function (opt) {
            var help = opt["-h"];
            if (!help.isSet) { return; }
            this.cli.loggedHelp = true;
            if (help.value) {
                return logHelpTopic(logger, this.cli.helpTopics, help.value);
            }
            if (options.missionStatement) {
                logger.log(options.missionStatement + "\n");
            }
            if (options.description) {
                logger.log(options.description + "\n");
            }
            logger.log(this.formatHelp(this.cli.args));
        }.bind(this);
    },

    formatHelp: function (args) {
        var signatures = args.options.map(function (a) { return a.signature; });
        this.sigWidth = S.maxWidth(signatures);
        return args.options.filter(function (opt) {
            return !!opt.signature;
        }).map(B.bind(this, optionHelpSummary)).join("\n");
    }
};