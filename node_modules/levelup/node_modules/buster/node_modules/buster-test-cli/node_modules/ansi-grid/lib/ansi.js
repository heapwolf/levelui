function stripSeq(str) {
    str = str.replace(/\x1b(\[|\(|\))[;?0-9]*[0-9A-Za-z]/g, "");
    str = str.replace(/\x1b(\[|\(|\))[;?0-9]*[0-9A-Za-z]/g, "");
    str = str.replace(/[\x03|\x1a]/, "").replace("\x1b7", "").replace("\x1b8", "");

    return str;
}

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
    return stripSeq(string).split("\n").map(function (line) {
        return line.length > width ? cutLine(line, width) : line;
    }).join("\n").split("\n");
}

module.exports = {
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

    stripSeq: stripSeq,

    charCount: function (string) {
        return stripSeq(String(string)).length;
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

    fit: function (string, width) {
        var result = "", line = "";
        var desiredLines = cut(string, width);
        var current = desiredLines.shift();
        string = string.replace(/\n/g, "");
        for (var i = 0, l = string.length; i < l; ++i) {
            if (stripSeq(line) === current) {
                result += line;
                current = desiredLines.shift();
                if (current) { result += "\n"; }
                line = "";
            }
            line += string[i];
        }
        return result + line;
    }
};
