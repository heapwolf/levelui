module.exports = process.platform === "linux" ?
    require("./watch-tree-unix") :
    require("./watch-tree-generic");
