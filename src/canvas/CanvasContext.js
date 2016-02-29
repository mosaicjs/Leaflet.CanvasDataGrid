var extend = require('../data/extend');
var GeometryUtils = require('../data/GeometryUtils');
var IGridIndex = require('../data/IGridIndex');

/**
 * This class provides a set of utility methods simplifying data visualization
 * on canvas.
 */
function CanvasContext() {
    this.initialize.apply(this, arguments);
}
function getFields(obj) {
    var funcs = []
    for ( var name in obj) {
        if (typeof obj[name] === 'function') {
            funcs.push(name)
        }
    }
    return funcs;
}
extend(CanvasContext.prototype, IGridIndex.prototype, {

    /** Initializes this object. */
    initialize : function(options) {
        this.options = options || {};
        this._canvas = this.options.canvas;
        this._context = this._newCanvasContext(this._canvas);
    },

    _newCanvasContext : function(canvas) {
        var g = canvas.getContext('2d');
        return g;
    },

    /**
     * Returns <code>true</code> if a pixel in the specified position is
     * transparent
     */
    isTransparent : function(x, y) {
        var imageData = this._context.getImageData(x, y, 1, 1);
        var data = imageData.data;
        return data[3] === 0;
    },

    // -----------------------------------------------------------------------

    /**
     * Returns an array [width, height] for the underlying canvas.
     */
    getCanvasSize : function() {
        return [ this._canvas.width, this._canvas.height ];
    },

    /**
     * Copies an image to the main canvas.
     * 
     * @param image
     *            the image to copy; it could be an Image or Canvas
     * @param position
     *            position of the image on the main canvas
     * @param options
     *            options object containing "data" field to associate with the
     *            image
     */
    drawImage : function(image, position, options) {
        this._drawOnCanvasContext(options, function(g) {
            this._setImageStyles(g, options);
            g.drawImage(image, position[0], position[1]);
            return true;
        });
    },

    // -----------------------------------------------------------------------
    // Public methods

    /**
     * Draws a line defined by the specified sequence of points.
     */
    drawLines : function(coords, options) {
        this._drawOnCanvasContext(options, function(g) {
            options = options || {};
            // Trace the line
            g.beginPath();
            for (var i = 0; i < coords.length; i++) {
                // Simplify point sequence
                var segment = this._simplify(coords[i]);
                this._trace(g, segment);
            }
            g.closePath();
            this._setStrokeStyles(g, options);
            g.stroke();
        });
    },

    /**
     * Draws polygons with holes on the canvas.
     */
    drawPolygon : function(polygon, options) {
        // Create new canvas where the polygon should be drawn
        this._drawOnCanvasContext(options, function(g) {
            options = options || {};
            g.beginPath();
            for (var i = 0; i < polygon.length; i++) {
                var ring = this._simplify(polygon[i]);
                if (ring && ring.length) {
                    var clockwise = (i === 0);
                    if (GeometryUtils.isClockwise(ring) !== !!clockwise) {
                        ring.reverse();
                    }
                }
                this._trace(g, ring);
            }
            g.closePath();
            this._setFillStyles(g, options);
            g.fill();
            this._setStrokeStyles(g, options);
            g.stroke();
            return true;
        });
    },

    // -----------------------------------------------------------------------
    // Private methods

    /**
     * Trace the specified path on the given canvas context.
     * 
     * @param g
     *            canvas context
     * @param coords
     *            a sequence of coordinates to trace
     */
    _trace : function(g, coords) {
        if (!coords || !coords.length)
            return;
        g.moveTo(coords[0][0], coords[0][1]);
        for (var i = 1; i < coords.length; i++) {
            g.lineTo(coords[i][0], coords[i][1]);
        }
    },

    /** Simplifies the given line. */
    _simplify : function(coords) {
        var tolerance = this.options.tolerance || 0.8;
        var enableHighQuality = !!this.options.highQuality;
        var points = GeometryUtils.simplify(coords, tolerance,
                enableHighQuality);
        return points;
    },

    /**
     * Returns <code>true</code> if the specified value is 0 or undefined.
     */
    _isEmptyValue : function(val) {
        return val === undefined || val === 0 || val === '';
    },

    /**
     * Copies fill styles from the specified style object to the canvas context.
     */
    _setFillStyles : function(g, options) {
        var compositeOperation = options.compositeOperation
                || options.composition || 'source-over';
        g.globalCompositeOperation = compositeOperation;// 
        g.fillStyle = options.fillColor || options.color;
        if (options.fillImage) {
            g.fillStyle = g.createPattern(options.fillImage, "repeat");
        }
        g.globalAlpha = options.fillOpacity || options.opacity || 0;
    },

    /**
     * Copies stroke styles from the specified style object to the canvas
     * context.
     */
    _setStrokeStyles : function(g, options) {
        var compositeOperation = options.compositeOperation
                || options.composition || 'source-over';
        g.globalCompositeOperation = compositeOperation;// 
        g.globalAlpha = options.stokeOpacity || options.lineOpacity
                || options.opacity || 0;
        g.strokeStyle = options.lineColor || options.color;
        g.lineWidth = options.lineWidth || options.width || 0;
        g.lineCap = options.lineCap || 'round'; // 'butt|round|square'
        g.lineJoin = options.lineJoin || 'round'; // 'miter|round|bevel'
    },

    /**
     * Copies image styles from the specified style object to the canvas
     * context.
     */
    _setImageStyles : function(g, options) {
        var compositeOperation = options.compositeOperation
                || options.composition || 'source-over';
        g.globalCompositeOperation = compositeOperation;//
    },

    // -----------------------------------------------------------------------

    _drawOnCanvasContext : function(options, f) {
        // var width = this._canvas.width;
        // var height = this._canvas.height;
        // var data = this._context.getImageData(0, 0, width, height);
        // for (var row = 0; row < height; row++) {
        // for (var col = 0; col < width; col++) {
        // var idx = ((row * width) + col) * 4;
        // var red = data[idx + 0];
        // var green = data[idx + 1];
        // var blue = data[idx + 2];
        // var alfa = data[idx + 3];
        // data[idx + 3] = 255;
        // data[idx + 2] = red;
        // data[idx + 0] = blue;
        // }
        // }
        this._context.save();
        try {
            return f.call(this, this._context);
        } finally {
            this._context.restore();
        }
    },

// --------------------------------------------------------------------

});

module.exports = CanvasContext;
