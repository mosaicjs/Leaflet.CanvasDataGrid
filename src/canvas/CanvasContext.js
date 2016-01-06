var simplify = require('simplify-js');

/**
 * This class provides a set of utility methods simplifying data visualization
 * on canvas.
 */
function CanvasContext() {
    this.initialize.apply(this, arguments);
}
CanvasContext.prototype = {

    /** Initializes this object. */
    initialize : function(options) {
        this.options = options || {};
        this._canvas = this.options.canvas;
        this._context = this._canvas.getContext('2d');
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
            g.drawImage(image, position[0], position[1]);
            return true;
        });
    },

    // -----------------------------------------------------------------------
    // Public methods

    /**
     * Draws a line defined by the specified sequence of points.
     */
    drawLine : function(points, options) {
        var strokeStyles = this._getStrokeStyles(options);
        if (!strokeStyles)
            return;
        this._drawOnCanvasContext(options, function(g) {
            // Simplify point sequence
            points = this._simplify(points);
            // Trace the line
            return this._drawLines(g, points, strokeStyles);
        });
    },

    /**
     * Draws polygons with holes on the canvas.
     */
    drawPolygon : function(polygons, holes, options) {
        // Get styles
        var fillStyles = this._getFillStyles(options);
        var strokeStyles = this._getStrokeStyles(options);
        // Return if there is no styles defined for these polygons
        if (!fillStyles && !strokeStyles)
            return;
        // Create new canvas where the polygon should be drawn
        this._drawOnCanvasContext(options, function(g) {
            var i;
            // Simplify lines
            polygons = this._simplify(polygons);
            holes = holes || [];
            for (i = 0; i < holes.length; i++) {
                holes[i] = this._simplify(holes[i]);
            }

            // Draw the polygon itself
            g.globalCompositeOperation = 'source-over';
            if (fillStyles) {
                this._setCanvasStyles(g, fillStyles);
                if (fillStyles._pattern) {
                    g.fillStyle = g
                            .createPattern(fillStyles._pattern, "repeat");
                }
                g.beginPath();
                this._trace(g, polygons[0]);
                g.closePath();
                g.fill();
            }

            // Draw lines around the polygon (external lines)
            this._drawLines(g, polygons, strokeStyles);

            // Remove holes areas from the polygon
            g.globalCompositeOperation = 'destination-out';
            g.globalAlpha = 1;
            for (i = 0; i < holes.length; i++) {
                if (holes[i].length) {
                    g.beginPath();
                    this._trace(g, holes[i]);
                    g.closePath();
                    g.fill();
                }
            }

            // Draw lines around the polygon holes
            for (i = 0; i < holes.length; i++) {
                this._drawLines(g, holes[i], strokeStyles);
            }
            return true;
        });
    },

    // -----------------------------------------------------------------------
    // Private methods

    /**
     * Draws lines with the specified coordinates and styles.
     */
    _drawLines : function(g, coords, styles) {
        if (!styles)
            return false;
        if (!coords.length)
            return false;
        g.globalCompositeOperation = 'source-over';
        this._setCanvasStyles(g, styles);
        g.beginPath();
        for (var i = 0; i < coords.length; i++) {
            this._trace(g, coords[i]);
            g.stroke();
        }
        g.closePath();
        return true;
    },

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
        var points = simplify(coords, tolerance, enableHighQuality);
        return points;
    },

    /**
     * Copies fill styles from the specified options object to a separate style
     * object. Returns <code>null</code> if the options do not contain
     * required styles.
     */
    _getFillStyles : function(options) {
        var styles = {};
        styles.fillStyle = options.fillColor || options.color || 'blue';
        styles.globalAlpha = options.globalAlpha || options.fillOpacity
                || options.opacity || 0;
        if (options.fillImage) {
            styles._pattern = options.fillImage;
        }
        if (this._isEmptyValue(styles.globalAlpha) && !styles._pattern)
            return null;
        return styles;
    },

    /**
     * Copies stroke styles from the specified options object to a separate
     * style object. Returns <code>null</code> if options do not contain
     * required styles.
     */
    _getStrokeStyles : function(options) {
        var styles = {};
        styles.strokeStyle = options.lineColor || options.color || 'blue';
        styles.globalAlpha = options.lineOpacity || options.opacity || 0;
        styles.lineWidth = options.lineWidth || options.width || 0;
        styles.lineCap = options.lineCap || 'round'; // 'butt|round|square'
        styles.lineJoin = options.lineJoin || 'round'; // 'miter|round|bevel'
        if (this._isEmptyValue(styles.lineWidth) || //
        this._isEmptyValue(styles.globalAlpha))
            return null;
        return styles;
    },

    /**
     * Returns <code>true</code> if the specified value is 0 or undefined.
     */
    _isEmptyValue : function(val) {
        return val === undefined || val === 0 || val === '';
    },

    /**
     * Copies styles from the specified style object to the canvas context.
     */
    _setCanvasStyles : function(g, styles) {
        for ( var key in styles) {
            if (!key || key[0] === '_')
                continue;
            g[key] = styles[key];
        }
    },

    // -----------------------------------------------------------------------

    _drawOnCanvasContext : function(options, f) {
        f.call(this, this._context);
    },

};

module.exports = CanvasContext;
