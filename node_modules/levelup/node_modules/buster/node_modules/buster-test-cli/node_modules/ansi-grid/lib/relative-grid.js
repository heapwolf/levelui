var ansi = require("./ansi");

function setCursor(grid, x, y) {
    grid.cursor.x = x;
    grid.cursor.y = y;
    grid.max.x = Math.max(x, grid.max.x);
    grid.max.y = Math.max(y, grid.max.y);
}

function padLines(grid, num) {
    grid.go(grid.max.x, grid.max.y);
    while (num--) {
        grid.write("\n");
    }
}

function RelativeGrid(outputStream) {
    this.out = outputStream;
    this.cursor = { x: 0, y: 0 };
    this.max = { x: 0, y: 0 };
}

module.exports = RelativeGrid;

RelativeGrid.prototype = {
    go: function (x, y) {
        if (this.cursor.x === x && this.cursor.y === y) { return; }
        if (y > this.max.y) { padLines(this, y - this.max.y); }
        this.up(this.cursor.y - y);
        this.back(this.cursor.x - x);
    },

    up: function (n) {
        if (n < 0) { return this.down(-n); }
        setCursor(this, this.cursor.x, this.cursor.y - n);
        return this.write(ansi.up(n));
    },

    down: function (n) {
        if (n < 0) { return this.up(-n); }
        setCursor(this, this.cursor.x, this.cursor.y + n);
        return this.write(ansi.down(n));
    },

    fwd: function (n) {
        setCursor(this, this.cursor.x + n, this.cursor.y);
        return this.write(ansi.fwd(n));
    },

    back: function (n) {
        if (n < 0) { return this.fwd(-n); }
        setCursor(this, this.cursor.x - n, this.cursor.y);
        return this.write(ansi.back(n));
    },

    save: function () {
        this.saved = { x: this.cursor.x, y: this.cursor.y };
        return this.write(ansi.save());
    },

    restore: function () {
        this.cursor = this.saved;
        return this.write(ansi.restore());
    },

    write: function (text) {
        if (!text) { return; }
        this.out.write(text);
        var lines = text.split("\n");
        var x = this.cursor.x;
        for (var i = 0, l = lines.length; i < l; ++i) {
            setCursor(this, x + ansi.charCount(lines[i]), this.cursor.y + i);
            x = 0;
        }
    }
};
