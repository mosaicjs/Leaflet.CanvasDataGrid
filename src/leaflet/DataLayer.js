var L = require('leaflet');
var CanvasContext = require('../canvas/CanvasContext');
var GeometryRenderer = require('../canvas/GeometryRenderer');
var GeoJsonUtils = require('../data/GeoJsonUtils');
var GeometryUtils = require('../data/GeometryUtils');

/**
 * This layer draws data on canvas tiles.
 */
var ParentLayer = L.GridLayer;
var DataLayer = ParentLayer.extend({
    options : {
        pane : 'overlayPane',
    },

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

    bindPopup : function(popup) {
        this._popup = popup;
    },

    _scheduleTileRedraw : function(tile, tilePoint) {
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

        var bbox = this._getTileBbox(tilePoint);
        var origin = [ bbox[0][0], bbox[1][1] ];

        var pad = this._getTilePad(tilePoint);
        var extendedBbox = this.expandBbox(bbox, pad);
        // console.log('pad:', pad, 'bbox:', bbox, 'extendedBbox:',
        // extendedBbox);

        var size = Math.min(tileSize.x, tileSize.y);
        var scale = GeometryRenderer.calculateScale(tilePoint.z, size);
        var style = this._getStyleProvider();

        var resolution = this.options.resolution || 4;
        var context = new CanvasContext({
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

        this.loadData(extendedBbox, function(err, data) {
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
        var containerPoint = map.latLngToContainerPoint(L.latLng(coords[1],
                coords[0]));
        var tileSize = this.getTileSize();
        // Get the coordinates of the tile
        var tileCoords = containerPoint.unscaleBy(tileSize);
        // Get geographical coordinates (bounds) of the tile
        var tileBounds = this._tileCoordsToBounds(tileCoords);
        // Translate shit in pixels to new coordinates
        var sw = tileBounds.getSouthWest();
        var ne = tileBounds.getNorthEast();
        var lng = coords[0] + Math.abs(sw.lng - ne.lng)
                * (offset[0] / tileSize.x);
        var lat = coords[1] + Math.abs(sw.lat - ne.lat)
                * (offset[1] / tileSize.y);
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
            top = pad[i++];
            right = pad[i++];
            if (i >= pad.length) {
                i = 0;
            }
            bottom = pad[i++];
            left = pad[i++];
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
    _getTilePad : function(tilePoint) {
        var tilePad = this.options.tilePad;
        if (typeof tilePad === 'function') {
            tilePad = this.options.tilePad({
                tilePoint : tilePoint
            });
        }
        return tilePad;
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

    _isTransparent : function(latlng) {
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

        if (this._rect) {
            this._map.removeLayer(this._rect);
        }
        this._rect = L.rectangle(
                [ [ bbox[0][1], bbox[0][0] ], [ bbox[1][1], bbox[1][0] ] ], {})
                .addTo(this._map);

        return this.loadData(bbox, function(err, list) {
            if (err) {
                return callback(err);
            } else {
                // TODO: add data filtering; return only geometries
                // intersecting with the bbox.
                // list = filter(list);
                return callback(null, list);
            }
        });
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
        if (!this._isTransparent(ev.latlng)) {
            ev.target = this;
            ev.map = this._map;
            // ev.array = data;
            // ev.data = data[0];
            this.fire('mousemove', ev);
            this._setMouseOverStyle(true, ev);
        } else {
            this._setMouseOverStyle(false, ev);
        }
    },

    _setMouseOverStyle : function(set, ev) {
        set = !!set;
        if (!!this._mouseover !== set) {
            var delta = set ? 1 : -1;
            this._map._mouseoverCounter = //
            (this._map._mouseoverCounter || 0) + delta;
            var el = this._map._container;
            if (!!this._map._mouseoverCounter) {
                el.style.cursor = 'pointer';
                this.fire('mouseenter', ev);
            } else {
                el.style.cursor = 'auto';
                this.fire('mouseleave', ev);
            }
        }
        this._mouseover = set;
    }

});

module.exports = DataLayer;
