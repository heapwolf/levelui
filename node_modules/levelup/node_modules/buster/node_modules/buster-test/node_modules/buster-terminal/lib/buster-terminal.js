var matrix, grid;

function cutLine(str, width) {
    var line = "", result = "";
    for (var i = 0, l = str.length; i < l; ++i) {
        if (line.length === width) {
            result += line + "\n";
            line = "";
        }
        line += str[i];
    }
    return result + line;
}

function cut(string, width) {
    return S.stripSeq(string).split("\n").map(function (line) {
        return line.length > width ? cutLine(line, width) : line;
    }).join("\n").split("\n");
}

function reflowLine(length, text) {
    var line = "";
    return text.split(" ").reduce(function (lines, word) {
        if (line.length > 0 && line.length + word.length + 1 > length) {
            lines.push(line);
            line = "";
        }
        line += (!!line ? " " : "") + word;
        return lines;
    }, []).concat([line]).join("\n");
}

var S = module.exports = {
    color: false,
    bright: false,

    // Clear screen: "\x1b[1;1H\x1b[2J"

    create: function (opt) {
        var instance = Object.create(this);

        if (opt && typeof opt.color === "boolean") {
            instance.color = opt.color;
        }

        if (opt && typeof opt.bright === "boolean") {
            instance.bright = opt.bright;
        }

        return instance;
    },

    colorize: function (str, color) {
        if (!this.color) { return str; }

        return (this.bright ? "\x1b[1m" : "") +
            "\x1b[" + color + "m" + str + "\x1b[0m";
    },

    bold: function (str) {
        if (!this.color) { return str; }
        return "\x1b[1m" + str + "\x1b[0m";
    },

    red: function (str) {
        return this.colorize(str, 31);
    },

    yellow: function (str) {
        return this.colorize(str, 33);
    },

    green: function (str) {
        return this.colorize(str, 32);
    },

    purple: function (str) {
        return this.colorize(str, 35);
    },

    cyan: function (str) {
        return this.colorize(str, 36);
    },

    grey: function (str) {
        if (!this.color) { return str; }
        str = "\x1b[38;5;8m" + str + "\x1b[0m";
        return this.bright ? "\x1b[1m" + str + "\x1b[0m" : str;
    },

    up: function (n) {
        if (!n) { return ""; }
        return "\x1b[" + n + "A";
    },

    down: function (n) {
        if (!n) { return ""; }
        return "\x1b[" + n + "B";
    },

    fwd: function (n) {
        if (!n) { return ""; }
        return "\x1b[" + n + "C";
    },

    back: function (n) {
        if (!n) { return ""; }
        return "\x1b[" + n + "D";
    },

    save: function () {
        return "\x1b7";
    },

    restore: function () {
        return "\x1b8";
    },

    move: function (callback) {
        var str = this.save();
        str += callback.call(this);
        str += this.restore();

        return str;
    },

    stripSeq: function (str) {
        str = str.replace(/\x1b(\[|\(|\))[;?0-9]*[0-9A-Za-z]/g, "");
        str = str.replace(/\x1b(\[|\(|\))[;?0-9]*[0-9A-Za-z]/g, "");
        str = str.replace(/[\x03|\x1a]/, "").replace("\x1b7", "").replace("\x1b8", "");

        return str;
    },

    charCount: function (string) {
        return this.stripSeq(String(string)).length;
    },

    repeat: function (character, times) {
        var str = "";
        while (times >= 0 && times--) { str += character; }
        return str;
    },

    maxWidth: function (strings) {
        var i, l, width, str;
        for (i = 0, l = strings.length, width = 0; i < l; i++) {
            str = (strings[i] == null ? "" : String(strings[i]));
            width = Math.max(this.charCount(str), width);
        }
        return width;
    },

    alignLeft: function (string, width) {
        var len = this.charCount(string);
        return string + this.repeat(" ", width - len);
    },

    alignRight: function (string, width) {
        var len = this.charCount(string);
        return this.repeat(" ", width - len) + string;
    },

    fit: function (string, width) {
        var result = "", line = "";
        var desiredLines = cut(string, width);
        var current = desiredLines.shift();
        string = string.replace(/\n/g, "");
        for (var i = 0, l = string.length; i < l; ++i) {
            if (this.stripSeq(line) === current) {
                result += line;
                current = desiredLines.shift();
                if (current) { result += "\n"; }
                line = "";
            }
            line += string[i];
        }
        return result + line;
    },

    reflow: function (text, length) {
        return text.split("\n").map(reflowLine.bind(null, length)).join("\n");
    },

    createMatrix: function () {
        matrix = matrix || require("./matrix");
        return matrix.create.apply(matrix, arguments);
    },

    createRelativeGrid: function () {
        grid = grid || require("./relative-grid");
        return grid.create.apply(grid, arguments);
    }
};
