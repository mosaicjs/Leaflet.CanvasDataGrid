var rbush = require('rbush');
var TurfExtent = require('turf-extent');
var IDataProvider = require('./IDataProvider');
var Utils = require('./utils');

/**
 * A simple data provider synchronously indexing the given data using an RTree
 * index.
 */
function DataProvider() {
    IDataProvider.apply(this, arguments);
}
Utils.extend(DataProvider.prototype, IDataProvider.prototype, {

    /** Initializes this object and indexes the initial data set. */
    initialize : function(options) {
        this.options = options || {};
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
        for (var i = 0; i < data.length; i++) {
            var d = data[i];
            var bbox = that._getBoundingBox(d);
            if (bbox) {
                var coords = that._toIndexKey(bbox);
                coords.data = d;
                array.push(coords);
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
        bbox = bbox.map(function(v){ return +v; });
        return bbox;
    },

    /**
     * Returns an object defining a bounding box ([south, west, north,
     * east]) for the specified resource.
     */
    _getBoundingBox : function(d) {
        var bbox = d ? TurfExtent(d) : null;
        return bbox;
    }

});

module.exports = DataProvider;
