function GridIndex() {
    this.initialize.apply(this, arguments);
}

GridIndex.prototype = {

    initialize : function(options) {
        this.options = options || {};
        var resolution = this.options.resolution || 4;
        this.options.resolutionX = this.options.resolutionX || resolution;
        this.options.resolutionY = this.options.resolutionY || //
        this.options.resolutionX || resolution;
        this.reset();
    },

    /**
     * Returns data associated with the specified position on the canvas.
     */
    getData : function(x, y) {
        var array = this.getAllData(x, y);
        return array && array.length ? array[0] : undefined;
    },

    /**
     * Returns all data objects associated with the specified position on the
     * canvas.
     */
    getAllData : function(x, y) {
        var maskX = this._getMaskX(x);
        var maskY = this._getMaskY(y);
        var key = this._getIndexKey(maskX, maskY);
        return this._dataIndex[key];
    },

    /**
     * Sets data in the specified position on the canvas.
     * 
     * @param x
     * @param y
     * @param options.data
     *            a data object to set
     */
    addData : function(x, y, options) {
        var maskX = this._getMaskX(x);
        var maskY = this._getMaskY(y);
        var key = this._getIndexKey(maskX, maskY);
        return this._addDataToIndex(key, options);
    },

    reset : function() {
        this._dataIndex = {};
    },

    /**
     * Transforms a X coordinate on canvas to X coordinate in the mask.
     */
    _getMaskX : function(x) {
        var resolutionX = this.options.resolutionX;
        return Math.round(x / resolutionX);
    },

    /**
     * Transforms Y coordinate on canvas to Y coordinate in the mask.
     */
    _getMaskY : function(y) {
        var resolutionY = this.options.resolutionY;
        return Math.round(y / resolutionY);
    },

    /**
     * Adds data to the specified canvas position.
     * 
     * @param key
     * @param data
     * @param replace
     * @returns
     */
    _addDataToIndex : function(key, options) {
        var data = options.data;
        if (!data)
            return;
        var array = this._dataIndex[key];
        if (!array || options.replace) {
            array = this._dataIndex[key] = [];
        }
        array.unshift(data);
    },

    _getIndexKey : function(maskX, maskY) {
        return maskX + ':' + maskY;
    },
}

module.exports = GridIndex;
