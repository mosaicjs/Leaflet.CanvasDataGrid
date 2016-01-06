var L = require('leaflet');
var Utils = require('./utils');

var CanvasContext = require('./canvas/CanvasContext');
var CanvasIndexingContext = require('./canvas/CanvasIndexingContext');
var GeometryRenderer = require('./geo/GeometryRenderer');

/**
 * This layer draws data on canvas tiles.
 */
var ParentLayer = L.GridLayer;
var DataLayer = ParentLayer.extend({

    onAdd : function(map) {
        ParentLayer.prototype.onAdd.apply(this, arguments);
        this._map.on('mousemove', this._onMouseMove, this);
        this._map.on('click', this._onClick, this);

        this.on('tileunload', function(ev) {
            var el = ev.tile;
            el.style.display = 'none';
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, this);
        this.on('tileload', function(ev) {
            var el = ev.tile;
            el.style.display = 'block';
        }, this);
    },

    onRemove : function() {
        this._map.off('click', this._onClick, this);
        this._map.off('mousemove', this._onMouseMove, this);
        ParentLayer.prototype.onRemove.apply(this, arguments);
    },

    createTile : function(tilePoint, done) {
        function newCanvas(w, h) {
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            return canvas;
        }
        var tileSize = this.getTileSize();
        var canvas = newCanvas(tileSize.x, tileSize.y);

        var bounds = this._tileCoordsToBounds(tilePoint);
        var bbox = [ bounds.getWest(), bounds.getSouth(), bounds.getEast(),
                bounds.getNorth() ];
        var origin = [ bbox[0], bbox[3] ];

        var pad = this._getTilePad();
        var deltaLeft = Math.abs(bbox[0] - bbox[2]) * pad[0];
        var deltaRight = Math.abs(bbox[0] - bbox[2]) * pad[2];
        var deltaTop = Math.abs(bbox[1] - bbox[3]) * pad[3];
        var deltaBottom = Math.abs(bbox[1] - bbox[3]) * pad[1];
        bbox = [ bbox[0] - deltaLeft, bbox[1] - deltaBottom,
                bbox[2] + deltaRight, bbox[3] + deltaTop ];

        var size = Math.min(tileSize.x, tileSize.y);
        var scale = GeometryRenderer.calculateScale(tilePoint.z, size);

        var maskIndex = this.maskIndex = this.maskIndex || {};
        var resolution = 4;
        var ContextType = CanvasIndexingContext;
        // var ContextType = CanvasContext;
        var context = new ContextType({
            canvas : canvas,
            newCanvas : newCanvas,
            resolution : resolution,
            imageMaskIndex : function(image, options) {
                return maskIndex;
            }
        });
        var map = this._map;
        var renderer = new GeometryRenderer({
            context : context,
            tileSize : tileSize,
            scale : scale,
            origin : origin,
            bbox : bbox,
            project : function(coordinates) {
                function project(point) {
                    var p = map.project(L.latLng(point[1], point[0]),
                            tilePoint.z);
                    return [ p.x, p.y ];
                }
                var origin = renderer.getOrigin();
                var o = project(origin);
                return coordinates.map(function(point) {
                    var r = project(point);
                    var delta = [ Math.round(r[0] - o[0]),
                            Math.round(r[1] - o[1]) ];
                    return delta;
                });
            }
        });

        canvas.context = context;
        canvas.renderer = renderer;

        var style = this.options.style;
        this.options.provider.loadData({
            bbox : bbox
        }, function(err, data) {
            for (var i = 0; i < data.length; i++) {
                renderer.drawFeature(data[i], style);
            }
            setTimeout(function() {
                done(null, canvas);
            }, 100);
        }.bind(this));

        return canvas;
    },

    _getTilePad : function() {
        // left, bottom, right, top
        // west, south, east, north
        return [ 0.2, 0.2, 0.2, 0.2 ];
    },

    _getDataByCoordinates : function(latlng) {
        var p = this._map.project(latlng).floor();
        var tileSize = this.getTileSize();
        var coords = p.unscaleBy(tileSize).floor();
        coords.z = this._map.getZoom();
        var key = this._tileCoordsToKey(coords);
        var slot = this._tiles[key];
        if (!slot)
            return;
        var tile = slot.el;
        var x = p.x % tileSize.x;
        var y = p.y % tileSize.y;
        var data = tile.context.getAllData(x, y);
        return data;
    },

    _onClick : function(ev) {
        var data = this._getDataByCoordinates(ev.latlng);
        if (!!data) {
            ev.array = data;
            ev.data = data[0];
            this.fire('click', ev);
        }
    },

    _onMouseMove : function(ev) {
        var data = this._getDataByCoordinates(ev.latlng);
        if (!!data) {
            ev.array = data;
            ev.data = data[0];
            this.fire('mousemove', ev);
            this._setMouseOverStyle(true);
        } else {
            this._setMouseOverStyle(false);
        }
    },

    _setMouseOverStyle : function(set) {
        set = !!set;
        if (!!this._mouseover !== set) {
            var delta = set ? 1 : -1;
            this._map._mouseoverCounter = //
            (this._map._mouseoverCounter || 0) + delta;
            var el = this._map._container;
            if (!!this._map._mouseoverCounter) {
                el.style.cursor = 'pointer';
            } else {
                el.style.cursor = 'auto';
            }
        }
        this._mouseover = set;
    }

});

module.exports = DataLayer;
