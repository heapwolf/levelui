var S = require("./buster-terminal");

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

module.exports = {
    create: function (outputStream, options) {
        var instance = Object.create(this);
        instance.out = outputStream;
        instance.cursor = { x: 0, y: 0 };
        instance.max = { x: 0, y: 0 };
        return instance;
    },

    go: function (x, y) {
        if (this.cursor.x === x && this.cursor.y === y) { return; }
        if (y > this.max.y) { padLines(this, y - this.max.y); }
        this.up(this.cursor.y - y);
        this.back(this.cursor.x - x);
    },

    up: function (n) {
        if (n < 0) { return this.down(-n); }
        setCursor(this, this.cursor.x, this.cursor.y - n);
        return this.write(S.up(n));
    },

    down: function (n) {
        if (n < 0) { return this.up(-n); }
        setCursor(this, this.cursor.x, this.cursor.y + n);
        return this.write(S.down(n));
    },

    fwd: function (n) {
        setCursor(this, this.cursor.x + n, this.cursor.y);
        return this.write(S.fwd(n));
    },

    back: function (n) {
        if (n < 0) { return this.fwd(-n); }
        setCursor(this, this.cursor.x - n, this.cursor.y);
        return this.write(S.back(n));
    },

    save: function () {
        this.saved = { x: this.cursor.x, y: this.cursor.y };
        return this.write(S.save());
    },

    restore: function () {
        this.cursor = this.saved;
        return this.write(S.restore());
    },

    write: function (text) {
        if (!text) { return; }
        this.out.write(text);
        var lines = text.split("\n");
        var x = this.cursor.x;
        for (var i = 0, l = lines.length; i < l; ++i) {
            setCursor(this, x + S.charCount(lines[i]), this.cursor.y + i);
            x = 0;
        }
    }
};
