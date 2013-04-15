module.exports = {
    paths: [
        "lib/*.js",
        "lib/processors/*.js",
        "test/*.js",
        "test/processors/*.js"
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
