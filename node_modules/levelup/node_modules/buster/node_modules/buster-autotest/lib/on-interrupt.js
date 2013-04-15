exports.onInterrupt = function (message, callback) {
    var interrupted = false;
    process.on("SIGINT", function () {
        if (interrupted) {
            process.exit();
        }
        console.log(message + " Interrupt a second time to quit");
        interrupted = true;
        callback();
        setTimeout(function () { interrupted = false; }, 1000);
    });
};
