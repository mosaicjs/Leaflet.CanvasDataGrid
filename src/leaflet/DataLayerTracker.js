var L = require('leaflet');
var ParentType = require('./compatibility/Layer')(L.Layer || L.Class);
var Utils = require('./compatibility/Utils');

var DataLayerTracker = ParentType.extend({
    options : {
        radius : 32,
        timeout : 50
    },

    initialize : function(options) {
        ParentType.prototype.initialize.call(this, options || {});
        var timeout = this.options.timeout;
        this._onClick = Utils.throttle(this._onClick, timeout, this);
        this._onMove = Utils.throttle(this._onMove, timeout, this);
        this.setDataLayer(this.options.dataLayer);
    },

    // -----------------------------------------------------------------------

    getDataLayer : function() {
        return this._dataLayer;
    },

    setDataLayer : function(layer) {
        this._dataLayer = layer;
        return this;
    },

    // -----------------------------------------------------------------------

    onAdd : function(map) {
        ParentType.prototype.onAdd.apply(this, arguments);
        this._map.on('mousemove zoomend moveend', this._onMove, this);
        this._map.on('click', this._onClick, this);
    },

    onRemove : function(map) {
        this._map.off('click', this._onClick, this);
        this._map.off('mousemove zoomend moveend', this._onMove, this);
        ParentType.prototype.onRemove.apply(this, arguments);
    },

    // -----------------------------------------------------------------------

    _onClick : function(ev) {
        this._fireDataEvent('click', ev);
    },

    _onMove : function(ev) {
        this._fireDataEvent('moveend', ev);
    },

    // -----------------------------------------------------------------------
    
    _fireDataEvent : function(key, ev) {
        if (!ev.latlng || !this.hasEventListeners(key))
            return; 
        var radius = this._getRadius();
        this._dataLayer.loadDataAround(ev.latlng, [ radius, radius ], function(
                err, data) {
            ev.err = err;
            ev.data = data;
            this.fire(key, ev);
        }.bind(this));
    },

    _getRadius : function() {
        if (!this._radius) {
            var r = this.options.radius || this.options.getRadius;
            this._radius = ((typeof r === 'function') ? r : function(zoom) {
                return r || 32;
            }).bind(this);
        }
        var zoom = this._map.getZoom();
        return this._radius(zoom);
    },

});

DataLayerTracker.throttle = Utils.throttle;
module.exports = DataLayerTracker;
