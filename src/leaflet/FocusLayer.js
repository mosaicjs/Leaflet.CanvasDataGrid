var L = require('leaflet');
var ParentType = require('./compatibility/Layer')(L.Layer || L.Class);
var Utils = require('./compatibility/Utils');
var GeoJsonUtils = require('../data/GeoJsonUtils');

var FocusLayer = ParentType.extend({

    options : {
        geometry : function(d) {
            return d.geometry;
        }
    },

    initialize : function(options) {
        options = options || {
            clickable : false
        };
        var timeout = 50;
        this._onDataUpdate = Utils.throttle(this._onDataUpdate, timeout, this);
    },

    onAdd : function(map) {
        ParentType.prototype.onAdd.apply(this, arguments);
        this._map = map;
        this.on('updatedata', this._onDataUpdate, this);
        this.setData(this.options.data);
    },

    onRemove : function(map) {
        this.off('updatedata', this._onDataUpdate, this);
        delete this._map;
        ParentType.prototype.onRemove.apply(this, arguments);
    },

    // -----------------------------------------------------------------------

    getData : function() {
        return this._data;
    },

    setData : function(data) {
        this._data = data || [];
        this.fire('updatedata', {
            target : this,
            data : this._data
        });
        return this;
    },

    // -----------------------------------------------------------------------
    // Zooms to fit with data

    _getGeometry : function(d) {
        return this.options.geometry(d);
    },

    _onDataUpdate : function(ev) {
        var getGeometry = this._getGeometry.bind(this);
        var data = this._data || [];
        var bbox = GeoJsonUtils.getBoundingBox({
            type : 'GeometryCollection',
            geometries : data.map(getGeometry)
        });
        if (!this._notDefined(bbox) && !this._equal(bbox, this._bbox)) {
            if (this._isEmpty(bbox)) {
                this._map.panTo(L.latLng(bbox[0][1], bbox[0][0]));
            } else {
                var bounds = L.latLngBounds(//
                L.latLng(bbox[0][1], bbox[0][0]), //
                L.latLng(bbox[1][1], bbox[1][0]) //
                );
                this._map.fitBounds(bounds);
            }
        }
        this._bbox = bbox;
    },

    _equal : function(first, second) {
        if (first === second)
            return true;
        if (!first || !second)
            return false;
        if (first[0] === second[0] && first[1] === second[1])
            return true;
        if (first[0][0] === second[0][0] //
                && first[0][1] === second[0][1] //
                && first[1][0] === second[1][0] //
                && first[1][1] === second[1][1])
            return true;
        return false;
    },

    _notDefined : function(bbox) {
        if (!bbox)
            return true;
        if (!bbox[0] || !bbox[1])
            return true;
        if (bbox[0][0] === Infinity || bbox[0][1] === Infinity
                || bbox[1][0] === Infinity || bbox[1][1] === Infinity)
            return true;
        return false;
    },

    _isEmpty : function(bbox) {
        if (bbox[0][0] === bbox[1][0] || bbox[0][1] === bbox[1][1])
            return true;
        return false;
    }

});
module.exports = FocusLayer;
