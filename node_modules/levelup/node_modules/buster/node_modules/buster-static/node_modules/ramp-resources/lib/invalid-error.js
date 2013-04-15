module.exports = function invalidError(message) {
    var err = new Error(message);
    err.name = "InvalidResourceError";
    return err;
};
