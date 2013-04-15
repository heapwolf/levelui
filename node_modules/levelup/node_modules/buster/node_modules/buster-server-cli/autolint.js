module.exports = {
    paths: [
        "lib/*.js",
        "test/*.js"
    ],
    linterOptions: {
        node: true,
        plusplus: true,
        vars: true,
        nomen: true,
        forin: true,
        sloppy: true,
        predef: [
            "assert",
            "refute",
            "buster"
        ]
    }
};
