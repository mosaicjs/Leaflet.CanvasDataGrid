var L = require('leaflet');
var CanvasContext = require('../canvas/CanvasContext');
var CanvasIndexingContext = require('../canvas/CanvasIndexingContext');
var GeometryRenderer = require('../canvas/GeometryRenderer');

/**
 * This layer draws data on canvas tiles.
 */
var ParentLayer = L.GridLayer;
var DataLayer = ParentLayer.extend({

    initialize : function(options) {
        ParentLayer.prototype.initialize.apply(this, arguments);
        this._newCanvas = this._newCanvas.bind(this);
        this._getImageMaskIndex = this._getImageMaskIndex.bind(this);
    },

    onAdd : function(map) {
        ParentLayer.prototype.onAdd.apply(this, arguments);
        this._map.on('mousemove', this._onMouseMove, this);
        this._map.on('click', this._onClick, this);
        this._map.on('zoomstart', this._onZoomStart, this);
        this._map.on('zoomend', this._onZoomEnd, this);
    },

    onRemove : function() {
        this._map.off('zoomend', this._onZoomEnd, this);
        this._map.off('zoomstart', this._onZoomStart, this);
        this._map.off('click', this._onClick, this);
        this._map.off('mousemove', this._onMouseMove, this);
        ParentLayer.prototype.onRemove.apply(this, arguments);
    },

    _scheduleTileRedraw : function(tile, tilePoint) {
        return this._redrawTile(tile, tilePoint);

        var list = this._redrawQueue = this._redrawQueue || [];
        if (this._redrawTimeoutId === undefined) {
            this._redrawTimeoutId = setTimeout(function() {
                delete this._redrawTimeoutId;
                while (this._redrawQueue && this._redrawQueue.length) {
                    var slot = this._redrawQueue.shift();
                    this._redrawTile(slot.tile, slot.tilePoint);
                }

            }.bind(this), 20);
        }
        this._redrawQueue.push({
            tile : tile,
            tilePoint : tilePoint
        });
    },

    _redrawTile : function(tile, tilePoint) {
        var tileSize = this.getTileSize();
        var canvas = this._newCanvas(tileSize.x, tileSize.y);
        tile.appendChild(canvas);

        var tileId = this._tileId = (this._tileId || 0) + 1;
        // canvas._redrawing = L.Util.requestAnimFrame(function() {

        var bounds = this._tileCoordsToBounds(tilePoint);
        var bbox = [ bounds.getWest(), bounds.getSouth(), bounds.getEast(),
                bounds.getNorth() ];
        var origin = [ bbox[0], bbox[3] ];
        var pad = this._getTilePad(tilePoint);

        var deltaLeft = Math.abs(bbox[0] - bbox[2]) * pad[0];
        var deltaBottom = Math.abs(bbox[1] - bbox[3]) * pad[1];
        var deltaRight = Math.abs(bbox[0] - bbox[2]) * pad[2];
        var deltaTop = Math.abs(bbox[1] - bbox[3]) * pad[3];
        var extendedBbox = [ bbox[0] - deltaLeft, bbox[1] - deltaBottom,
                bbox[2] + deltaRight, bbox[3] + deltaTop ];

        var size = Math.min(tileSize.x, tileSize.y);
        var scale = GeometryRenderer.calculateScale(tilePoint.z, size);

        var resolution = this.options.resolution || 4;
        // var ContextType = CanvasContext;
        var ContextType = CanvasIndexingContext;
        var context = new ContextType({
            canvas : canvas,
            newCanvas : this._newCanvas,
            resolution : resolution,
            imageMaskIndex : this._getImageMaskIndex
        });
        var map = this._map;
        var provider = this._getDataProvider();
        var renderer = new GeometryRenderer({
            context : context,
            tileSize : tileSize,
            scale : scale,
            origin : origin,
            bbox : [ [ extendedBbox[0], extendedBbox[1] ],
                    [ extendedBbox[2], extendedBbox[3] ] ],
            getGeometry : provider.getGeometry.bind(provider),
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

        tile.context = context;
        tile.renderer = renderer;

        var style = this._getStyleProvider();
        provider.loadData({
            bbox : extendedBbox,
            tilePoint : tilePoint
        }, function(err, data) {
            if (!err && data && data.length) {
                var drawOptions = {
                    tilePoint : tilePoint,
                    map : this._map
                };
                if (typeof data.forEach === 'function') {
                    data.forEach(function(d, i) {
                        renderer.drawFeature(d, style, drawOptions);
                    })
                } else if (data.length) {
                    for (var i = 0; i < data.length; i++) {
                        renderer.drawFeature(data[i], style, drawOptions);
                    }
                }
            }
        }.bind(this));
    },

    createTile : function(tilePoint) {
        var tileSize = this.getTileSize();
        var tile = document.createElement('div');
        tile.style.width = tileSize.x;
        tile.style.height = tileSize.y;
        this._scheduleTileRedraw(tile, tilePoint);
        return tile;
    },

    // -----------------------------------------------------------------------

    _getDataProvider : function() {
        return this.options.provider;
    },

    _getStyleProvider : function() {
        return this.options.style;
    },

    // -----------------------------------------------------------------------
    _newCanvas : function(w, h) {
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        return canvas;
    },

    _getImageMaskIndex : function(image, options) {
        var index = this.options.imageIndex;
        if (typeof index === 'function') {
            this._getImageMaskIndex = index.bind(this);
        } else {
            this._getImageMaskIndex = function() {
                return index;
            }.bind(this);
        }
        return this._getImageMaskIndex(image, options);
    },

    // -----------------------------------------------------------------------

    _onZoomStart : function(ev) {
        if (this._cleanupId) {
            clearTimeout(this._cleanupId);
            delete this._cleanupId;
        }
    },
    _onZoomEnd : function(ev) {
        if (this._cleanupId) {
            clearTimeout(this._cleanupId);
            delete this._cleanupId;
        }
        this._cleanupId = setTimeout(function() {
            var zoom = this._map.getZoom();
            for ( var z in this._levels) {
                if (+z !== zoom) {
                    L.DomUtil.remove(this._levels[z].el);
                    delete this._levels[z];
                }
            }
        }.bind(this), 200);
    },

    _getTilePad : function(tilePoint) {
        // left, bottom, right, top
        // west, south, east, north
        var tilePad = this.options.tilePad;
        if (typeof tilePad === 'function') {
            tilePad = this.options.tilePad({
                tilePoint : tilePoint
            });
        }
        var pad;
        if (tilePad) {
            var tileSize = this.getTileSize();
            if (Array.isArray(tilePad)) {
                pad = [ tilePad[0] / tileSize.y, tilePad[1] / tileSize.x,
                        tilePad[2] / tileSize.y, tilePad[3] / tileSize.x ];
            } else {
                pad = [ tilePad / tileSize.y, tilePad / tileSize.x,
                        tilePad / tileSize.y, tilePad / tileSize.x ];
            }
        } else {
            pad = [ 0.2, 0.2, 0.2, 0.2 ];
        }
        return pad;

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
        if (!tile.context)
            return;
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
