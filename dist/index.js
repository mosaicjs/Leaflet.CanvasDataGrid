(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("leaflet"));
	else if(typeof define === 'function' && define.amd)
		define(["leaflet"], factory);
	else {
		var a = typeof exports === 'object' ? factory(require("leaflet")) : factory(root["leaflet"]);
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var L = __webpack_require__(1);
	L.DataLayer = __webpack_require__(2);
	L.DataLayer.DataLayerStyle = __webpack_require__(10);
	L.DataLayer.DataLayerTracker = __webpack_require__(9);
	L.DataLayer.CanvasContext = __webpack_require__(3);
	L.DataLayer.GeometryRenderer = __webpack_require__(7);
	L.DataLayer.GeometryRendererStyle = __webpack_require__(11);

	L.DataLayer.IDataProvider = __webpack_require__(12);
	L.DataLayer.DataProvider = __webpack_require__(13);

	L.DataLayer.GeoJsonUtils = __webpack_require__(8);
	L.DataLayer.GridIndex = __webpack_require__(14);
	L.DataLayer.ImageGridIndex = __webpack_require__(15);
	L.DataLayer.ImageUtils = __webpack_require__(16);

	module.exports = L.DataLayer;

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var L = __webpack_require__(1);
	var CanvasContext = __webpack_require__(3);
	var GeometryRenderer = __webpack_require__(7);
	var GeoJsonUtils = __webpack_require__(8);
	var GeometryUtils = __webpack_require__(5);
	var DataLayerTracker = __webpack_require__(9);

	/**
	 * This layer draws data on canvas tiles.
	 */
	var ParentLayer;
	if (L.GridLayer) {
	    // for v1.0.0-beta2
	    ParentLayer = L.GridLayer.extend({
	        _loadTile: function _loadTile(tile, tilePoint) {
	            tile._layer = this;
	            tile._tilePoint = tilePoint;
	            this._drawTile(tile, tilePoint);
	            return tile;
	        }

	    });
	} else {
	    // for v0.7.7
	    ParentLayer = L.TileLayer.extend({

	        includes: L.Mixin.Events,

	        _tileCoordsToBounds: function _tileCoordsToBounds(coords) {
	            var map = this._map;
	            var tileSize = this.getTileSize();
	            var nwPoint = L.point(coords.x * tileSize.x, coords.y * tileSize.y);
	            var sePoint = L.point(nwPoint.x + tileSize.x, nwPoint.y + tileSize.y);
	            var nw = map.unproject(nwPoint, coords.z);
	            var se = map.unproject(sePoint, coords.z);
	            return new L.LatLngBounds(nw, se);
	        },

	        getTileSize: function getTileSize() {
	            // for v0.7.7
	            var s = this._getTileSize();
	            return new L.Point(s, s);
	        },

	        _tileCoordsToKey: function _tileCoordsToKey(coords) {
	            return coords.x + ':' + coords.y + ':' + coords.z;
	        },

	        _loadTile: function _loadTile(tile, tilePoint) {
	            tile._layer = this;
	            tile._tilePoint = tilePoint;
	            this._adjustTilePoint(tilePoint);
	            this._drawTile(tile, tilePoint);
	            this._tileOnLoad.call(tile);
	            return tile;
	        }

	    });
	}
	var DataLayer = ParentLayer.extend({
	    options: {
	        pane: 'overlayPane',
	        reuseTiles: false
	    },

	    initialize: function initialize(options) {
	        ParentLayer.prototype.initialize.apply(this, arguments);
	        options = L.setOptions(this, options);
	        this._newCanvas = this._newCanvas.bind(this);
	        this._tracker = this.options.tracker;
	        if (!this._tracker && !this.options.noTracker) {
	            this._tracker = new DataLayerTracker(options);
	        }
	        if (this._tracker) {
	            this._tracker.setDataLayer(this);
	        }
	    },

	    onAdd: function onAdd(map) {
	        ParentLayer.prototype.onAdd.apply(this, arguments);
	        if (this._tracker) {
	            map.addLayer(this._tracker);
	        }
	        this._map.on('mousemove', this._onMouseMove, this);
	        this._map.on('click', this._onClick, this);
	        this._map.on('zoomstart', this._onZoomStart, this);
	        this._map.on('zoomend', this._onZoomEnd, this);
	    },

	    onRemove: function onRemove() {
	        this._map.off('zoomend', this._onZoomEnd, this);
	        this._map.off('zoomstart', this._onZoomStart, this);
	        this._map.off('click', this._onClick, this);
	        this._map.off('mousemove', this._onMouseMove, this);
	        if (this._tracker) {
	            map.removeLayer(this._tracker);
	        }
	        ParentLayer.prototype.onRemove.apply(this, arguments);
	    },

	    bindPopup: function bindPopup(popup) {
	        this._popup = popup;
	    },

	    // v0.7.7
	    _getTile: function _getTile() {
	        var tileSize = this.getTileSize();
	        var tile = L.DomUtil.create('div', 'leaflet-tile');
	        tile.style.width = tileSize.x;
	        tile.style.height = tileSize.y;
	        return tile;
	    },

	    // v0.7.7 and v1.0.0-beta
	    _drawTile: function _drawTile(tile, tilePoint) {
	        var tileSize = this.getTileSize();
	        var canvas = this._newCanvas(tileSize.x, tileSize.y);
	        tile.appendChild(canvas);

	        var tileId = this._tileId = (this._tileId || 0) + 1;
	        // canvas._redrawing = L.Util.requestAnimFrame(function() {

	        var bbox = this._getTileBbox(tilePoint);
	        var origin = [bbox[0][0], bbox[1][1]];

	        var pad = this._getTilePad();
	        var extendedBbox = this.expandBbox(bbox, pad);

	        var size = Math.min(tileSize.x, tileSize.y);

	        var resolution = this.options.resolution || 4;
	        var context = new CanvasContext({
	            canvas: canvas,
	            newCanvas: this._newCanvas,
	            resolution: resolution
	        });
	        var map = this._map;
	        var provider = this._getDataProvider();
	        var renderer = new GeometryRenderer({
	            context: context,
	            tileSize: tileSize,
	            origin: origin,
	            bbox: extendedBbox,
	            getGeometry: provider.getGeometry.bind(provider),
	            project: function project(coordinates) {
	                function project(point) {
	                    var p = map.project(L.latLng(point[1], point[0]), tilePoint.z);
	                    return [p.x, p.y];
	                }
	                var origin = renderer.getOrigin();
	                var o = project(origin);
	                return coordinates.map(function (point) {
	                    var r = project(point);
	                    var delta = [Math.round(r[0] - o[0]), Math.round(r[1] - o[1])];
	                    return delta;
	                });
	            }
	        });

	        tile.context = context;
	        tile.renderer = renderer;

	        var styles = this._getDataStyles();
	        this.loadData(extendedBbox, (function (err, data) {
	            if (!err && data && data.length) {
	                var drawOptions = {
	                    tilePoint: tilePoint,
	                    map: this._map
	                };
	                var forEach = typeof data.forEach === 'function' ? //
	                data.forEach.bind(data) //
	                : function (f) {
	                    for (var i = 0; i < data.length; i++) {
	                        f(data[i], i);
	                    }
	                };
	                for (var i = 0; i < styles.length; i++) {
	                    (function (style) {
	                        forEach(function (d, i) {
	                            renderer.drawFeature(d, style, drawOptions);
	                        });
	                    })(styles[i]);
	                }
	            }
	        }).bind(this));
	    },

	    // for v1.0.0-beta2
	    createTile: function createTile(tilePoint) {
	        var tile = this._getTile();
	        this._loadTile(tile, tilePoint);
	        return tile;
	    },

	    // -----------------------------------------------------------------------

	    _getTileBbox: function _getTileBbox(tilePoint) {
	        var bounds = this._tileCoordsToBounds(tilePoint);
	        var bbox = [[bounds.getWest(), bounds.getSouth()], [bounds.getEast(), bounds.getNorth()]];
	        return bbox;
	    },

	    /**
	     * Adds the specified offset (in pixels) to the given coordinates and
	     * returns the resulting value.
	     */
	    _addOffset: function _addOffset(coords, offset) {
	        var map = this._map;
	        // Get the tile number
	        var containerPoint = map.project(L.latLng(coords[1], coords[0]))._round();
	        var tileSize = this.getTileSize();
	        // Get the coordinates of the tile
	        var tileCoords = L.point(containerPoint.x / tileSize.x, containerPoint.y / tileSize.y);
	        // Get geographical coordinates (bounds) of the tile
	        var tileBounds = this._tileCoordsToBounds(tileCoords);
	        // Translate shit in pixels to new coordinates
	        var sw = tileBounds.getSouthWest();
	        var ne = tileBounds.getNorthEast();
	        var latK = offset[0] / tileSize.y;
	        var lngK = offset[1] / tileSize.x;
	        var lng = coords[0] + Math.abs(sw.lng - ne.lng) * lngK;
	        var lat = coords[1] + Math.abs(sw.lat - ne.lat) * latK;
	        return [lng, lat];
	    },

	    /**
	     * Expands the given bounding box [[s, w], [n, e]] by adding the area
	     * covered by the specified pad in pixels [n, e, s, w].
	     */
	    expandBbox: function expandBbox(bbox, pad) {
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
	        var sw = this._addOffset(bbox[0], [-left, -bottom]);
	        var ne = this._addOffset(bbox[1], [right, top]);
	        return [sw, ne];
	    },

	    pixelsToBbox: function pixelsToBbox(coords, padInPixels) {
	        var bbox;
	        if (!Array.isArray(coords)) {
	            bbox = [[coords.lng, coords.lat], [coords.lng, coords.lat]];
	        } else {
	            bbox = [[coords[0], coords[1]], [coords[0], coords[1]]];
	        }
	        return this.expandBbox(bbox, padInPixels);
	    },

	    /** Returns the pad (in pixels) around a tile */
	    _getTilePad: function _getTilePad() {
	        var style = this._getDataStyle();
	        var zoom = this._map.getZoom();
	        var tilePad = style.getTilePad(zoom);
	        return tilePad;
	    },

	    // -----------------------------------------------------------------------

	    _getDataProvider: function _getDataProvider() {
	        return this.options.provider;
	    },

	    _getDataStyles: function _getDataStyles() {
	        var styles = this.options.styles || [this.options.style];
	        return styles;
	    },

	    _getDataStyle: function _getDataStyle() {
	        var styles = this._getDataStyles();
	        return styles[0];
	    },

	    // -----------------------------------------------------------------------
	    _newCanvas: function _newCanvas(w, h) {
	        var canvas = L.DomUtil.create('canvas');
	        canvas.width = w;
	        canvas.height = h;
	        return canvas;
	    },

	    // -----------------------------------------------------------------------

	    _onZoomStart: function _onZoomStart(ev) {
	        if (this._cleanupId) {
	            clearTimeout(this._cleanupId);
	            delete this._cleanupId;
	        }
	    },
	    _onZoomEnd: function _onZoomEnd(ev) {
	        if (this._cleanupId) {
	            clearTimeout(this._cleanupId);
	            delete this._cleanupId;
	        }
	        this._cleanupId = setTimeout((function () {
	            var zoom = this._map.getZoom();
	            for (var z in this._levels) {
	                if (+z !== zoom) {
	                    L.DomUtil.remove(this._levels[z].el);
	                    delete this._levels[z];
	                }
	            }
	        }).bind(this), 200);
	    },

	    _isTransparent: function _isTransparent(latlng) {
	        var p = this._map.project(latlng).floor();
	        var tileSize = this.getTileSize();
	        var coords = L.point(p.x / tileSize.x, p.y / tileSize.y).floor();
	        coords.z = this._map.getZoom();
	        var key = this._tileCoordsToKey(coords);
	        var slot = this._tiles[key];
	        if (!slot) return;
	        var tile = slot.el;
	        if (!tile.context) return;
	        var x = p.x % tileSize.x;
	        var y = p.y % tileSize.y;
	        return tile.context.isTransparent(x, y);
	    },

	    _onClick: function _onClick(ev) {
	        if (!this._isTransparent(ev.latlng)) {
	            ev.target = this;
	            ev.map = this._map;
	            this.fire('click', ev);
	        }
	    },

	    // -----------------------------------------------------------------------

	    loadData: function loadData(bbox, callback) {
	        var provider = this._getDataProvider();
	        return provider.loadData({
	            bbox: bbox
	        }, callback);
	    },

	    loadDataAround: function loadDataAround(latlng, radiusInPixels, callback) {
	        var bbox = this.pixelsToBbox(latlng, radiusInPixels);
	        return this.loadData(bbox, callback);
	    },

	    openPopup: function openPopup(latlng) {
	        if (this._popup) {
	            var provider = this._getDataProvider();

	            var geometry = provider.getGeometry(data[0]);
	            if (geometry.type === 'Point') {
	                latlng = L.latLng(geometry.coordinates[1], geometry.coordinates[0]);
	                // TODO: get the popup shift from the style
	            }
	            this._popup.setLatLng(latlng);
	            this._popup.openOn(this._map);
	        }
	    },

	    _onMouseMove: function _onMouseMove(ev) {
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

	    _setMouseOverStyle: function _setMouseOverStyle(set, ev) {
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

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var extend = __webpack_require__(4);
	var GeometryUtils = __webpack_require__(5);
	var IGridIndex = __webpack_require__(6);

	/**
	 * This class provides a set of utility methods simplifying data visualization
	 * on canvas.
	 */
	function CanvasContext() {
	    this.initialize.apply(this, arguments);
	}
	function getFields(obj) {
	    var funcs = [];
	    for (var name in obj) {
	        if (typeof obj[name] === 'function') {
	            funcs.push(name);
	        }
	    }
	    return funcs;
	}
	extend(CanvasContext.prototype, IGridIndex.prototype, {

	    /** Initializes this object. */
	    initialize: function initialize(options) {
	        this.options = options || {};
	        this._canvas = this.options.canvas;
	        this._context = this._newCanvasContext(this._canvas);
	    },

	    _newCanvasContext: function _newCanvasContext(canvas) {
	        var g = canvas.getContext('2d');
	        return g;
	    },

	    /**
	     * Returns <code>true</code> if a pixel in the specified position is
	     * transparent
	     */
	    isTransparent: function isTransparent(x, y) {
	        var imageData = this._context.getImageData(x, y, 1, 1);
	        var data = imageData.data;
	        return data[3] === 0;
	    },

	    // -----------------------------------------------------------------------

	    /**
	     * Returns an array [width, height] for the underlying canvas.
	     */
	    getCanvasSize: function getCanvasSize() {
	        return [this._canvas.width, this._canvas.height];
	    },

	    /**
	     * Copies an image to the main canvas.
	     * 
	     * @param image
	     *            the image to copy; it could be an Image or Canvas
	     * @param position
	     *            position of the image on the main canvas
	     * @param options
	     *            options object containing "data" field to associate with the
	     *            image
	     */
	    drawImage: function drawImage(image, position, options) {
	        this._drawOnCanvasContext(options, function (g) {
	            this._setCanvasStyles(g, options);
	            g.drawImage(image, position[0], position[1]);
	            return true;
	        });
	    },

	    // -----------------------------------------------------------------------
	    // Public methods

	    /**
	     * Draws a line defined by the specified sequence of points.
	     */
	    drawLines: function drawLines(coords, options) {
	        this._drawOnCanvasContext(options, function (g) {
	            // Trace the line
	            this._setCanvasStyles(g, options);
	            g.beginPath();
	            for (var i = 0; i < coords.length; i++) {
	                // Simplify point sequence
	                var segment = this._simplify(coords[i]);
	                this._trace(g, segment);
	            }
	            g.stroke();
	            g.closePath();
	        });
	    },

	    /**
	     * Draws polygons with holes on the canvas.
	     */
	    drawPolygon: function drawPolygon(polygon, options) {
	        // Create new canvas where the polygon should be drawn
	        this._drawOnCanvasContext(options, function (g) {
	            this._setCanvasStyles(g, options);
	            g.beginPath();
	            for (var i = 0; i < polygon.length; i++) {
	                var ring = this._simplify(polygon[i]);
	                if (ring && ring.length) {
	                    var clockwise = i === 0;
	                    if (GeometryUtils.isClockwise(ring) !== !!clockwise) {
	                        ring.reverse();
	                    }
	                }
	                this._trace(g, ring);
	            }
	            g.fill();
	            g.stroke();
	            g.closePath();
	            return true;
	        });
	    },

	    // -----------------------------------------------------------------------
	    // Private methods

	    /**
	     * Trace the specified path on the given canvas context.
	     * 
	     * @param g
	     *            canvas context
	     * @param coords
	     *            a sequence of coordinates to trace
	     */
	    _trace: function _trace(g, coords) {
	        if (!coords || !coords.length) return;
	        g.moveTo(coords[0][0], coords[0][1]);
	        for (var i = 1; i < coords.length; i++) {
	            g.lineTo(coords[i][0], coords[i][1]);
	        }
	    },

	    /** Simplifies the given line. */
	    _simplify: function _simplify(coords) {
	        var tolerance = this.options.tolerance || 0.8;
	        var enableHighQuality = !!this.options.highQuality;
	        var points = GeometryUtils.simplify(coords, tolerance, enableHighQuality);
	        return points;
	    },

	    /**
	     * Returns <code>true</code> if the specified value is 0 or undefined.
	     */
	    _isEmptyValue: function _isEmptyValue(val) {
	        return val === undefined || val === 0 || val === '';
	    },

	    /**
	     * Copies styles from the specified style object to the canvas context.
	     */
	    _setCanvasStyles: function _setCanvasStyles(g, options) {
	        if (!options) return;
	        g.globalAlpha = options.globalAlpha || options.fillOpacity || options.lineOpacity || options.opacity || 1;
	        g.fillStyle = options.fillColor || options.color;
	        if (options.fillImage) {
	            g.fillStyle = g.createPattern(options.fillImage, "repeat");
	        }
	        g.strokeStyle = options.lineColor || options.color;
	        g.lineWidth = options.lineWidth || options.width || 0;
	        g.lineCap = options.lineCap || 'round'; // 'butt|round|square'
	        g.lineJoin = options.lineJoin || 'round'; // 'miter|round|bevel'

	        var compositeOperation = options.compositeOperation || options.composition || 'source-over';
	        g.globalCompositeOperation = compositeOperation; //
	    },

	    // -----------------------------------------------------------------------

	    _drawOnCanvasContext: function _drawOnCanvasContext(options, f) {
	        // var width = this._canvas.width;
	        // var height = this._canvas.height;
	        // var data = this._context.getImageData(0, 0, width, height);
	        // for (var row = 0; row < height; row++) {
	        // for (var col = 0; col < width; col++) {
	        // var idx = ((row * width) + col) * 4;
	        // var red = data[idx + 0];
	        // var green = data[idx + 1];
	        // var blue = data[idx + 2];
	        // var alfa = data[idx + 3];
	        // data[idx + 3] = 255;
	        // data[idx + 2] = red;
	        // data[idx + 0] = blue;
	        // }
	        // }
	        this._context.save();
	        try {
	            return f.call(this, this._context);
	        } finally {
	            this._context.restore();
	        }
	    }

	});

	// --------------------------------------------------------------------

	module.exports = CanvasContext;

/***/ },
/* 4 */
/***/ function(module, exports) {

	"use strict";

	module.exports = function extend(to) {
	    var len = arguments.length;
	    for (var i = 1; i < len; i++) {
	        var from = arguments[i];
	        for (var key in from) {
	            if (from.hasOwnProperty(key)) {
	                to[key] = from[key];
	            }
	        }
	    }
	    return to;
	};

/***/ },
/* 5 */
/***/ function(module, exports) {

	'use strict';

	module.exports = {

	    // ------------------------------------------------------------------------
	    // Points

	    /**
	     * Gets a list of points (as a sequence of [x,y] coordinates) and returns
	     * points in the specified bounding box.
	     */
	    clipPoints: function clipPoints(points, bbox) {
	        var result = [];
	        for (var i = 0; i < points.length; i++) {
	            var point = points[i];
	            if (this.bboxContainsPoint(point, bbox)) {
	                result.push(point);
	            }
	        }
	        return result;
	    },

	    /**
	     * Returns <code>true</code> a point is contained in the specified
	     * bounding box.
	     */
	    bboxContainsPoints: function bboxContainsPoints(points, bbox) {
	        for (var i = 0; i < points.length; i++) {
	            if (this.bboxContainsPoint(points[i], bbox)) return true;
	        }
	        return false;
	    },

	    /**
	     * Returns <code>true</code> a point is contained in the specified
	     * bounding box.
	     */
	    bboxContainsPoint: function bboxContainsPoint(point, bbox) {
	        return inRange(point[0], bbox[0][0], bbox[1][0]) && inRange(point[1], bbox[0][1], bbox[1][1]);
	        function inRange(val, a, b) {
	            return (val - a) * (val - b) <= 0;
	        }
	    },

	    // ------------------------------------------------------------------------
	    // Lines

	    /**
	     * Returns true if the specified poly-line (defined as a sequence of [x,y]
	     * coordinates of their segments) has intersections with the specified
	     * bounding box.
	     */
	    bboxIntersectsLines: function bboxIntersectsLines(lines, bbox) {
	        for (var i = 0; i < lines.length; i++) {
	            if (this.bboxIntersectsLine(lines[i], bbox)) return true;
	        }
	        return false;
	    },

	    /**
	     * Returns true if the specified poly-line (defined as a sequence of [x,y]
	     * coordinates of their segments) has intersections with the specified
	     * bounding box.
	     */
	    bboxIntersectsLine: function bboxIntersectsLine(line, bbox) {
	        var prev = line[0];
	        for (var i = 1; i < line.length; i++) {
	            var next = line[i];
	            var clipped = this.clipLine([prev, next], bbox);
	            if (clipped) {
	                return true;
	            }
	            prev = next;
	        }
	        return false;
	    },

	    /**
	     * Trims a multiline defined as a sequence of coordinates [x,y] by the
	     * specified bounding box and returns the clipped result.
	     */
	    clipLines: function clipLines(lines, bbox) {
	        var result = [];
	        var prev = lines[0];
	        for (var i = 1; i < lines.length; i++) {
	            var next = lines[i];
	            var clipped = this.clipLine([prev, next], bbox);
	            if (clipped) {
	                var last = result.length ? result[result.length - 1] : null;
	                if (!last || last[0] !== clipped[0][0] || last[1] !== clipped[0][1]) {
	                    result.push(clipped[0]);
	                }
	                result.push(clipped[1]);
	            }
	            prev = next;
	        }
	        return result;
	    },

	    /**
	     * Cohen-Sutherland line-clipping algorithm. It is used to clip one line
	     * segment.
	     */
	    clipLine: (function () {
	        function getCode(x, y, xmin, ymin, xmax, ymax) {
	            var oc = 0;
	            if (y > ymax) oc |= 1;else /* TOP */if (y < ymin) oc |= 2;
	            /* BOTTOM */if (x > xmax) oc |= 4;else /* RIGHT */if (x < xmin) oc |= 8;
	            /* LEFT */return oc;
	        }
	        return function (line, bbox) {
	            var x1 = line[0][0];
	            var y1 = line[0][1];
	            var x2 = line[1][0];
	            var y2 = line[1][1];
	            var xmin = Math.min(bbox[0][0], bbox[1][0]);
	            var ymin = Math.min(bbox[0][1], bbox[1][1]);
	            var xmax = Math.max(bbox[0][0], bbox[1][0]);
	            var ymax = Math.max(bbox[0][1], bbox[1][1]);
	            var accept = false;
	            var done = false;

	            var outcode1 = getCode(x1, y1, xmin, ymin, xmax, ymax);
	            var outcode2 = getCode(x2, y2, xmin, ymin, xmax, ymax);
	            do {
	                if (outcode1 === 0 && outcode2 === 0) {
	                    accept = true;
	                    done = true;
	                } else if (!!(outcode1 & outcode2)) {
	                    done = true;
	                } else {
	                    var x, y;
	                    var outcode_ex = outcode1 ? outcode1 : outcode2;
	                    if (outcode_ex & 1 /* TOP */) {
	                            x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1);
	                            y = ymax;
	                        } else if (outcode_ex & 2 /* BOTTOM */) {
	                            x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1);
	                            y = ymin;
	                        } else if (outcode_ex & 4 /* RIGHT */) {
	                            y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1);
	                            x = xmax;
	                        } else {
	                        // 8 /* LEFT */
	                        y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1);
	                        x = xmin;
	                    }
	                    if (outcode_ex === outcode1) {
	                        x1 = x;
	                        y1 = y;
	                        outcode1 = getCode(x1, y1, xmin, ymin, xmax, ymax);
	                    } else {
	                        x2 = x;
	                        y2 = y;
	                        outcode2 = getCode(x2, y2, xmin, ymin, xmax, ymax);
	                    }
	                }
	            } while (!done);
	            var result = [[x1, y1], [x2, y2]];
	            return accept ? result : null;
	        };
	    })(),

	    /**
	     * This method simplifies the specified line (given as a sequence of
	     * [x,y] coordinates of their points) by reducing the number of points but
	     * it keeps the total "form" of the line.
	     * 
	     * @param line
	     *            a sequence of points to simplify
	     * @param tolerance
	     *            an optional parameter defining allowed divergence of points
	     * @param highestQuality
	     *            excludes distance-based preprocessing step which leads to
	     *            highest quality simplification but runs ~10-20 times slower.
	     */
	    simplify: (function () {
	        // Released under the terms of BSD license
	        /*
	         * (c) 2013, Vladimir Agafonkin Simplify.js, a high-performance JS
	         * polyline simplification library mourner.github.io/simplify-js
	         */

	        // to suit your point format, run search/replace for
	        // '.x' and '.y'; for
	        // 3D version, see 3d branch (configurability would draw
	        // significant
	        // performance overhead) square distance between 2
	        // points
	        function getSqDist(p1, p2) {
	            var dx = p1[0] - p2[0];
	            var dy = p1[1] - p2[1];
	            return dx * dx + dy * dy;
	        }

	        // square distance from a point to a segment
	        function getSqSegDist(p, p1, p2) {
	            var x = p1[0],
	                y = p1[1],
	                dx = p2[0] - x,
	                dy = p2[1] - y;
	            if (dx !== 0 || dy !== 0) {
	                var t = ((p[0] - x) * dx + (p[1] - y) * dy) / ( //
	                dx * dx + dy * dy);

	                if (t > 1) {
	                    x = p2[0];
	                    y = p2[1];
	                } else if (t > 0) {
	                    x += dx * t;
	                    y += dy * t;
	                }
	            }
	            dx = p[0] - x;
	            dy = p[1] - y;

	            return dx * dx + dy * dy;
	        }
	        // rest of the code doesn't care about point format

	        // basic distance-based simplification
	        function simplifyRadialDist(points, sqTolerance) {

	            var prevPoint = points[0];
	            var newPoints = [prevPoint];
	            var point;

	            for (var i = 1, len = points.length; i < len; i++) {
	                point = points[i];

	                if (getSqDist(point, prevPoint) > sqTolerance) {
	                    newPoints.push(point);
	                    prevPoint = point;
	                }
	            }

	            if (prevPoint !== point) newPoints.push(point);

	            return newPoints;
	        }

	        // simplification using optimized Douglas-Peucker
	        // algorithm with recursion elimination
	        function simplifyDouglasPeucker(points, sqTolerance) {

	            var len = points.length;
	            var MarkerArray = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
	            var markers = new MarkerArray(len);
	            var first = 0;
	            var last = len - 1;
	            var stack = [];
	            var newPoints = [];
	            var i;
	            var maxSqDist;
	            var sqDist;
	            var index;

	            markers[first] = markers[last] = 1;

	            while (last) {

	                maxSqDist = 0;

	                for (i = first + 1; i < last; i++) {
	                    sqDist = getSqSegDist(points[i], points[first], points[last]);

	                    if (sqDist > maxSqDist) {
	                        index = i;
	                        maxSqDist = sqDist;
	                    }
	                }

	                if (maxSqDist > sqTolerance) {
	                    markers[index] = 1;
	                    stack.push(first, index, index, last);
	                }

	                last = stack.pop();
	                first = stack.pop();
	            }

	            for (i = 0; i < len; i++) {
	                if (markers[i]) newPoints.push(points[i]);
	            }

	            return newPoints;
	        }

	        // both algorithms combined for awesome performance
	        function simplify(points, tolerance, highestQuality) {

	            if (points.length <= 1) return points;

	            var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

	            points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
	            points = simplifyDouglasPeucker(points, sqTolerance);

	            return points;
	        }

	        return simplify;
	    })(),

	    // ------------------------------------------------------------------------
	    // Polygons

	    /**
	     * Transforms a bounding box to a closed clipping polygon with clockwise
	     * order of coordinates.
	     * 
	     * @param bbox
	     *            [[xmin,ymin],[xmax,ymax]]
	     * @return a clipping rectangle with the following coordinates:
	     *         [[xmin,ymin],[xmin,ymax],[xmax,ymax],[xmax,ymin],[xmin,ymin]]
	     */
	    getClippingPolygon: function getClippingPolygon(bbox) {
	        var xmin = Math.min(bbox[0][0], bbox[1][0]);
	        var ymin = Math.min(bbox[0][1], bbox[1][1]);
	        var xmax = Math.max(bbox[0][0], bbox[1][0]);
	        var ymax = Math.max(bbox[0][1], bbox[1][1]);
	        return [[xmin, ymin], [xmin, ymax], [xmax, ymax], [xmax, ymin], [xmin, ymin]];
	    },

	    /**
	     * Returns <code>true</code> if the specified sequence of points are
	     * arranged in the clockwise order.
	     */
	    isClockwise: function isClockwise(coords) {
	        var i,
	            j,
	            area = 0;
	        for (i = 0; i < coords.length; i++) {
	            j = (i + 1) % coords.length;
	            area += coords[i][0] * coords[j][1];
	            area -= coords[j][0] * coords[i][1];
	        }
	        return area < 0;
	    },

	    /**
	     * Returns <code>true</code> if the specified bounding box is intersects
	     * at least one of the given polygons.
	     */
	    bboxIntersectsPolygons: function bboxIntersectsPolygons(polygons, bbox) {
	        for (var i = 0; i < polygons.length; i++) {
	            if (this.bboxIntersectsPolygon(polygons[i], bbox)) return true;
	        }
	        return false;
	    },

	    /**
	     * Returns <code>true</code> if the specified bounding box is intersects
	     * with the given polygon.
	     */
	    bboxIntersectsPolygon: function bboxIntersectsPolygon(polygon, bbox) {
	        var clip = this.getClippingPolygon(bbox);
	        var result = this.clipPolygon(polygon, clip);
	        return !!result.length;
	    },

	    /**
	     * Returns <code>true</code> if the specified bounding box is intersects
	     * with the given polygon.
	     */
	    bboxIntersectsPolygonsWithHoles: function bboxIntersectsPolygonsWithHoles(polygons, bbox) {
	        var clip = this.getClippingPolygon(bbox);
	        for (var i = 0; i < polygons.length; i++) {
	            if (this.bboxIntersectsPolygonWithHoles(polygons[i], bbox)) return true;
	        }
	        return false;
	    },

	    /**
	     * Returns <code>true</code> if the specified bounding box is intersects
	     * with the given polygon.
	     */
	    bboxIntersectsPolygonWithHoles: function bboxIntersectsPolygonWithHoles(polygon, bbox) {
	        var clip = this.getClippingPolygon(bbox);
	        // FIXME: check that the clip box is not in the holes
	        var result = this.clipPolygon(polygon[0], clip);
	        return result && result.length;
	    },

	    /**
	     * Returns an interection of a list of polygons with the specified clip
	     * polygon
	     */
	    clipPolygons: function clipPolygons(polygons, clipPolygon) {
	        var result = [];
	        for (var i = 0; i < polygons.length; i++) {
	            var r = this.clipPolygon(polygons[i], clipPolygon);
	            if (r && r.length) {
	                result.push(r);
	            }
	        }
	        return result;
	    },

	    /**
	     * Clips polygon by the specified bounding polygon (not a bounding box!).
	     * The subject and clipping polygons are closed "rings" or [x,y] coordinate
	     * arrays (the last and the first coordinates in each sequence should be the
	     * same).
	     */
	    clipPolygon: function clipPolygon(subjectPolygon, _clipPolygon) {
	        var subj = subjectPolygon;
	        if (!this.isClockwise(subj)) {
	            subj = [].concat(subj).reverse();
	        }
	        var clip = _clipPolygon;
	        if (this.isClockwise(clip)) {
	            clip = [].concat(clip).reverse();
	        }
	        var result = this._clipPolygon(subj, clip);
	        return result;
	    },

	    // Sutherland Hodgman polygon clipping algorithm
	    // http://rosettacode.org/wiki/Sutherland-Hodgman_polygon_clipping
	    _clipPolygon: function _clipPolygon(subjectPolygon, clipPolygon) {
	        var cp1, cp2, s, e;
	        var inside = function inside(p) {
	            return (cp2[0] - cp1[0]) * ( //
	            p[1] - cp1[1]) > (cp2[1] - cp1[1]) * ( //
	            p[0] - cp1[0]);
	        };
	        var intersection = function intersection() {
	            var dc = [cp1[0] - cp2[0], cp1[1] - cp2[1]];
	            var dp = [s[0] - e[0], s[1] - e[1]];
	            var n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0];
	            var n2 = s[0] * e[1] - s[1] * e[0];
	            var n3 = 1.0 / (dc[0] * dp[1] - dc[1] * dp[0]);
	            return [(n1 * dp[0] - n2 * dc[0]) * n3, (n1 * dp[1] - n2 * dc[1]) * n3];
	        };
	        var outputList = subjectPolygon;
	        var outputLen = subjectPolygon.length - 1;
	        var clipLen = clipPolygon.length - 1;
	        cp1 = clipPolygon[clipLen - 1];
	        for (var j = 0; j < clipLen; j++) {
	            cp2 = clipPolygon[j];
	            var inputList = outputList;
	            var inputLen = outputLen;
	            outputList = [];
	            s = inputList[inputLen - 1]; // last on the input list
	            for (var i = 0; i < inputLen; i++) {
	                e = inputList[i];
	                if (inside(e)) {
	                    if (!inside(s)) {
	                        outputList.push(intersection());
	                    }
	                    outputList.push(e);
	                } else if (inside(s)) {
	                    outputList.push(intersection());
	                }
	                s = e;
	            }
	            cp1 = cp2;
	            outputLen = outputList.length;
	        }
	        if (outputList && outputList.length && outputList !== subjectPolygon) {
	            outputList.push(outputList[0]);
	        }
	        return outputList || [];
	    }

	};

/***/ },
/* 6 */
/***/ function(module, exports) {

	"use strict";

	module.exports = IGridIndex;

	function IGridIndex() {}

	IGridIndex.prototype = {

	    /**
	     * Returns data associated with the specified position on the canvas.
	     */
	    getData: function getData(x, y) {
	        return null;
	    },

	    /**
	     * Returns all data objects associated with the specified position on the
	     * canvas.
	     */
	    getAllData: function getAllData(x, y) {
	        return null;
	    },

	    /**
	     * Sets data in the specified position on the canvas.
	     */
	    setData: function setData(x, y, data) {
	        return [];
	    }

	};

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var extend = __webpack_require__(4);
	var GeometryUtils = __webpack_require__(5);
	var GeoJsonUtils = __webpack_require__(8);

	/**
	 * A common interface visualizing data on canvas.
	 */
	function GeometryRenderer() {
	    this.initialize.apply(this, arguments);
	}
	extend(GeometryRenderer.prototype, {

	    /** Initializes fields of this object. */
	    initialize: function initialize(options) {
	        this.options = options || {};
	        this.context = this.options.context;
	        if (!this.context) {
	            throw new Error('The "context" (CanvasContext) is not defined ');
	        }
	    },

	    // -----------------------------------------------------------------------
	    // The following methods should be overloaded in subclasses

	    /**
	     * Draws the specified resource on the given canvas context.
	     * 
	     * @param resource
	     *            the resource to render
	     * @param styles
	     *            style provider defining how features should be visualized
	     */
	    drawFeature: function drawFeature(resource, styles, options) {
	        var that = this;
	        var geometry = this._getGeometry(resource, options);
	        if (!geometry) return;
	        return GeoJsonUtils.forEachGeometry(geometry, {
	            onPoints: function onPoints(points) {
	                points = that._prepareMarkerCoordinates(points);
	                if (points.length) {
	                    for (var i = 0; i < points.length; i++) {
	                        var point = points[i];
	                        _drawMarker(point, i);
	                    }
	                }
	            },
	            onLines: function onLines(lines) {
	                var lineStyle = styles.getLineStyle(resource, extend({}, options, {
	                    coords: lines,
	                    data: resource
	                }));
	                if (!lineStyle) return;
	                var segments = [];
	                for (var i = 0; i < lines.length; i++) {
	                    var segment = that._prepareLineCoordinates(lines[i]);
	                    segments.push(segment);
	                }
	                that.context.drawLines(segments, extend({
	                    data: resource
	                }, lineStyle));
	                // _drawMarker([ 0, 0 ]);
	            },
	            onPolygons: function onPolygons(polygons) {
	                for (var i = 0; i < polygons.length; i++) {
	                    this._onPolygon(polygons[i]);
	                }
	            },
	            _onPolygon: function _onPolygon(polygon) {
	                var polygonStyle = styles.getPolygonStyle(resource, extend({}, options, {
	                    coords: polygon,
	                    data: resource
	                }));
	                if (!polygonStyle) return;
	                var coords = [];
	                for (var i = 0; i < polygon.length; i++) {
	                    var ring = that._preparePolygonCoordinates(polygon[i]);
	                    if (ring.length) {
	                        coords.push(ring);
	                    }
	                }
	                that.context.drawPolygon(coords, extend({
	                    data: resource
	                }, polygonStyle));
	                // _drawMarker([ 0, 0 ]);
	            }
	        });

	        function _drawMarker(point) {
	            var markerStyle = styles.getMarkerStyle(resource, extend({}, options, {
	                point: point,
	                data: resource
	            }));
	            if (!markerStyle || !markerStyle.image) return;

	            var pos = [point[0], point[1]]; // Copy
	            if (markerStyle.anchor) {
	                pos[0] -= markerStyle.anchor[0];
	                pos[1] -= markerStyle.anchor[1];
	            }
	            that.context.drawImage(markerStyle.image, pos, extend({
	                data: resource
	            }, markerStyle));
	        }
	    },

	    // ------------------------------------------------------------------

	    _prepareLineCoordinates: function _prepareLineCoordinates(coords) {
	        var clipPolygon = this._getClipPolygon();
	        if (clipPolygon.length) {
	            var bbox = [clipPolygon[0], clipPolygon[2]];
	            coords = GeometryUtils.clipLines(coords, bbox);
	        }
	        coords = this._getProjectedPoints(coords);
	        return coords;
	    },

	    _prepareMarkerCoordinates: function _prepareMarkerCoordinates(coords) {
	        var clipPolygon = this._getClipPolygon();
	        if (clipPolygon.length) {
	            var bbox = [clipPolygon[0], clipPolygon[2]];
	            coords = GeometryUtils.clipPoints(coords, bbox);
	        }
	        coords = this._getProjectedPoints(coords);
	        return coords;
	    },

	    _preparePolygonCoordinates: function _preparePolygonCoordinates(coords) {
	        var clipPolygon = this._getClipPolygon();
	        if (clipPolygon.length) {
	            var newCoords = GeometryUtils.clipPolygon(coords, clipPolygon);
	            coords = newCoords;
	        }
	        coords = this._getProjectedPoints(coords);
	        return coords;
	    },

	    _getClipPolygon: function _getClipPolygon() {
	        if (this._clipPolygon === undefined) {
	            var clip;
	            if (this.options.bbox) {
	                clip = GeometryUtils.getClippingPolygon(this.options.bbox);
	            }
	            this._clipPolygon = clip || [];
	        }
	        return this._clipPolygon;
	    },

	    // ------------------------------------------------------------------

	    _getGeometry: function _getGeometry(resource) {
	        if (typeof this.options.getGeometry === 'function') {
	            return this.options.getGeometry(resource);
	        }
	        return resource.geometry;
	    },

	    /**
	     * Returns an array of projected points.
	     */
	    _getProjectedPoints: function _getProjectedPoints(coordinates) {
	        return this.options.project(coordinates);
	    },

	    /** Returns the initial shift */
	    getOrigin: function getOrigin() {
	        return this.options.origin || [0, 0];
	    }

	});

	module.exports = GeometryRenderer;

/***/ },
/* 8 */
/***/ function(module, exports) {

	/**
	 * Calls the specified callback for each coordinate in the given geometry.
	 */
	'use strict';

	module.exports.forEachCoordinate = function forEach(geometry, callback) {
	    var j, k, l;
	    var coords = geometry.coordinates;
	    if (geometry.type === 'Point') {
	        callback(coords);
	    } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
	        for (j = 0; j < coords.length; j++) callback(coords[j]);
	    } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
	        var wrapShrink = geometry.type === 'Polygon' ? 1 : 0;
	        for (j = 0; j < coords.length; j++) for (k = 0; k < coords[j].length - wrapShrink; k++) callback(coords[j][k]);
	    } else if (geometry.type === 'MultiPolygon') {
	        for (j = 0; j < coords.length; j++) for (k = 0; k < coords[j].length; k++) for (l = 0; l < coords[j][k].length - 1; l++) callback(coords[j][k][l]);
	    } else {
	        throw new Error('Unknown Geometry Type');
	    }
	};

	/**
	 * Returns a bounding box for the specified geometry.
	 */
	module.exports.getBoundingBox = function (geometry) {
	    var extent = [[Infinity, Infinity], [-Infinity, -Infinity]];
	    this.forEachCoordinate(geometry, function (coord) {
	        if (extent[0][0] > coord[0]) extent[0][0] = coord[0];
	        if (extent[0][1] > coord[1]) extent[0][1] = coord[1];
	        if (extent[1][0] < coord[0]) extent[1][0] = coord[0];
	        if (extent[1][1] < coord[1]) extent[1][1] = coord[1];
	    });
	    return extent;
	};

	/**
	 * Calls a specified callback methods to notify about individual basic geometry
	 * elements (points, lines, polygons).
	 * 
	 * @param geometry
	 *            a GeoJson geometry object
	 * @param callback.onPoints
	 *            called to notify about a list of points
	 * @param callback.onLines
	 *            called to notify about a list of line segments
	 * @param callback.onPolygons
	 *            called to notify about a list of polygons
	 */
	module.exports.forEachGeometry = function (geometry, callback) {
	    var coords = geometry.coordinates;
	    switch (geometry.type) {
	        case 'Point':
	            coords = [coords];
	        case 'MultiPoint':
	            if (typeof callback.onPoints === 'function') {
	                callback.onPoints(coords);
	            }
	            break;
	        case 'LineString':
	            coords = [coords];
	        case 'MultiLineString':
	            if (typeof callback.onLines === 'function') {
	                callback.onLines(coords);
	            }
	            break;
	        case 'Polygon':
	            coords = [coords];
	        case 'MultiPolygon':
	            if (typeof callback.onPolygons === 'function') {
	                callback.onPolygons(coords);
	            }
	            break;
	        case 'GeometryCollection':
	            var geoms = geometry.geometries;
	            for (var i = 0, len = geoms.length; i < len; i++) {
	                drawGeometry(geoms[i]);
	            }
	            break;
	    }
	};

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var L = __webpack_require__(1);

	var ParentType;
	if (L.Layer) {
	    // v1.0.0-beta2
	    ParentType = L.Layer.extend({
	        _getPane: function _getPane() {
	            return this._map.getPane(this.options.pane);
	        }
	    });
	    ParentType.throttle = L.Util.throttle;
	} else {
	    // v0.7.7
	    ParentType = L.Class.extend({
	        includes: L.Mixin.Events,
	        _getPane: function _getPane() {
	            var panes = this._map.getPanes();
	            return panes[this.options.pane];
	        }
	    });
	    ParentType.throttle = function (f, time, context) {
	        var timeoutId, that, args;
	        return function () {
	            that = context || this;
	            args = [];
	            for (var i = 0; i < arguments.length; i++) {
	                args.push(arguments[i]);
	            }
	            if (timeoutId === undefined) {
	                timeoutId = setTimeout(function () {
	                    timeoutId = undefined;
	                    return f.apply(that, args);
	                }, time);
	            }
	        };
	    };
	}
	var DataLayerTracker = ParentType.extend({
	    options: {
	        pane: 'markerPane'
	    },

	    // interactive: false,
	    // riseOnHover: true,
	    // riseOffset: 250
	    initialize: function initialize(options) {
	        L.setOptions(this, options);
	        var timeout = 50;
	        this._refreshData = ParentType.throttle(this._refreshData, timeout, this);
	    },

	    setDataLayer: function setDataLayer(layer) {
	        this._dataLayer = layer;
	    },

	    onAdd: function onAdd(map) {
	        this._map = map;
	        this._initIcon();
	        this._map.on('mousemove', this._onMouseMove, this);
	        this._dataLayer.on('mouseenter', this._onMouseEnter, this);
	        this._dataLayer.on('mouseleave', this._onMouseLeave, this);
	    },

	    onRemove: function onRemove(map) {
	        this._map.off('mousemove', this._onMouseMove, this);
	        this._dataLayer.off('mouseenter', this._onMouseEnter, this);
	        this._dataLayer.off('mouseleave', this._onMouseLeave, this);
	        this._removeIcon();
	        delete this._map;
	    },

	    // -----------------------------------------------------------------------

	    _onMouseMove: function _onMouseMove(ev) {
	        this._setLatLng(ev.latlng);
	        this._refreshData();
	        this._refreshIcon();
	    },

	    _onMouseEnter: function _onMouseEnter(ev) {
	        this._show = true;
	        this._element.style.display = 'block';
	    },

	    _onMouseLeave: function _onMouseLeave(ev) {
	        this._show = false;
	        this._element.style.display = 'none';
	    },

	    // -----------------------------------------------------------------------

	    _refreshData: function _refreshData() {
	        if (!this._show || !this._latlng) return;
	        var radius = this._getRadius();
	        var that = this;
	        this._dataLayer.loadDataAround(this._latlng, radius, //
	        function (err, data) {
	            that._data = data;
	            that._renderData();
	        });
	    },

	    _renderData: function _renderData() {
	        var data = this._data;
	        this._element.innerHTML = '';
	        var elm = L.DomUtil.create('div', '', this._element);
	        elm.innerHTML = data.length + '';
	        var style = this._getTooltipStyle();
	        L.Util.extend(elm.style, style);
	    },

	    _refreshIcon: function _refreshIcon() {
	        var elm = this._element;
	        if (!this._show) {
	            return;
	        }
	        var style = this._getBorderStyle();
	        L.Util.extend(elm.style, style);
	    },

	    // -----------------------------------------------------------------------

	    getLatLng: function getLatLng() {
	        return this._latlng;
	    },

	    _setLatLng: function _setLatLng(latlng) {
	        if (!latlng) return;
	        var oldLatLng = this._latlng;
	        this._latlng = L.latLng(latlng);

	        if (this._element && this._map) {
	            var pos = this._map.latLngToLayerPoint(this._latlng).round();
	            L.DomUtil.setPosition(this._element, pos);
	        }

	        return this.fire('move', {
	            oldLatLng: oldLatLng,
	            latlng: this._latlng,
	            target: this
	        });
	    },

	    getElement: function getElement() {
	        return this._element;
	    },

	    _getRadius: function _getRadius() {
	        if (!this._r) {
	            var r = typeof this.options.radius === 'function' ? //
	            this.options.radius //
	            : function (zoom) {
	                return this.options.radius || 40;
	            };
	            this._r = r.bind(this);
	        }
	        var zoom = this._map.getZoom();
	        return this._r(zoom);
	    },

	    _getTooltipStyle: function _getTooltipStyle() {
	        var color = this.options.trackerColor || 'gray';
	        return {
	            position: 'absolute',
	            backgroundColor: 'white',
	            top: '-1em',
	            left: '100%',
	            padding: '0.1em 0.5em',
	            border: '1px solid ' + color,
	            borderRadius: '0.8em',
	            borderBottomLeftRadius: '0'
	        };
	    },

	    _getBorderStyle: function _getBorderStyle() {
	        var r = this._getRadius();
	        var color = this.options.trackerColor || 'rgba(255, 255, 255, .5)';
	        return {
	            border: '5px solid ' + color,
	            borderRadius: r + 'px',
	            height: r + 'px',
	            width: r + 'px',
	            background: 'none',
	            marginLeft: -(r / 2) + 'px',
	            marginTop: -(r / 2) + 'px'
	        };
	    },

	    _initIcon: function _initIcon() {
	        if (!this._element) {
	            var className = '';
	            var container = this._getPane();
	            this._element = L.DomUtil.create('div', className, container);
	        }
	        this._element.style.display = 'none';
	        return this._element;
	    },

	    _removeIcon: function _removeIcon() {
	        if (this._element) {
	            L.DomUtil.remove(this._element);
	            delete this._element;
	        }
	    }

	});
	module.exports = DataLayerTracker;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(11);

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var extend = __webpack_require__(4);

	function GeometryRenderStyle(options) {
	    this.initialize(options);
	}
	extend(GeometryRenderStyle.prototype, {

	    initialize: function initialize(options) {
	        this.options = options || {};
	        extend(this, this.options);
	    },

	    /**
	     * Returns an object containing a marker image, image anchor point. If there
	     * is no image returned then the marker is not shown.
	     * 
	     * @param resource
	     *            the resource to draw
	     * @param options.index
	     *            index of the coordinates array; used for MultiXxx geometry
	     *            types (MultiPolygon, MultiLine etc); if the index is not
	     *            defined then this is request for a marker for the whole
	     *            resource
	     * @return object containing the following fields: 1) 'image' the image to
	     *         draw as a marker 2) 'anchor' is an array with the X and Y
	     *         coordinates of the anchor point of the marker (position on the
	     *         image corresponding to the coordinates)
	     */
	    getMarkerStyle: function getMarkerStyle(resource, options) {
	        return this._getStyle('marker', resource, options) || {
	            image: undefined,
	            anchor: [0, 0]
	        };
	    },

	    getLineStyle: function getLineStyle(resource, options) {
	        return this._getStyle('line', resource, options);
	    },

	    getPolygonStyle: function getPolygonStyle(resource, options) {
	        return this._getStyle('polygon', resource, options);
	    },

	    _getStyle: function _getStyle(key, resource, options) {
	        var style = this.options[key];
	        if (typeof style === 'function') {
	            style = style.call(this, resource, options);
	        }
	        return style;
	    }

	});

	module.exports = GeometryRenderStyle;

/***/ },
/* 12 */
/***/ function(module, exports) {

	/**
	 * A simple data provider synchronously indexing the given data using an RTree
	 * index.
	 */
	'use strict';

	function IDataProvider() {
	    if (typeof this.options.getGeometry === 'function') {
	        this.getGeometry = this.options.getGeometry;
	    }
	    this.options = options || {};
	}
	/**
	 * Loads and returns indexed data contained in the specified bounding box.
	 */
	IDataProvider.prototype.loadData = function (options, callback) {
	    callback(null, this.options.data || []);
	};
	IDataProvider.prototype.getGeometry = function (r) {
	    return r.geometry;
	};

	module.exports = IDataProvider;

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var rbush = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"rbush\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
	var GeoJsonUtils = __webpack_require__(8);
	var GeometryUtils = __webpack_require__(5);

	/**
	 * A simple data provider synchronously indexing the given data using an RTree
	 * index.
	 */
	function DataProvider() {
	    this.initialize.apply(this, arguments);
	}
	DataProvider.prototype = {

	    /** Initializes this object and indexes the initial data set. */
	    initialize: function initialize(options) {
	        this.options = options || {};
	        if (typeof this.options.getGeometry === 'function') {
	            this.getGeometry = this.options.getGeometry;
	        }
	        this.setData(this.options.data);
	    },

	    /** Sets and indexes the given data */
	    setData: function setData(data) {
	        this._indexData(data);
	    },

	    /**
	     * Loads and returns indexed data contained in the specified bounding box.
	     * 
	     * @param options.bbox
	     *            a bounding box used to search data
	     */
	    loadData: function loadData(options, callback) {
	        var that = this;
	        var data = that._searchInBbox(options.bbox);
	        callback(null, data);
	    },

	    /** Indexes the specified data array using a RTree index. */
	    _indexData: function _indexData(data) {
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
	    _searchInBbox: function _searchInBbox(bbox) {
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
	                onPoints: function onPoints(points) {
	                    if (!handled && (!filterMultiPoints || GeometryUtils.bboxContainsPoints(points, bbox))) {
	                        result.push(r);
	                        handled = true;
	                    }
	                },
	                onLines: function onLines(lines) {
	                    if (!handled && GeometryUtils.bboxIntersectsLines(lines, bbox)) {
	                        result.push(r);
	                        handled = true;
	                    }
	                },
	                onPolygons: function onPolygons(polygons) {
	                    if (!handled && GeometryUtils.bboxIntersectsPolygonsWithHoles(polygons, bbox)) {
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
	    _sortByDistance: function _sortByDistance(array, bbox) {
	        if (typeof this.options.sort === 'function') {
	            this._sortByDistance = this.options.sort;
	        } else {
	            this._sortByDistance = function (array, bbox) {
	                var p = bbox[0];
	                array.sort(function (a, b) {
	                    var d = a[1] - p[1] - (b[1] - p[1]);
	                    if (d === 0) {
	                        d = a[0] - p[0] - (b[0] - p[0]);
	                    }
	                    return d;
	                });
	                return array;
	            };
	        }
	        return this._sortByDistance(array, bbox);
	    },

	    /**
	     * This method transforms a bounding box into a key for RTree index.
	     */
	    _toIndexKey: function _toIndexKey(bbox) {
	        return [+bbox[0][0], +bbox[0][1], +bbox[1][0], +bbox[1][1]];
	    },

	    /**
	     * Returns an object defining a bounding box ([south, west, north, east])
	     * for the specified resource.
	     */
	    _getBoundingBox: function _getBoundingBox(r) {
	        var geometry = this.getGeometry(r);
	        return GeoJsonUtils.getBoundingBox(geometry);
	    },

	    getGeometry: function getGeometry(r) {
	        return r.geometry;
	    }

	};

	module.exports = DataProvider;

/***/ },
/* 14 */
/***/ function(module, exports) {

	'use strict';

	function GridIndex() {
	    this.initialize.apply(this, arguments);
	}

	GridIndex.prototype = {

	    initialize: function initialize(options) {
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
	    getData: function getData(x, y) {
	        var array = this.getAllData(x, y);
	        return array && array.length ? array[0] : undefined;
	    },

	    /**
	     * Returns all data objects associated with the specified position on the
	     * canvas.
	     */
	    getAllData: function getAllData(x, y) {
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
	    addData: function addData(x, y, options) {
	        var maskX = this._getMaskX(x);
	        var maskY = this._getMaskY(y);
	        var key = this._getIndexKey(maskX, maskY);
	        return this._addDataToIndex(key, options);
	    },

	    reset: function reset() {
	        this._dataIndex = {};
	    },

	    /**
	     * Transforms a X coordinate on canvas to X coordinate in the mask.
	     */
	    _getMaskX: function _getMaskX(x) {
	        var resolutionX = this.options.resolutionX;
	        return Math.round(x / resolutionX);
	    },

	    /**
	     * Transforms Y coordinate on canvas to Y coordinate in the mask.
	     */
	    _getMaskY: function _getMaskY(y) {
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
	    _addDataToIndex: function _addDataToIndex(key, options) {
	        var data = options.data;
	        if (data === undefined) return;
	        var array = this._dataIndex[key];
	        if (!array || options.replace) {
	            array = this._dataIndex[key] = [];
	        }
	        array.unshift(data);
	        array.count = (array.count || 0) + 1;
	        while (array.length && array.length > (this.options.maxCellCapacity || 1)) {
	            array.pop();
	        }
	    },

	    _getIndexKey: function _getIndexKey(maskX, maskY) {
	        return maskX + ':' + maskY;
	    }
	};

	module.exports = GridIndex;

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var GridIndex = __webpack_require__(14);
	var extend = __webpack_require__(4);

	function ImageGridIndex() {
	    GridIndex.apply(this, arguments);
	}
	extend(ImageGridIndex.prototype, GridIndex.prototype, {

	    /**
	     * Adds all pixels occupied by the specified image to a data mask associated
	     * with canvas.
	     */
	    indexImage: function indexImage(image, x, y, options) {
	        var result = false;
	        var data = options.data;
	        if (!data) return result;
	        var mask = this._getImageMask(image, options);
	        var imageMaskWidth = this._getMaskX(image.width);
	        var maskShiftX = this._getMaskX(x);
	        var maskShiftY = this._getMaskY(y);
	        for (var i = 0; i < mask.length; i++) {
	            if (!mask[i]) continue;
	            var maskX = maskShiftX + i % imageMaskWidth;
	            var maskY = maskShiftY + Math.floor(i / imageMaskWidth);
	            var key = this._getIndexKey(maskX, maskY);
	            this._addDataToIndex(key, options);
	            result = true;
	        }
	        return result;
	    },

	    // -------------------------------------------------------------------------

	    /**
	     * Returns a unique key of the specified image. If this method returns
	     * <code>null</code> then the image mask is not stored in the internal
	     * mask cache. To allow to store the image mask in cache the image should be
	     * 'stampted' with a new identifier using the ImageGridIndex.stampImage
	     * method..
	     */
	    stampImage: function stampImage(image) {
	        return ImageGridIndex.stampImage(image);
	    },

	    // -------------------------------------------------------------------------

	    /**
	     * Returns a mask corresponding to the specified image.
	     */
	    _getImageMask: function _getImageMask(image, options) {
	        var imageKey = this.stampImage(image);
	        var maskIndex = this._getImageMaskIndex(image, options);
	        if (!maskIndex || !imageKey) {
	            return this._buildImageMask(image, options);
	        }
	        var mask = maskIndex[imageKey];
	        if (!mask) {
	            mask = this._buildImageMask(image, options);
	            maskIndex[imageKey] = mask;
	        }
	        return mask;
	    },

	    /**
	     * This method maintain an index of image masks associated with the provided
	     * canvas. This method could be overloaded to implement a global index of
	     * image masks.
	     */
	    _getImageMaskIndex: function _getImageMaskIndex(image, options) {
	        var index = options.imageMaskIndex || this.options.imageMaskIndex;
	        if (!index) return;
	        if (typeof index === 'function') {
	            index = index(image, options);
	        }
	        return index;
	    },

	    /** Creates and returns an image mask. */
	    _buildImageMask: function _buildImageMask(image) {
	        var maskWidth = this._getMaskX(image.width);
	        var maskHeight = this._getMaskY(image.height);
	        var buf = this._getResizedImageBuffer(image, maskWidth, maskHeight);
	        var mask = new Array(maskWidth * maskHeight);
	        for (var y = 0; y < maskHeight; y++) {
	            for (var x = 0; x < maskWidth; x++) {
	                var idx = y * maskWidth + x;
	                var filled = this._checkFilledPixel(buf, idx);
	                mask[idx] = filled ? 1 : 0;
	            }
	        }
	        return mask;
	    },

	    /**
	     * Returns <code>true</code> if the specified pixel is not transparent
	     */
	    _checkFilledPixel: function _checkFilledPixel(buf, pos) {
	        // Check that the alpha channel is not 0 which means that this
	        // pixel is not transparent and it should not be associated with data.
	        // 4 bytes per pixel; RGBA - forth byte is an alpha channel.
	        var idx = pos * 4 + 3;
	        return !!buf[idx];
	    },

	    /** Returns a raw data for the resized image. */
	    _getResizedImageBuffer: function _getResizedImageBuffer(image, width, height) {
	        var g;
	        if (image.tagName === 'CANVAS' && image.width === width && image.height === height) {
	            g = image.getContext('2d');
	        } else {
	            var canvas = this._newCanvas(width, height);
	            canvas.width = width;
	            canvas.height = height;
	            g = canvas.getContext('2d');
	            g.drawImage(image, 0, 0, width, height);
	        }
	        var data = g.getImageData(0, 0, width, height).data;
	        return data;
	    },

	    _newCanvas: function _newCanvas(width, height) {
	        var canvas;
	        if (this.options.newCanvas) {
	            canvas = this.options.newCanvas(width, height);
	        } else {
	            canvas = document.createElement('canvas');
	            canvas.width = width;
	            canvas.height = height;
	        }
	        return canvas;
	    }

	});

	ImageGridIndex.stampImage = function (image) {
	    var key = image['image-id'];
	    if (!key) {
	        var that = ImageGridIndex;
	        that._imageIdCounter = (that._imageIdCounter || 0) + 1;
	        key = image['image-id'] = 'i' + that._imageIdCounter;
	    }
	    return key;
	};
	module.exports = ImageGridIndex;

/***/ },
/* 16 */
/***/ function(module, exports) {

	"use strict";

	module.exports = {

	    /**
	     * Draws a simple marker on the specified canvas 2d context.
	     */
	    drawMarker: function drawMarker(g, x, y, width, height, radius) {
	        g.beginPath();
	        // a
	        g.moveTo(x + width / 2, y);
	        // b
	        g.bezierCurveTo( //
	        x + width / 2 + radius / 2, y, //
	        x + width / 2 + radius, y + radius / 2, //
	        x + width / 2 + radius, y + radius);
	        // c
	        g.bezierCurveTo( //
	        x + width / 2 + radius, y + radius * 2, //
	        x + width / 2, y + height / 2 + radius / 3, //
	        x + width / 2, y + height);
	        // d
	        g.bezierCurveTo( //
	        x + width / 2, y + height / 2 + radius / 3, //
	        x + width / 2 - radius, y + radius * 2, //
	        x + width / 2 - radius, y + radius);
	        // e (a)
	        g.bezierCurveTo( //
	        x + width / 2 - radius, y + radius / 2, //
	        x + width / 2 - radius / 2, y + 0, //
	        x + width / 2, y + 0);
	        g.closePath();
	    }

	};

/***/ }
/******/ ])
});
;