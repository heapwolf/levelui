module.exports = {
    paths: [
        "lib/*.js",
        "test/*.js"
    ],
    linterOptions: {
        node: true,
        vars: true,
        plusplus: true,
        nomen: true,
        forin: true,
        regexp: true,
        sloppy: true,
        predef: [
            "assert",
            "refute",
            "buster"
        ]
    }
};
