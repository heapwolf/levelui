var S = require("./buster-terminal");

function add(a, b) {
    return a + b;
}

function initColumns(num) {
    var columns = [];
    for (var i = 0; i < num; ++i) {
        columns.push(0);
    }
    return columns;
}

function verifyColumnCount(m, columns) {
    var count = m.columns.length;
    if (columns.length !== count) {
        throw new TypeError(
            "Row expected to have " + count + " columns, got " + columns.length
        );
    }
}

function textWidth(text) {
    return S.maxWidth((text || "").split("\n"));
}

function printMultiLine(m, row, col, lines, width) {
    var x = m.colPos(col);
    var y = m.rowPos(row);
    lines.forEach(function (line, num) {
        m.grid.go(x, y + num);
        printLine(m, line, width);
        if (num < lines.length - 1) { m.grid.write("\n"); }
    });
}

function printLine(m, text, width) {
    m.grid.write(text + S.repeat(" ", width - S.charCount(text)) + m.pad());
}

function redistributeWidths(m) {
    m.rows.forEach(function (row) {
        row.forEach(function (col, index) {
            m.setColumnWidth(index, Math.max(m.columns[index], textWidth(col)));
        });
    });
}

function rowHeight(columns) {
    return (columns || []).reduce(function (height, col) {
        return Math.max(col.split("\n").length, height);
    }, 0);
}

function reflowLines(m, row, col, content) {
    var width = m.columnWidth(col, content);
    var lines = S.fit(content, width).split("\n");
    var result = lines.slice();
    var lineHeight = rowHeight(m.rows[row]) || lines.length;
    for (var i = result.length; i < lineHeight; ++i) {
        result.push("");
    }
    return result;
}

function makeRow(m, columns) {
    function getIndex() {
        for (var i = 0, l = m.rows.length; i < l; ++i) {
            if (m.rows[i] === columns) { return i; }
        }
    }
    return {
        id: columns.id,
        columns: function () {
            return columns.slice();
        },
        append: function (col, text) {
            return m.append(getIndex(), col, text);
        }
    };
}

module.exports = {
    create: function (options) {
        return Object.create(this, {
            grid: { value: options.grid || S.createRelativeGrid(options.outputStream) },
            columns: { value: initColumns(options.columns || 1), writable: true },
            padding: {
                value: typeof options.padding === "number" ? options.padding : 1
            },
            rows: { value: [] },
            frozen: { value: [] },
            positions: { value: [] }
        });
    },

    addRow: function (columns) {
        columns = columns.map(function (c) { return c.toString(); });
        verifyColumnCount(this, columns);
        var row = this.rows.length;
        this.printRow(row, columns);
        columns.id = this.rows.length;
        this.rows.push(columns);
        return columns.id;
    },

    insertRow: function (index, columns) {
        var rows = this.rows.length;
        if (index > rows) {
            throw new TypeError("Row out of bounds, max is " + rows);
        }
        if (index === rows) {
            return this.addRow(columns);
        }
        verifyColumnCount(this, columns);
        var id = this.rows.length;
        this.rows.splice(index, 0, columns);
        columns.id = id;
        this.redraw();
        return id;
    },

    append: function (row, col, content) {
        var colPos = this.colPos(col);
        var pos = this.positions[row][col];
        var lines = reflowLines(this, row, col, this.rows[row][col] + content);
        this.rows[row][col] = lines.join("\n");
        if (pos.x - colPos + S.charCount(content) <= this.columns[col]) {
            this.grid.save();
            this.grid.go(pos.x, pos.y);
            this.grid.write(content);
            this.saveColumnPosition(row, col);
            this.grid.restore();
        } else {
            this.redraw();
        }
    },

    printRow: function (row, columns) {
        columns.forEach(function (col, index) {
            this.printColumn(row, index, col);
        }.bind(this));
        this.grid.write("\n");
    },

    printColumn: function (row, col, content) {
        this.grid.go(this.colPos(col), this.rowPos(row));
        var width = this.columnWidth(col, content);
        var lines = reflowLines(this, row, col, content);
        printMultiLine(this, row, col, lines, width);
        var paddingOffset = this.columns[col] - lines[lines.length - 1].length;
        this.saveColumnPosition(row, col, paddingOffset + this.padding);
    },

    pad: function () {
        return S.repeat(" ", this.padding);
    },

    setColumnWidth: function (col, width) {
        if (!this.frozen[col]) {
            this.columns[col] = width;
        }
        return this.columns[col];
    },

    resizeColumn: function (col, width) {
        var currWidth = this.columnWidth(col);
        if (currWidth === width) { return; }
        this.grid.save();
        this.setColumnWidth(col, width);
        var widthChanged = this.columnWidth(col) !== currWidth;
        if (widthChanged) { this.redraw(); }
        this.grid.restore();
    },

    freezeColumn: function (col) {
        this.frozen[col] = true;
    },

    redraw: function () {
        redistributeWidths(this);
        this.rows.forEach(function (row, index) {
            this.printRow(index, row);
        }.bind(this));
    },

    columnWidth: function (col, text) {
        var width = textWidth(text);
        if (!this.columns[col]) {
            this.setColumnWidth(col, width);
        }
        if (width > this.columns[col]) {
            this.resizeColumn(col, width);
        }
        return this.columns[col];
    },

    colPos: function (col) {
        return this.columns.slice(0, col).reduce(add, 0) + (col * this.padding);
    },

    rowPos: function (row) {
        return this.rows.slice(0, row).reduce(function (sum, row) {
            return sum + rowHeight(row);
        }, 0);
    },

    rowById: function (id) {
        for (var i = 0, l = this.rows.length; i < l; ++i) {
            if (this.rows[i].id === id) {
                return makeRow(this, this.rows[i]);
            }
        }
    },

    saveColumnPosition: function (row, col, offset) {
        var cursor = this.grid.cursor;
        if (!this.positions[row]) { this.positions[row] = []; }
        this.positions[row][col] = {
            x: cursor.x - (offset || 0),
            y: cursor.y
        };
    }
};
