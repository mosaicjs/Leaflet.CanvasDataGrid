var L = require('leaflet');
var CanvasContext = require('../canvas/CanvasContext');
var GeometryRenderer = require('../canvas/GeometryRenderer');
var GeoJsonUtils = require('../data/GeoJsonUtils');
var GeometryUtils = require('../data/GeometryUtils');

/**
 * This layer draws data on canvas tiles.
 */
var ParentLayer;
if (L.GridLayer) {
    // for v1.0.0-beta2
    ParentLayer = L.GridLayer.extend({
        _loadTile : function(tile, tilePoint) {
            tile._layer = this;
            tile._tilePoint = tilePoint;
            this._drawTile(tile, tilePoint);
            return tile;
        },
        _tileCoordsToKey : function(coords) {
            return coords.x + ':' + coords.y + ':' + coords.z;
        },
    });
} else {
    // for v0.7.7
    ParentLayer = L.TileLayer
            .extend({

                includes : L.Mixin.Events,

                _tileCoordsToBounds : function(coords) {
                    var map = this._map;
                    var tileSize = this.getTileSize();
                    var nwPoint = L.point(coords.x * tileSize.x, coords.y
                            * tileSize.y);
                    var sePoint = L.point(nwPoint.x + tileSize.x, nwPoint.y
                            + tileSize.y);
                    var nw = map.unproject(nwPoint, coords.z);
                    var se = map.unproject(sePoint, coords.z);
                    return new L.LatLngBounds(nw, se);
                },

                _tileCoordsToKey : function(coords) {
                    return coords.x + ':' + coords.y;
                },

                getTileSize : function() {
                    // for v0.7.7
                    var s = this._getTileSize();
                    return new L.Point(s, s);
                },

                _loadTile : function(tile, tilePoint) {
                    tile._layer = this;
                    tile._tilePoint = tilePoint;
                    this._adjustTilePoint(tilePoint);
                    this._drawTile(tile, tilePoint);
                    this._tileOnLoad.call(tile);
                    return tile;
                },

                _initContainer: function () {
                    L.TileLayer.prototype._initContainer.apply(this, arguments);
                    if (this.options.pane) {
                        var tilePane = this._map._panes[this.options.pane];
                        tilePane.appendChild(this._container);
                    }
                }

            });
}
var DataLayer = ParentLayer.extend({
    options : {
        pane : 'overlayPane',
        reuseTiles : false
    },

    initialize : function(options) {
        ParentLayer.prototype.initialize.apply(this, arguments);
        options = L.setOptions(this, options);
        this._newCanvas = this._newCanvas.bind(this);
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

    bindPopup : function(popup) {
        this._popup = popup;
    },

    // v0.7.7
    _getTile : function() {
        var tileSize = this.getTileSize();
        var tile = L.DomUtil.create('div', 'leaflet-tile');
        tile.style.width = tileSize.x;
        tile.style.height = tileSize.y;
        return tile;
    },

    // v0.7.7 and v1.0.0-beta
    _drawTile : function(tile, tilePoint) {
        var tileSize = this.getTileSize();
        var canvas = this._newCanvas(tileSize.x, tileSize.y);
        tile.appendChild(canvas);

        var tileId = this._tileId = (this._tileId || 0) + 1;
        // canvas._redrawing = L.Util.requestAnimFrame(function() {

        var bbox = this._getTileBbox(tilePoint);
        var origin = [ bbox[0][0], bbox[1][1] ];

        var pad = this._getTilePad();
        var extendedBbox = this.expandBbox(bbox, pad);

        var size = Math.min(tileSize.x, tileSize.y);

        var resolution = this.options.resolution || 4;
        var context = new CanvasContext({
            canvas : canvas,
            newCanvas : this._newCanvas,
            resolution : resolution,
        });
        var map = this._map;
        var provider = this._getDataProvider();
        var renderer = new GeometryRenderer({
            context : context,
            tileSize : tileSize,
            origin : origin,
            bbox : extendedBbox,
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

        var styles = this._getDataStyles();
        this.loadData(extendedBbox, function(err, data) {
            if (!err && data && data.length) {
                var drawOptions = {
                    tilePoint : tilePoint,
                    map : this._map
                };
                var forEach = (typeof data.forEach === 'function') //
                ? data.forEach.bind(data) //
                : function(f) {
                    for (var i = 0; i < data.length; i++) {
                        f(data[i], i);
                    }
                };
                for (var i = 0; i < styles.length; i++) {
                    (function(style) {
                        forEach(function(d, i) {
                            renderer.drawFeature(d, style, drawOptions);
                        });
                    })(styles[i]);
                }
            }
        }.bind(this));
    },

    // for v1.0.0-beta2
    createTile : function(tilePoint) {
        var tile = this._getTile();
        this._loadTile(tile, tilePoint);
        return tile;
    },

    // -----------------------------------------------------------------------

    _getTileBbox : function(tilePoint) {
        var bounds = this._tileCoordsToBounds(tilePoint);
        var bbox = [ [ bounds.getWest(), bounds.getSouth() ],
                [ bounds.getEast(), bounds.getNorth() ] ];
        return bbox;
    },

    /**
     * Adds the specified offset (in pixels) to the given coordinates and
     * returns the resulting value.
     */
    _addOffset : function(coords, offset) {
        var map = this._map;
        // Get the tile number
        var containerPoint = map.project(L.latLng(coords[1], coords[0]))
                ._round();
        var tileSize = this.getTileSize();
        // Get the coordinates of the tile
        var tileCoords = L.point(containerPoint.x / tileSize.x,
                containerPoint.y / tileSize.y);
        // Get geographical coordinates (bounds) of the tile
        var tileBounds = this._tileCoordsToBounds(tileCoords);
        // Translate shit in pixels to new coordinates
        var sw = tileBounds.getSouthWest();
        var ne = tileBounds.getNorthEast();
        var latK = (offset[0] / tileSize.y);
        var lngK = (offset[1] / tileSize.x);
        var lng = coords[0] + Math.abs(sw.lng - ne.lng) * lngK;
        var lat = coords[1] + Math.abs(sw.lat - ne.lat) * latK;
        return [ lng, lat ];
    },

    /**
     * Expands the given bounding box [[s, w], [n, e]] by adding the area
     * covered by the specified pad in pixels [n, e, s, w].
     */
    expandBbox : function(bbox, pad) {
        var top, right, bottom, left;
        if (Array.isArray(pad)) {
            var i = 0;
            if (pad.length === 2) {
                top = bottom = pad[i++];
                right = left = pad[i++];
            } else {
                top = pad[i++];
                right = pad[i++];
                bottom = pad[i++];
                left = pad[i++];
            }
        } else {
            top = right = bottom = left = pad;
        }
        var sw = this._addOffset(bbox[0], [ -left, -bottom ]);
        var ne = this._addOffset(bbox[1], [ right, top ]);
        return [ sw, ne ];
    },

    pixelsToBbox : function(coords, padInPixels) {
        var bbox;
        if (!Array.isArray(coords)) {
            bbox = [ [ coords.lng, coords.lat ], [ coords.lng, coords.lat ] ];
        } else {
            bbox = [ [ coords[0], coords[1] ], [ coords[0], coords[1] ] ];
        }
        return this.expandBbox(bbox, padInPixels);
    },

    /** Returns the pad (in pixels) around a tile */
    _getTilePad : function() {
        var style = this._getDataStyle();
        var zoom = this._map.getZoom();
        var tilePad = style.getTilePad(zoom);
        return tilePad;
    },

    // -----------------------------------------------------------------------

    _getDataProvider : function() {
        return this.options.provider;
    },

    _getDataStyles : function() {
        var styles = this.options.styles || [ this.options.style ];
        return styles;
    },

    _getDataStyle : function() {
        var styles = this._getDataStyles();
        return styles[0];
    },

    // -----------------------------------------------------------------------
    _newCanvas : function(w, h) {
        var canvas = L.DomUtil.create('canvas');
        canvas.width = w;
        canvas.height = h;
        return canvas;
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

    _isTransparent : function(latlng) {
        var p = this._map.project(latlng).floor();
        var tileSize = this.getTileSize();
        var coords = L.point(p.x / tileSize.x, p.y / tileSize.y).floor();
        coords.z = this._map.getZoom();
        var key = this._tileCoordsToKey(coords);
        var slot = this._tiles[key];
        if (!slot)
            return;

        var tile = slot.el /* v1.0.0-beta */ || slot /*  v0.7.7 */;
        if (!tile.context)
            return;
        var x = p.x % tileSize.x;
        var y = p.y % tileSize.y;
        return tile.context.isTransparent(x, y);
    },

    _onClick : function(ev) {
        if (!this._isTransparent(ev.latlng)) {
            ev.target = this;
            ev.map = this._map;
            this.fire('click', ev);
        }
    },

    // -----------------------------------------------------------------------

    loadData : function(bbox, callback) {
        var provider = this._getDataProvider();
        return provider.loadData({
            bbox : bbox
        }, callback);
    },

    loadDataAround : function(latlng, radiusInPixels, callback) {
        var bbox = this.pixelsToBbox(latlng, radiusInPixels);
        return this.loadData(bbox, callback);
    },

    openPopup : function(latlng) {
        if (this._popup) {
            var provider = this._getDataProvider();

            var geometry = provider.getGeometry(data[0]);
            if (geometry.type === 'Point') {
                latlng = L.latLng(geometry.coordinates[1],
                        geometry.coordinates[0]);
                // TODO: get the popup shift from the style
            }
            this._popup.setLatLng(latlng);
            this._popup.openOn(this._map);
        }

    },

    _onMouseMove : function(ev) {
        this.fire('mousemove', ev);
        if (!this._isTransparent(ev.latlng)) {
            ev.target = this;
            ev.map = this._map;
            // ev.array = data;
            // ev.data = data[0];
            this._setMouseOver(true, ev);
        } else {
            this._setMouseOver(false, ev);
        }
    },

    _setMouseOver : function(set, ev) {
        set = !!set;
        if (this._mouseover !== set) {
           this._mouseover = set;
           if (this._mouseover){
               this.fire('mouseenter', ev, this);
           } else {
               this.fire('mouseleave', ev, this);
           }
        }
    }

});

module.exports = DataLayer;
