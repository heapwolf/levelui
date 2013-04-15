var fs = require("fs"),
	path = require("path")

var src = fs.readFileSync(path.join(__dirname, "../index.js")).toString()

src = src.replace("module.exports = extend\n", "")

src = src.replace(/\n/g, "\n    ")

src = ";(function (global) {\n    global.extend = extend\n" + src

src += "\n}(window))"

fs.writeFileSync(path.join(__dirname, "../browser/index.js"), src)