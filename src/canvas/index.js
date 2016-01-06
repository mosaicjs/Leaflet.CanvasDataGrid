var CanvasContext = require('./CanvasContext');
CanvasIndexingContext = require('./CanvasContextCanvasIndexingContext');
GeometryRenderer = require('./GeometryRenderer');
GeometryRendererStyle = require('./GeometryRendererStyle');
ImageGridIndex = require('./ImageGridIndex');
ImageUtils = require('./ImageUtils'); 

module.exports = {
    extend : function extend(to) {
        var len = arguments.length;
        for (var i = 1; i < len; i++) {
            var from = arguments[i];
            for ( var key in from) {
                if (from.hasOwnProperty(key)) {
                    to[key] = from[key];
                }
            }
        }
    }
};