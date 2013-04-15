buster.browserEnv = {
    create: function (rootElement) {
        return buster.extend(buster.create(this), {
            element: rootElement,
            originalContent: ""
        });
    },

    listen: function (runner) {
        var clear = buster.bind(this, "clear");
        runner.on("suite:start", buster.bind(this, function () {
            this.originalContent = this.element.innerHTML;
        }));
        runner.on("test:success", clear);
        runner.on("test:failure", clear);
        runner.on("test:error", clear);
        runner.on("test:timeout", clear);
    },

    clear: function () {
        this.element.innerHTML = this.originalContent;
    }
};
