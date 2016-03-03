var L = require('leaflet');
var throttle = L.Util.throttle || function(f, time, context) {
    var timeoutId, that, args;
    return function() {
        that = context || this;
        args = [];
        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        if (timeoutId === undefined) {
            timeoutId = setTimeout(function() {
                timeoutId = undefined;
                return f.apply(that, args);
            }, time);
        }
    };
};

module.exports = {
    throttle : throttle
};