module.exports = {
    paths: [
        "lib/*.js",
        "test/*.js",
        "test/integration/*.js"
    ],
    linterOptions: {
        node: true,
        browser: true,
        plusplus: true,
        vars: true,
        nomen: true,
        forin: true,
        sloppy: true,
        regexp: true,
        es5: true,
        predef: [
            "phantom",
            "Phantom",
            "WebPage",
            "assert",
            "refute",
            "buster"
        ]
    }
};
