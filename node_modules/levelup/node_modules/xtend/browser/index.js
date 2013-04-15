;(function (global) {
    global.extend = extend

    function extend(target) {
        for (var i = 1, ii = arguments.length; i < ii; i++) {
            var source = arguments[i],
                keys = Object.keys(source)
    
            for (var j = 0, jj = keys.length; j < jj; j++) {
                var name = keys[j]
                target[name] = source[name]
            }
        }
    
        return target
    }
}(window))