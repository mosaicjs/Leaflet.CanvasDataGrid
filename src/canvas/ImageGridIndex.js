var GridIndex = require('./GridIndex');
var Utils = require('../utils');

function ImageGridIndex() {
    GridIndex.apply(this, arguments);
}
Utils.extend(ImageGridIndex.prototype, GridIndex.prototype, {

    /**
     * Adds all pixels occupied by the specified image to a data mask associated
     * with canvas.
     */
    indexImage : function(image, x, y, options) {
        var result = false;
        var data = options.data;
        if (!data)
            return result;
        var mask = this._getImageMask(image, options);
        var imageMaskWidth = this._getMaskX(image.width);
        var maskShiftX = this._getMaskX(x);
        var maskShiftY = this._getMaskY(y);
        for (var i = 0; i < mask.length; i++) {
            if (!mask[i])
                continue;
            var maskX = maskShiftX + (i % imageMaskWidth);
            var maskY = maskShiftY + Math.floor(i / imageMaskWidth);
            var key = this._getIndexKey(maskX, maskY);
            this._addDataToIndex(key, options);
            result = true;
        }
        return result;
    },

    // -------------------------------------------------------------------------

    /**
     * Returns a unique key of the specified image. If this method returns
     * <code>null</code> then the image mask is not stored in the internal
     * mask cache. To allow to store the image mask in cache the image should be
     * 'stampted' with a new identifier using the ImageGridIndex.stampImage
     * method..
     */
    stampImage : function(image) {
        return ImageGridIndex.stampImage(image);
    },

    // -------------------------------------------------------------------------

    /**
     * Returns a mask corresponding to the specified image.
     */
    _getImageMask : function(image, options) {
        var imageKey = this.stampImage(image);
        var maskIndex = this._getImageMaskIndex(image, options);
        if (!maskIndex || !imageKey) {
            return this._buildImageMask(image, options);
        }
        var mask = maskIndex[imageKey];
        if (!mask) {
            mask = this._buildImageMask(image, options);
            maskIndex[imageKey] = mask;
        }
        return mask;
    },

    /**
     * This method maintain an index of image masks associated with the provided
     * canvas. This method could be overloaded to implement a global index of
     * image masks.
     */
    _getImageMaskIndex : function(image, options) {
        var index = options.imageMaskIndex || this.options.imageMaskIndex;
        if (!index)
            return;
        if (typeof index === 'function') {
            index = index(image, options);
        }
        return index;
    },

    /** Creates and returns an image mask. */
    _buildImageMask : function(image) {
        var maskWidth = this._getMaskX(image.width);
        var maskHeight = this._getMaskY(image.height);
        var buf = this._getResizedImageBuffer(image, maskWidth, maskHeight);
        var mask = new Array(maskWidth * maskHeight);
        for (var y = 0; y < maskHeight; y++) {
            for (var x = 0; x < maskWidth; x++) {
                var idx = (y * maskWidth + x);
                var filled = this._checkFilledPixel(buf, idx);
                mask[idx] = filled ? 1 : 0;
            }
        }
        return mask;
    },

    /**
     * Returns <code>true</code> if the specified pixel is not transparent
     */
    _checkFilledPixel : function(buf, pos) {
        // Check that the alpha channel is not 0 which means that this
        // pixel is not transparent and it should not be associated with data.
        // 4 bytes per pixel; RGBA - forth byte is an alpha channel.
        var idx = pos * 4 + 3;
        return !!buf[idx];
    },

    /** Returns a raw data for the resized image. */
    _getResizedImageBuffer : function(image, width, height) {
        var g;
        if (image.tagName === 'CANVAS' && image.width === width
                && image.height === height) {
            g = image.getContext('2d');
        } else {
            var canvas = this._newCanvas(width, height);
            canvas.width = width;
            canvas.height = height;
            g = canvas.getContext('2d');
            g.drawImage(image, 0, 0, width, height);
        }
        var data = g.getImageData(0, 0, width, height).data;
        return data;
    },

    _newCanvas : function(width, height) {
        var canvas;
        if (this.options.newCanvas) {
            canvas = this.options.newCanvas(width, height);
        } else {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
        }
        return canvas;
    }

});

ImageGridIndex.stampImage = function(image) {
    var key = image['image-id'];
    if (!key) {
        var that = ImageGridIndex;
        that._imageIdCounter = (that._imageIdCounter || 0) + 1;
        key = image['image-id'] = 'i' + that._imageIdCounter;
    }
    return key;
}
module.exports = ImageGridIndex;
