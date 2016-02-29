var rbush = require('rbush');
var GeoJsonUtils = require('./GeoJsonUtils');
var GeometryUtils = require('./GeometryUtils');

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
     * 
     * @param options.bbox
     *            a bounding box used to search data
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
                var key = that._toIndexKey(bbox);
                key.data = d;
                array.push(key);
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
        var filterMultiPoints = !!this.options.filterPoints;
        for (var i = 0; i < array.length; i++) {
            var arr = array[i];
            var r = arr.data;
            var geometry = this.getGeometry(r);
            var handled = false;
            GeoJsonUtils.forEachGeometry(geometry, {
                onPoints : function(points) {
                    if (!handled
                            && (!filterMultiPoints || GeometryUtils
                                    .bboxContainsPoints(points, bbox))) {
                        result.push(r);
                        handled = true;
                    }
                },
                onLines : function(lines) {
                    if (!handled
                            && GeometryUtils.bboxIntersectsLines(lines, bbox)) {
                        result.push(r);
                        handled = true;
                    }
                },
                onPolygons : function(polygons) {
                    if (!handled
                            && GeometryUtils.bboxIntersectsPolygonsWithHoles(
                                    polygons, bbox)) {
                        result.push(r);
                        handled = true;
                    }
                }
            });
        }
        return result;
    },

    /**
     * Sorts the given data array
     */
    _sortByDistance : function(array, bbox) {
        if (typeof this.options.sort === 'function') {
            this._sortByDistance = this.options.sort;
        } else {
            this._sortByDistance = function(array, bbox) {
                var p = bbox[0];
                array.sort(function(a, b) {
                    var d = (a[1] - p[1]) - (b[1] - p[1]);
                    if (d === 0) {
                        d = (a[0] - p[0]) - (b[0] - p[0]);
                    }
                    return d;
                });
                return array;
            }
        }
        return this._sortByDistance(array, bbox);
    },

    /**
     * This method transforms a bounding box into a key for RTree index.
     */
    _toIndexKey : function(bbox) {
        var a = +bbox[0][0], b = +bbox[0][1], c = +bbox[1][0], d = +bbox[1][1];
        return [ Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d) ];
    },

    /**
     * Returns an object defining a bounding box ([south, west, north, east])
     * for the specified resource.
     */
    _getBoundingBox : function(r) {
        var geometry = this.getGeometry(r);
        return GeoJsonUtils.getBoundingBox(geometry);
    },

    getGeometry : function(r) {
        return r.geometry;
    }

};

module.exports = DataProvider;
