function map(func, list, callback) {
    if (list.length === 0) {
        return callback(null, []);
    }
    var results = [], remaining = list.length;
    list.forEach(function (elem, index) {
        func(elem, function (err, data) {
            if (err && !callback.called) {
                callback.called = true;
                callback(err);
            } else {
                results[index] = data;
                remaining -= 1;
                if (remaining === 0) {
                    callback(null, results);
                }
            }
        });
    });
}

module.exports = { map: map };