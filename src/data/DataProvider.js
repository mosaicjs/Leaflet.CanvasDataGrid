var rbush = require('rbush');
var forEachCoordinate = require('./forEachCoordinate');

/**
 * A simple data provider synchronously indexing the given data using an RTree
 * index.
 */
function DataProvider() {
    this.initialize.apply(this, arguments);
}
DataProvider.prototype = {

    /** Initializes this object and indexes the initial data set. */
    initialize : function(options) {
        this.options = options || {};
        if (typeof this.options.getGeometry === 'function') {
            this.getGeometry = this.options.getGeometry;
        }
        this.setData(this.options.data);
    },

    /** Sets and indexes the given data */
    setData : function(data) {
        this._indexData(data);
    },

    /**
     * Loads and returns indexed data contained in the specified bounding box.
     */
    loadData : function(options, callback) {
        var that = this;
        var data = that._searchInBbox(options.bbox);
        callback(null, data);
    },

    /** Indexes the specified data array using a RTree index. */
    _indexData : function(data) {
        // Data indexing
        this._rtree = rbush(9);
        data = data || [];
        var array = [];
        var that = this;
        function index(d) {
            var bbox = that._getBoundingBox(d);
            if (bbox) {
                var coords = that._toIndexKey(bbox);
                coords.data = d;
                array.push(coords);
            }
        }
        if (typeof data === 'function') {
            data = data();
        }
        if (typeof data.forEach === 'function') {
            data.forEach(index);
        } else if (data.length) {
            for (var i = 0; i < data.length; i++) {
                index(data[i]);
            }
        }
        this._rtree.load(array);
    },

    /** Searches resources in the specified bounding box. */
    _searchInBbox : function(bbox) {
        var coords = this._toIndexKey(bbox);
        var array = this._rtree.search(coords);
        array = this._sortByDistance(array, bbox);
        var result = [];
        for (var i = 0; i < array.length; i++) {
            var arr = array[i];
            result.push(arr.data);
        }
        return result;
    },

    /**
     * Sorts the given data array by Manhattan distance to the origin point
     */
    _sortByDistance : function(array, bbox) {
        var p = bbox[0];
        array.sort(function(a, b) {
            var d1 = Math.abs(a[0] - p[0]) + Math.abs(a[1] - p[1]);
            var d2 = Math.abs(b[0] - p[0]) + Math.abs(b[1] - p[1]);
            return d1 - d2;
        });
        return array;
    },

    /**
     * This method transforms a bounding box into a key for RTree index.
     */
    _toIndexKey : function(bbox) {
        bbox = bbox.map(function(v) {
            return +v;
        });
        return bbox;
    },

    /**
     * Returns an object defining a bounding box ([south, west, north, east])
     * for the specified resource.
     */
    _getBoundingBox : function(r) {
        var geometry = this.getGeometry(r);
        var extent = [ Infinity, Infinity, -Infinity, -Infinity ];
        forEachCoordinate(geometry, function(coord) {
            if (extent[0] > coord[0])
                extent[0] = coord[0];
            if (extent[1] > coord[1])
                extent[1] = coord[1];
            if (extent[2] < coord[0])
                extent[2] = coord[0];
            if (extent[3] < coord[1])
                extent[3] = coord[1];
        });
        return extent;
    },

    getGeometry : function(r) {
        return r.geometry;
    }

};

module.exports = DataProvider;
