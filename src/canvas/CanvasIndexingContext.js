var Utils = require('../utils');
var CanvasContext = require('./CanvasContext');
var ImageGridIndex = require('./ImageGridIndex');

/**
 * This utility class allows to associate data with non-transparent pixels of
 * images drawn on canvas.
 */
function CanvasIndexingContext() {
    CanvasContext.apply(this, arguments);
}
CanvasIndexingContext.stampImage = ImageGridIndex.stampImage;
Utils.extend(CanvasIndexingContext, CanvasContext);
Utils.extend(CanvasIndexingContext.prototype, CanvasContext.prototype, {

    /**
     * Initializes internal fields of this class.
     * 
     * @param options.canvas
     *            mandatory canvas object used to draw images
     * @param options.resolution
     *            optional resolution field defining precision of image areas
     *            associated with data; by default it is 4x4 pixel areas
     *            (resolution = 4)
     */
    initialize : function(options) {
        CanvasContext.prototype.initialize.apply(this, arguments);
        // Re-define a method returning unique image identifiers.
        if (typeof this.options.getImageKey === 'function') {
            this.getImageKey = this.options.getImageKey;
        }
        this.index = new ImageGridIndex(options);
    },

    /**
     * Draws the specified image in the given position on the underlying canvas.
     */
    drawImage : function(image, position, options) {
        console.log('*** ', image, position, options);
        if (!image || !position)
            return;
        var x = position[0];
        var y = position[1];
        // Draw the image on the canvas
        this._context.drawImage(image, x, y);
        // Associate non-transparent pixels of the image with data
        this.index.indexImage(image, x, y, options);
    },

    _drawOnCanvasContext : function(options, f) {
        // Create new canvas where the polygon should be drawn
        var canvas = this._newCanvas();
        var g = canvas.getContext('2d');
        var ok = f.call(this, g);
        if (ok) {
            this.drawImage(canvas, [ 0, 0 ], options);
        }
    },

    /**
     * Creates and returns a new canvas used to draw individual features.
     */
    _newCanvas : function() {
        var canvas;
        var width = this._canvas.width;
        var height = this._canvas.height;
        if (this.options.newCanvas) {
            canvas = this.options.newCanvas(width, height);
        } else {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
        }
        return canvas;
    },

    /**
     * Returns data associated with the specified position on the canvas.
     */
    getData : function(x, y) {
        return this.index.getData(x, y);
    },

    /**
     * Returns all data objects associated with the specified position on the
     * canvas.
     */
    getAllData : function(x, y) {
        return this.index.getAllData(x, y);
    },

    /**
     * Sets data in the specified position on the canvas.
     */
    setData : function(x, y, data) {
        return this.index.setData(x, y, data);
    },

    /**
     * Removes all data from internal indexes and cleans up underlying canvas.
     */
    reset : function() {
        var g = this._context;
        g.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this.index.reset();
    },

});
module.exports = CanvasIndexingContext;
