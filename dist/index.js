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
	L.DataLayer.CanvasContext = __webpack_require__(4);
	L.DataLayer.CanvasIndexingContext = __webpack_require__(6);
	L.DataLayer.GeometryRenderer = __webpack_require__(9);
	L.DataLayer.GeometryRendererStyle = __webpack_require__(10);
	L.DataLayer.IDataProvider = __webpack_require__(11);
	L.DataLayer.DataProvider = __webpack_require__(12);
	module.exports = L.DataLayer;

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var L = __webpack_require__(1);
	var Utils = __webpack_require__(3);

	var CanvasContext = __webpack_require__(4);
	var CanvasIndexingContext = __webpack_require__(6);
	var GeometryRenderer = __webpack_require__(9);

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


/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = {
	    extend : function extend(to) {
	        var len = arguments.length;
	        for (var i = 1; i < len; i++) {
	            var from = arguments[i];
	            for ( var key in from) {
	                if (from.hasOwnProperty(key)) {
	                    to[key] = from[key];
	                }
	            }
	        }
	    }
	};

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var simplify = __webpack_require__(5);

	/**
	 * This class provides a set of utility methods simplifying data visualization
	 * on canvas.
	 */
	function CanvasContext() {
	    this.initialize.apply(this, arguments);
	}
	CanvasContext.prototype = {

	    /** Initializes this object. */
	    initialize : function(options) {
	        this.options = options || {};
	        this._canvas = this.options.canvas;
	        this._context = this._canvas.getContext('2d');
	    },

	    // -----------------------------------------------------------------------

	    /**
	     * Returns an array [width, height] for the underlying canvas.
	     */
	    getCanvasSize : function() {
	        return [ this._canvas.width, this._canvas.height ];
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
	    drawImage : function(image, position, options) {
	        this._drawOnCanvasContext(options, function(g) {
	            g.drawImage(image, position[0], position[1]);
	            return true;
	        });
	    },

	    // -----------------------------------------------------------------------
	    // Public methods

	    /**
	     * Draws a line defined by the specified sequence of points.
	     */
	    drawLine : function(points, options) {
	        var strokeStyles = this._getStrokeStyles(options);
	        if (!strokeStyles)
	            return;
	        this._drawOnCanvasContext(options, function(g) {
	            // Simplify point sequence
	            points = this._simplify(points);
	            // Trace the line
	            return this._drawLines(g, points, strokeStyles);
	        });
	    },

	    /**
	     * Draws polygons with holes on the canvas.
	     */
	    drawPolygon : function(polygons, holes, options) {
	        // Get styles
	        var fillStyles = this._getFillStyles(options);
	        var strokeStyles = this._getStrokeStyles(options);
	        // Return if there is no styles defined for these polygons
	        if (!fillStyles && !strokeStyles)
	            return;
	        // Create new canvas where the polygon should be drawn
	        this._drawOnCanvasContext(options, function(g) {
	            var i;
	            // Simplify lines
	            polygons = this._simplify(polygons);
	            holes = holes || [];
	            for (i = 0; i < holes.length; i++) {
	                holes[i] = this._simplify(holes[i]);
	            }

	            // Draw the polygon itself
	            g.globalCompositeOperation = 'source-over';
	            if (fillStyles) {
	                this._setCanvasStyles(g, fillStyles);
	                if (fillStyles._pattern) {
	                    g.fillStyle = g
	                            .createPattern(fillStyles._pattern, "repeat");
	                }
	                g.beginPath();
	                this._trace(g, polygons[0]);
	                g.closePath();
	                g.fill();
	            }

	            // Draw lines around the polygon (external lines)
	            this._drawLines(g, polygons, strokeStyles);

	            // Remove holes areas from the polygon
	            g.globalCompositeOperation = 'destination-out';
	            g.globalAlpha = 1;
	            for (i = 0; i < holes.length; i++) {
	                if (holes[i].length) {
	                    g.beginPath();
	                    this._trace(g, holes[i]);
	                    g.closePath();
	                    g.fill();
	                }
	            }

	            // Draw lines around the polygon holes
	            for (i = 0; i < holes.length; i++) {
	                this._drawLines(g, holes[i], strokeStyles);
	            }
	            return true;
	        });
	    },

	    // -----------------------------------------------------------------------
	    // Private methods

	    /**
	     * Draws lines with the specified coordinates and styles.
	     */
	    _drawLines : function(g, coords, styles) {
	        if (!styles)
	            return false;
	        if (!coords.length)
	            return false;
	        g.globalCompositeOperation = 'source-over';
	        this._setCanvasStyles(g, styles);
	        g.beginPath();
	        for (var i = 0; i < coords.length; i++) {
	            this._trace(g, coords[i]);
	            g.stroke();
	        }
	        g.closePath();
	        return true;
	    },

	    /**
	     * Trace the specified path on the given canvas context.
	     * 
	     * @param g
	     *            canvas context
	     * @param coords
	     *            a sequence of coordinates to trace
	     */
	    _trace : function(g, coords) {
	        if (!coords || !coords.length)
	            return;
	        g.moveTo(coords[0][0], coords[0][1]);
	        for (var i = 1; i < coords.length; i++) {
	            g.lineTo(coords[i][0], coords[i][1]);
	        }
	    },

	    /** Simplifies the given line. */
	    _simplify : function(coords) {
	        var tolerance = this.options.tolerance || 0.8;
	        var enableHighQuality = !!this.options.highQuality;
	        var points = simplify(coords, tolerance, enableHighQuality);
	        return points;
	    },

	    /**
	     * Copies fill styles from the specified options object to a separate style
	     * object. Returns <code>null</code> if the options do not contain
	     * required styles.
	     */
	    _getFillStyles : function(options) {
	        var styles = {};
	        styles.fillStyle = options.fillColor || options.color || 'blue';
	        styles.globalAlpha = options.globalAlpha || options.fillOpacity
	                || options.opacity || 0;
	        if (options.fillImage) {
	            styles._pattern = options.fillImage;
	        }
	        if (this._isEmptyValue(styles.globalAlpha) && !styles._pattern)
	            return null;
	        return styles;
	    },

	    /**
	     * Copies stroke styles from the specified options object to a separate
	     * style object. Returns <code>null</code> if options do not contain
	     * required styles.
	     */
	    _getStrokeStyles : function(options) {
	        var styles = {};
	        styles.strokeStyle = options.lineColor || options.color || 'blue';
	        styles.globalAlpha = options.lineOpacity || options.opacity || 0;
	        styles.lineWidth = options.lineWidth || options.width || 0;
	        styles.lineCap = options.lineCap || 'round'; // 'butt|round|square'
	        styles.lineJoin = options.lineJoin || 'round'; // 'miter|round|bevel'
	        if (this._isEmptyValue(styles.lineWidth) || //
	        this._isEmptyValue(styles.globalAlpha))
	            return null;
	        return styles;
	    },

	    /**
	     * Returns <code>true</code> if the specified value is 0 or undefined.
	     */
	    _isEmptyValue : function(val) {
	        return val === undefined || val === 0 || val === '';
	    },

	    /**
	     * Copies styles from the specified style object to the canvas context.
	     */
	    _setCanvasStyles : function(g, styles) {
	        for ( var key in styles) {
	            if (!key || key[0] === '_')
	                continue;
	            g[key] = styles[key];
	        }
	    },

	    // -----------------------------------------------------------------------

	    _drawOnCanvasContext : function(options, f) {
	        f.call(this, this._context);
	    },

	};

	module.exports = CanvasContext;


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*
	 (c) 2013, Vladimir Agafonkin
	 Simplify.js, a high-performance JS polyline simplification library
	 mourner.github.io/simplify-js
	*/

	(function () { 'use strict';

	// to suit your point format, run search/replace for '.x' and '.y';
	// for 3D version, see 3d branch (configurability would draw significant performance overhead)

	// square distance between 2 points
	function getSqDist(p1, p2) {

	    var dx = p1.x - p2.x,
	        dy = p1.y - p2.y;

	    return dx * dx + dy * dy;
	}

	// square distance from a point to a segment
	function getSqSegDist(p, p1, p2) {

	    var x = p1.x,
	        y = p1.y,
	        dx = p2.x - x,
	        dy = p2.y - y;

	    if (dx !== 0 || dy !== 0) {

	        var t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

	        if (t > 1) {
	            x = p2.x;
	            y = p2.y;

	        } else if (t > 0) {
	            x += dx * t;
	            y += dy * t;
	        }
	    }

	    dx = p.x - x;
	    dy = p.y - y;

	    return dx * dx + dy * dy;
	}
	// rest of the code doesn't care about point format

	// basic distance-based simplification
	function simplifyRadialDist(points, sqTolerance) {

	    var prevPoint = points[0],
	        newPoints = [prevPoint],
	        point;

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

	// simplification using optimized Douglas-Peucker algorithm with recursion elimination
	function simplifyDouglasPeucker(points, sqTolerance) {

	    var len = points.length,
	        MarkerArray = typeof Uint8Array !== 'undefined' ? Uint8Array : Array,
	        markers = new MarkerArray(len),
	        first = 0,
	        last = len - 1,
	        stack = [],
	        newPoints = [],
	        i, maxSqDist, sqDist, index;

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

	    var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

	    points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
	    points = simplifyDouglasPeucker(points, sqTolerance);

	    return points;
	}

	// export as AMD module / Node module / browser or worker variable
	if (true) !(__WEBPACK_AMD_DEFINE_RESULT__ = function() { return simplify; }.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	else if (typeof module !== 'undefined') module.exports = simplify;
	else if (typeof self !== 'undefined') self.simplify = simplify;
	else window.simplify = simplify;

	})();


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(3);
	var CanvasContext = __webpack_require__(4);
	var ImageGridIndex = __webpack_require__(7);

	/**
	 * This utility class allows to associate data with non-transparent pixels of
	 * images drawn on canvas.
	 */
	function CanvasIndexingContext() {
	    CanvasContext.apply(this, arguments);
	}
	CanvasIndexingContext.stampImage = ImageGridIndex.stampImage;
	Utils.extend(CanvasIndexingContext, CanvasContext);
	Utils.extend(CanvasIndexingContext.prototype, CanvasContext.prototype, {

	    /**
	     * Initializes internal fields of this class.
	     * 
	     * @param options.canvas
	     *            mandatory canvas object used to draw images
	     * @param options.resolution
	     *            optional resolution field defining precision of image areas
	     *            associated with data; by default it is 4x4 pixel areas
	     *            (resolution = 4)
	     */
	    initialize : function(options) {
	        CanvasContext.prototype.initialize.apply(this, arguments);
	        // Re-define a method returning unique image identifiers.
	        if (typeof this.options.getImageKey === 'function') {
	            this.getImageKey = this.options.getImageKey;
	        }
	        this.index = new ImageGridIndex(options);
	    },

	    /**
	     * Draws the specified image in the given position on the underlying canvas.
	     */
	    drawImage : function(image, position, options) {
	        console.log('*** ', image, position, options);
	        if (!image || !position)
	            return;
	        var x = position[0];
	        var y = position[1];
	        // Draw the image on the canvas
	        this._context.drawImage(image, x, y);
	        // Associate non-transparent pixels of the image with data
	        this.index.indexImage(image, x, y, options);
	    },

	    _drawOnCanvasContext : function(options, f) {
	        // Create new canvas where the polygon should be drawn
	        var canvas = this._newCanvas();
	        var g = canvas.getContext('2d');
	        var ok = f.call(this, g);
	        if (ok) {
	            this.drawImage(canvas, [ 0, 0 ], options);
	        }
	    },

	    /**
	     * Creates and returns a new canvas used to draw individual features.
	     */
	    _newCanvas : function() {
	        var canvas;
	        var width = this._canvas.width;
	        var height = this._canvas.height;
	        if (this.options.newCanvas) {
	            canvas = this.options.newCanvas(width, height);
	        } else {
	            canvas = document.createElement('canvas');
	            canvas.width = width;
	            canvas.height = height;
	        }
	        return canvas;
	    },

	    /**
	     * Returns data associated with the specified position on the canvas.
	     */
	    getData : function(x, y) {
	        return this.index.getData(x, y);
	    },

	    /**
	     * Returns all data objects associated with the specified position on the
	     * canvas.
	     */
	    getAllData : function(x, y) {
	        return this.index.getAllData(x, y);
	    },

	    /**
	     * Sets data in the specified position on the canvas.
	     */
	    setData : function(x, y, data) {
	        return this.index.setData(x, y, data);
	    },

	    /**
	     * Removes all data from internal indexes and cleans up underlying canvas.
	     */
	    reset : function() {
	        var g = this._context;
	        g.clearRect(0, 0, this._canvas.width, this._canvas.height);
	        this.index.reset();
	    },

	});
	module.exports = CanvasIndexingContext;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var GridIndex = __webpack_require__(8);
	var Utils = __webpack_require__(3);

	function ImageGridIndex() {
	    GridIndex.apply(this, arguments);
	}
	Utils.extend(ImageGridIndex.prototype, GridIndex.prototype, {

	    /**
	     * Adds all pixels occupied by the specified image to a data mask associated
	     * with canvas.
	     */
	    indexImage : function(image, x, y, options) {
	        var result = false;
	        var data = options.data;
	        if (!data)
	            return result;
	        var mask = this._getImageMask(image, options);
	        var imageMaskWidth = this._getMaskX(image.width);
	        var maskShiftX = this._getMaskX(x);
	        var maskShiftY = this._getMaskY(y);
	        for (var i = 0; i < mask.length; i++) {
	            if (!mask[i])
	                continue;
	            var maskX = maskShiftX + (i % imageMaskWidth);
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
	    stampImage : function(image) {
	        return ImageGridIndex.stampImage(image);
	    },

	    // -------------------------------------------------------------------------

	    /**
	     * Returns a mask corresponding to the specified image.
	     */
	    _getImageMask : function(image, options) {
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
	    _getImageMaskIndex : function(image, options) {
	        var index = options.imageMaskIndex || this.options.imageMaskIndex;
	        if (!index)
	            return;
	        if (typeof index === 'function') {
	            index = index(image, options);
	        }
	        return index;
	    },

	    /** Creates and returns an image mask. */
	    _buildImageMask : function(image) {
	        var maskWidth = this._getMaskX(image.width);
	        var maskHeight = this._getMaskY(image.height);
	        var buf = this._getResizedImageBuffer(image, maskWidth, maskHeight);
	        var mask = new Array(maskWidth * maskHeight);
	        for (var y = 0; y < maskHeight; y++) {
	            for (var x = 0; x < maskWidth; x++) {
	                var idx = (y * maskWidth + x);
	                var filled = this._checkFilledPixel(buf, idx);
	                mask[idx] = filled ? 1 : 0;
	            }
	        }
	        return mask;
	    },

	    /**
	     * Returns <code>true</code> if the specified pixel is not transparent
	     */
	    _checkFilledPixel : function(buf, pos) {
	        // Check that the alpha channel is not 0 which means that this
	        // pixel is not transparent and it should not be associated with data.
	        // 4 bytes per pixel; RGBA - forth byte is an alpha channel.
	        var idx = pos * 4 + 3;
	        return !!buf[idx];
	    },

	    /** Returns a raw data for the resized image. */
	    _getResizedImageBuffer : function(image, width, height) {
	        var g;
	        if (image.tagName === 'CANVAS' && image.width === width
	                && image.height === height) {
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

	    _newCanvas : function(width, height) {
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

	ImageGridIndex.stampImage = function(image) {
	    var key = image['image-id'];
	    if (!key) {
	        var that = ImageGridIndex;
	        that._imageIdCounter = (that._imageIdCounter || 0) + 1;
	        key = image['image-id'] = 'i' + that._imageIdCounter;
	    }
	    return key;
	}
	module.exports = ImageGridIndex;


/***/ },
/* 8 */
/***/ function(module, exports) {

	function GridIndex() {
	    this.initialize.apply(this, arguments);
	}

	GridIndex.prototype = {

	    initialize : function(options) {
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
	    getData : function(x, y) {
	        var array = this.getAllData(x, y);
	        return array && array.length ? array[0] : undefined;
	    },

	    /**
	     * Returns all data objects associated with the specified position on the
	     * canvas.
	     */
	    getAllData : function(x, y) {
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
	    addData : function(x, y, options) {
	        var maskX = this._getMaskX(x);
	        var maskY = this._getMaskY(y);
	        var key = this._getIndexKey(maskX, maskY);
	        return this._addDataToIndex(key, options);
	    },

	    reset : function() {
	        this._dataIndex = {};
	    },

	    /**
	     * Transforms a X coordinate on canvas to X coordinate in the mask.
	     */
	    _getMaskX : function(x) {
	        var resolutionX = this.options.resolutionX;
	        return Math.round(x / resolutionX);
	    },

	    /**
	     * Transforms Y coordinate on canvas to Y coordinate in the mask.
	     */
	    _getMaskY : function(y) {
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
	    _addDataToIndex : function(key, options) {
	        var data = options.data;
	        if (!data)
	            return;
	        var array = this._dataIndex[key];
	        if (!array || options.replace) {
	            array = this._dataIndex[key] = [];
	        }
	        array.unshift(data);
	    },

	    _getIndexKey : function(maskX, maskY) {
	        return maskX + ':' + maskY;
	    },
	}

	module.exports = GridIndex;


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(3);

	/**
	 * A common interface visualizing data on canvas.
	 */
	function GeometryRenderer() {
	    this.initialize.apply(this, arguments);
	}
	Utils.extend(GeometryRenderer.prototype, {

	    /** Initializes fields of this object. */
	    initialize : function(options) {
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
	     * @param context
	     *            a canvas context
	     */
	    drawFeature : function(resource, style) {
	        var that = this;
	        var geometry = resource.geometry;
	        if (!geometry)
	            return;
	        drawGeometry(geometry);
	        return;

	        function drawMarker(point, index) {
	            var marker = style.getMarkerStyle(resource, {
	                index : index,
	                point : point,
	                resource : resource
	            });
	            if (!marker || !marker.image)
	                return;

	            var pos = [ point[0], point[1] ]; // Copy
	            if (marker.anchor) {
	                pos[0] -= marker.anchor[0];
	                pos[1] -= marker.anchor[1];
	            }
	            that.context.drawImage(marker.image, pos, {
	                data : resource
	            });
	        }
	        function drawMarkers(points) {
	            points = that._getProjectedPoints(points);
	            for (var i = 0; i < points.length; i++) {
	                var point = points[i];
	                drawMarker(point, i);
	            }
	        }

	        function drawLine(points, index) {
	            var options = style.getLineStyle(resource, {
	                index : index
	            });
	            if (options) {
	                points = that._getProjectedPoints(points);
	                options.data = resource;
	                that.context.drawLine(points, options);
	            }
	            // drawMarker([ 0, 0 ]);
	        }

	        function drawPolygon(coords, index) {
	            var polygons = that._getProjectedPoints(coords[0]);
	            var holes = [];
	            for (var i = 1; i < coords.length; i++) {
	                var hole = that._getProjectedPoints(coords[i]);
	                if (hole.length) {
	                    holes.push(hole);
	                }
	            }
	            var options = style.getPolygonStyle(resource, {
	                index : index
	            });
	            if (options) {
	                options.data = resource;
	                that.context.drawPolygon([ polygons ], holes, options);
	            }
	            // drawMarker([ 0, 0 ]);
	        }

	        function drawGeometry(geometry) {
	            var coords = geometry.coordinates;
	            switch (geometry.type) {
	            case 'Point':
	                (function() {
	                    drawMarkers([ coords ]);
	                })();
	                break;
	            case 'MultiPoint':
	                (function() {
	                    drawMarkers(coords);
	                })();
	                break;
	            case 'LineString':
	                (function() {
	                    drawLine(coords);
	                })();
	                break;
	            case 'MultiLineString':
	                (function() {
	                    for (var i = 0; i < coords.length; i++) {
	                        var points = that._getProjectedPoints(context,
	                                coords[i]);
	                        drawLine(points, i);
	                    }
	                })();
	                break;
	            case 'Polygon':
	                (function() {
	                    drawPolygon(coords);
	                })();
	                break;
	            case 'MultiPolygon':
	                (function() {
	                    for (var i = 0; i < coords.length; i++) {
	                        drawPolygon(coords[i], i);
	                    }
	                })();
	                break;
	            case 'GeometryCollection':
	                (function() {
	                    var geoms = geometry.geometries;
	                    for (var i = 0, len = geoms.length; i < len; i++) {
	                        drawGeometry(geoms[i]);
	                    }
	                })();
	                break;
	            }
	        }
	    },

	    // ------------------------------------------------------------------

	    /**
	     * Returns an array of projected points.
	     */
	    _getProjectedPoints : function(coordinates) {
	        if (typeof this.options.project === 'function') {
	            this._getProjectedPoints = function(coordinates) {
	                return this.options.project(coordinates);
	            }
	            return this._getProjectedPoints(coordinates);
	        }

	        var t = this.getTransformation();
	        var s = this.getScale();
	        var origin = this.getOrigin();
	        var o = t.direct(origin[0], origin[1], s);
	        var result = [];
	        for (var i = 0; i < coordinates.length; i++) {
	            var p = coordinates[i];
	            var point = t.direct(p[0], p[1], s);
	            point[0] = Math.round(point[0] - o[0]);
	            point[1] = Math.round(point[1] - o[1]);
	            result.push(point);
	        }
	        return result;
	    },

	    /**
	     * Returns a buffer zone size (in pixels) around the image. The returned
	     * value is an array with the following buffer size values: [top, right,
	     * bottom, left].
	     */
	    getBufferZoneSize : function() {
	        var buf = this.options.buffer;
	        if (buf && (typeof buf === 'function')) {
	            buf = buf.apply(this, this);
	        }
	        if (!buf) {
	            var size = this.getTileSize() / 8;
	            buf = [ size, size, size, size ];
	        }
	        return buf;
	    },

	    getTransformation : function() {
	        if (!this._transformation) {
	            this._transformation = this.options.transformation
	                    || transform(1 / 180, 0, -1 / 90, 0);
	            function transform(a, b, c, d) {
	                return {
	                    direct : function(x, y, scale) {
	                        return [ scale * (x * a + b), scale * (y * c + d) ];
	                    },
	                    inverse : function(x, y, scale) {
	                        return [ (x / scale - b) / a, (y / scale - d) / c ];
	                    }
	                };
	            }
	        }
	        return this._transformation;
	    },

	    /** Returns the current scale */
	    getScale : function() {
	        return this.options.scale || 1;
	    },

	    /** Returns the initial shift */
	    getOrigin : function() {
	        return this.options.origin || [ 0, 0 ];
	    },

	    getTileSize : function() {
	        return this.options.tileSize || 256;
	    }

	});

	// defines how the world scales with zoom
	GeometryRenderer.calculateScale = function(zoom, tileSize) {
	    tileSize = tileSize || 256;
	    return tileSize * Math.pow(2, zoom);
	};

	GeometryRenderer.calculateZoom = function(scale, tileSize) {
	    tileSize = tileSize || 256;
	    return Math.log(scale / tileSize) / Math.LN2;
	};

	module.exports = GeometryRenderer;


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(3);

	function GeometryRenderStyle(options) {
	    this.initialize(options);
	}
	Utils.extend(GeometryRenderStyle.prototype, {

	    initialize : function(options) {
	        this.options = options || {};
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
	    getMarkerStyle : function(resource, options) {
	        return this._getStyle('marker', resource, options) || {
	            image : undefined,
	            anchor : [ 0, 0 ]
	        };
	    },

	    getLineStyle : function(resource, options) {
	        return this._getStyle('line', resource, options);
	    },

	    getPolygonStyle : function(resource, options) {
	        return this._getStyle('polygon', resource, options);
	    },

	    _getStyle : function(key, resource, options) {
	        var style = this.options[key];
	        if (typeof style === 'function') {
	            style = style.call(this, resource, options);
	        }
	        return style;
	    },

	});

	module.exports = GeometryRenderStyle;


/***/ },
/* 11 */
/***/ function(module, exports) {

	/**
	 * A simple data provider synchronously indexing the given data using an RTree
	 * index.
	 */
	function IDataProvider() {
	    this.initialize.apply(this, arguments);
	}
	IDataProvider.prototype = {

	    /** Initializes this object and indexes the initial data set. */
	    initialize : function(options) {
	        this.options = options || {};
	    },

	    /**
	     * Loads and returns indexed data contained in the specified bounding box.
	     */
	    loadData : function(options, callback) {
	        callback(null, this.options.data || []);
	    }

	};

	module.exports = IDataProvider;


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	var rbush = __webpack_require__(13);
	var TurfExtent = __webpack_require__(14);
	var IDataProvider = __webpack_require__(11);
	var Utils = __webpack_require__(3);

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


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*
	 (c) 2015, Vladimir Agafonkin
	 RBush, a JavaScript library for high-performance 2D spatial indexing of points and rectangles.
	 https://github.com/mourner/rbush
	*/

	(function () {
	'use strict';

	function rbush(maxEntries, format) {

	    // jshint newcap: false, validthis: true
	    if (!(this instanceof rbush)) return new rbush(maxEntries, format);

	    // max entries in a node is 9 by default; min node fill is 40% for best performance
	    this._maxEntries = Math.max(4, maxEntries || 9);
	    this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));

	    if (format) {
	        this._initFormat(format);
	    }

	    this.clear();
	}

	rbush.prototype = {

	    all: function () {
	        return this._all(this.data, []);
	    },

	    search: function (bbox) {

	        var node = this.data,
	            result = [],
	            toBBox = this.toBBox;

	        if (!intersects(bbox, node.bbox)) return result;

	        var nodesToSearch = [],
	            i, len, child, childBBox;

	        while (node) {
	            for (i = 0, len = node.children.length; i < len; i++) {

	                child = node.children[i];
	                childBBox = node.leaf ? toBBox(child) : child.bbox;

	                if (intersects(bbox, childBBox)) {
	                    if (node.leaf) result.push(child);
	                    else if (contains(bbox, childBBox)) this._all(child, result);
	                    else nodesToSearch.push(child);
	                }
	            }
	            node = nodesToSearch.pop();
	        }

	        return result;
	    },

	    collides: function (bbox) {

	        var node = this.data,
	            toBBox = this.toBBox;

	        if (!intersects(bbox, node.bbox)) return false;

	        var nodesToSearch = [],
	            i, len, child, childBBox;

	        while (node) {
	            for (i = 0, len = node.children.length; i < len; i++) {

	                child = node.children[i];
	                childBBox = node.leaf ? toBBox(child) : child.bbox;

	                if (intersects(bbox, childBBox)) {
	                    if (node.leaf || contains(bbox, childBBox)) return true;
	                    nodesToSearch.push(child);
	                }
	            }
	            node = nodesToSearch.pop();
	        }

	        return false;
	    },

	    load: function (data) {
	        if (!(data && data.length)) return this;

	        if (data.length < this._minEntries) {
	            for (var i = 0, len = data.length; i < len; i++) {
	                this.insert(data[i]);
	            }
	            return this;
	        }

	        // recursively build the tree with the given data from stratch using OMT algorithm
	        var node = this._build(data.slice(), 0, data.length - 1, 0);

	        if (!this.data.children.length) {
	            // save as is if tree is empty
	            this.data = node;

	        } else if (this.data.height === node.height) {
	            // split root if trees have the same height
	            this._splitRoot(this.data, node);

	        } else {
	            if (this.data.height < node.height) {
	                // swap trees if inserted one is bigger
	                var tmpNode = this.data;
	                this.data = node;
	                node = tmpNode;
	            }

	            // insert the small tree into the large tree at appropriate level
	            this._insert(node, this.data.height - node.height - 1, true);
	        }

	        return this;
	    },

	    insert: function (item) {
	        if (item) this._insert(item, this.data.height - 1);
	        return this;
	    },

	    clear: function () {
	        this.data = {
	            children: [],
	            height: 1,
	            bbox: empty(),
	            leaf: true
	        };
	        return this;
	    },

	    remove: function (item) {
	        if (!item) return this;

	        var node = this.data,
	            bbox = this.toBBox(item),
	            path = [],
	            indexes = [],
	            i, parent, index, goingUp;

	        // depth-first iterative tree traversal
	        while (node || path.length) {

	            if (!node) { // go up
	                node = path.pop();
	                parent = path[path.length - 1];
	                i = indexes.pop();
	                goingUp = true;
	            }

	            if (node.leaf) { // check current node
	                index = node.children.indexOf(item);

	                if (index !== -1) {
	                    // item found, remove the item and condense tree upwards
	                    node.children.splice(index, 1);
	                    path.push(node);
	                    this._condense(path);
	                    return this;
	                }
	            }

	            if (!goingUp && !node.leaf && contains(node.bbox, bbox)) { // go down
	                path.push(node);
	                indexes.push(i);
	                i = 0;
	                parent = node;
	                node = node.children[0];

	            } else if (parent) { // go right
	                i++;
	                node = parent.children[i];
	                goingUp = false;

	            } else node = null; // nothing found
	        }

	        return this;
	    },

	    toBBox: function (item) { return item; },

	    compareMinX: function (a, b) { return a[0] - b[0]; },
	    compareMinY: function (a, b) { return a[1] - b[1]; },

	    toJSON: function () { return this.data; },

	    fromJSON: function (data) {
	        this.data = data;
	        return this;
	    },

	    _all: function (node, result) {
	        var nodesToSearch = [];
	        while (node) {
	            if (node.leaf) result.push.apply(result, node.children);
	            else nodesToSearch.push.apply(nodesToSearch, node.children);

	            node = nodesToSearch.pop();
	        }
	        return result;
	    },

	    _build: function (items, left, right, height) {

	        var N = right - left + 1,
	            M = this._maxEntries,
	            node;

	        if (N <= M) {
	            // reached leaf level; return leaf
	            node = {
	                children: items.slice(left, right + 1),
	                height: 1,
	                bbox: null,
	                leaf: true
	            };
	            calcBBox(node, this.toBBox);
	            return node;
	        }

	        if (!height) {
	            // target height of the bulk-loaded tree
	            height = Math.ceil(Math.log(N) / Math.log(M));

	            // target number of root entries to maximize storage utilization
	            M = Math.ceil(N / Math.pow(M, height - 1));
	        }

	        node = {
	            children: [],
	            height: height,
	            bbox: null,
	            leaf: false
	        };

	        // split the items into M mostly square tiles

	        var N2 = Math.ceil(N / M),
	            N1 = N2 * Math.ceil(Math.sqrt(M)),
	            i, j, right2, right3;

	        multiSelect(items, left, right, N1, this.compareMinX);

	        for (i = left; i <= right; i += N1) {

	            right2 = Math.min(i + N1 - 1, right);

	            multiSelect(items, i, right2, N2, this.compareMinY);

	            for (j = i; j <= right2; j += N2) {

	                right3 = Math.min(j + N2 - 1, right2);

	                // pack each entry recursively
	                node.children.push(this._build(items, j, right3, height - 1));
	            }
	        }

	        calcBBox(node, this.toBBox);

	        return node;
	    },

	    _chooseSubtree: function (bbox, node, level, path) {

	        var i, len, child, targetNode, area, enlargement, minArea, minEnlargement;

	        while (true) {
	            path.push(node);

	            if (node.leaf || path.length - 1 === level) break;

	            minArea = minEnlargement = Infinity;

	            for (i = 0, len = node.children.length; i < len; i++) {
	                child = node.children[i];
	                area = bboxArea(child.bbox);
	                enlargement = enlargedArea(bbox, child.bbox) - area;

	                // choose entry with the least area enlargement
	                if (enlargement < minEnlargement) {
	                    minEnlargement = enlargement;
	                    minArea = area < minArea ? area : minArea;
	                    targetNode = child;

	                } else if (enlargement === minEnlargement) {
	                    // otherwise choose one with the smallest area
	                    if (area < minArea) {
	                        minArea = area;
	                        targetNode = child;
	                    }
	                }
	            }

	            node = targetNode;
	        }

	        return node;
	    },

	    _insert: function (item, level, isNode) {

	        var toBBox = this.toBBox,
	            bbox = isNode ? item.bbox : toBBox(item),
	            insertPath = [];

	        // find the best node for accommodating the item, saving all nodes along the path too
	        var node = this._chooseSubtree(bbox, this.data, level, insertPath);

	        // put the item into the node
	        node.children.push(item);
	        extend(node.bbox, bbox);

	        // split on node overflow; propagate upwards if necessary
	        while (level >= 0) {
	            if (insertPath[level].children.length > this._maxEntries) {
	                this._split(insertPath, level);
	                level--;
	            } else break;
	        }

	        // adjust bboxes along the insertion path
	        this._adjustParentBBoxes(bbox, insertPath, level);
	    },

	    // split overflowed node into two
	    _split: function (insertPath, level) {

	        var node = insertPath[level],
	            M = node.children.length,
	            m = this._minEntries;

	        this._chooseSplitAxis(node, m, M);

	        var splitIndex = this._chooseSplitIndex(node, m, M);

	        var newNode = {
	            children: node.children.splice(splitIndex, node.children.length - splitIndex),
	            height: node.height,
	            bbox: null,
	            leaf: false
	        };

	        if (node.leaf) newNode.leaf = true;

	        calcBBox(node, this.toBBox);
	        calcBBox(newNode, this.toBBox);

	        if (level) insertPath[level - 1].children.push(newNode);
	        else this._splitRoot(node, newNode);
	    },

	    _splitRoot: function (node, newNode) {
	        // split root node
	        this.data = {
	            children: [node, newNode],
	            height: node.height + 1,
	            bbox: null,
	            leaf: false
	        };
	        calcBBox(this.data, this.toBBox);
	    },

	    _chooseSplitIndex: function (node, m, M) {

	        var i, bbox1, bbox2, overlap, area, minOverlap, minArea, index;

	        minOverlap = minArea = Infinity;

	        for (i = m; i <= M - m; i++) {
	            bbox1 = distBBox(node, 0, i, this.toBBox);
	            bbox2 = distBBox(node, i, M, this.toBBox);

	            overlap = intersectionArea(bbox1, bbox2);
	            area = bboxArea(bbox1) + bboxArea(bbox2);

	            // choose distribution with minimum overlap
	            if (overlap < minOverlap) {
	                minOverlap = overlap;
	                index = i;

	                minArea = area < minArea ? area : minArea;

	            } else if (overlap === minOverlap) {
	                // otherwise choose distribution with minimum area
	                if (area < minArea) {
	                    minArea = area;
	                    index = i;
	                }
	            }
	        }

	        return index;
	    },

	    // sorts node children by the best axis for split
	    _chooseSplitAxis: function (node, m, M) {

	        var compareMinX = node.leaf ? this.compareMinX : compareNodeMinX,
	            compareMinY = node.leaf ? this.compareMinY : compareNodeMinY,
	            xMargin = this._allDistMargin(node, m, M, compareMinX),
	            yMargin = this._allDistMargin(node, m, M, compareMinY);

	        // if total distributions margin value is minimal for x, sort by minX,
	        // otherwise it's already sorted by minY
	        if (xMargin < yMargin) node.children.sort(compareMinX);
	    },

	    // total margin of all possible split distributions where each node is at least m full
	    _allDistMargin: function (node, m, M, compare) {

	        node.children.sort(compare);

	        var toBBox = this.toBBox,
	            leftBBox = distBBox(node, 0, m, toBBox),
	            rightBBox = distBBox(node, M - m, M, toBBox),
	            margin = bboxMargin(leftBBox) + bboxMargin(rightBBox),
	            i, child;

	        for (i = m; i < M - m; i++) {
	            child = node.children[i];
	            extend(leftBBox, node.leaf ? toBBox(child) : child.bbox);
	            margin += bboxMargin(leftBBox);
	        }

	        for (i = M - m - 1; i >= m; i--) {
	            child = node.children[i];
	            extend(rightBBox, node.leaf ? toBBox(child) : child.bbox);
	            margin += bboxMargin(rightBBox);
	        }

	        return margin;
	    },

	    _adjustParentBBoxes: function (bbox, path, level) {
	        // adjust bboxes along the given tree path
	        for (var i = level; i >= 0; i--) {
	            extend(path[i].bbox, bbox);
	        }
	    },

	    _condense: function (path) {
	        // go through the path, removing empty nodes and updating bboxes
	        for (var i = path.length - 1, siblings; i >= 0; i--) {
	            if (path[i].children.length === 0) {
	                if (i > 0) {
	                    siblings = path[i - 1].children;
	                    siblings.splice(siblings.indexOf(path[i]), 1);

	                } else this.clear();

	            } else calcBBox(path[i], this.toBBox);
	        }
	    },

	    _initFormat: function (format) {
	        // data format (minX, minY, maxX, maxY accessors)

	        // uses eval-type function compilation instead of just accepting a toBBox function
	        // because the algorithms are very sensitive to sorting functions performance,
	        // so they should be dead simple and without inner calls

	        // jshint evil: true

	        var compareArr = ['return a', ' - b', ';'];

	        this.compareMinX = new Function('a', 'b', compareArr.join(format[0]));
	        this.compareMinY = new Function('a', 'b', compareArr.join(format[1]));

	        this.toBBox = new Function('a', 'return [a' + format.join(', a') + '];');
	    }
	};


	// calculate node's bbox from bboxes of its children
	function calcBBox(node, toBBox) {
	    node.bbox = distBBox(node, 0, node.children.length, toBBox);
	}

	// min bounding rectangle of node children from k to p-1
	function distBBox(node, k, p, toBBox) {
	    var bbox = empty();

	    for (var i = k, child; i < p; i++) {
	        child = node.children[i];
	        extend(bbox, node.leaf ? toBBox(child) : child.bbox);
	    }

	    return bbox;
	}

	function empty() { return [Infinity, Infinity, -Infinity, -Infinity]; }

	function extend(a, b) {
	    a[0] = Math.min(a[0], b[0]);
	    a[1] = Math.min(a[1], b[1]);
	    a[2] = Math.max(a[2], b[2]);
	    a[3] = Math.max(a[3], b[3]);
	    return a;
	}

	function compareNodeMinX(a, b) { return a.bbox[0] - b.bbox[0]; }
	function compareNodeMinY(a, b) { return a.bbox[1] - b.bbox[1]; }

	function bboxArea(a)   { return (a[2] - a[0]) * (a[3] - a[1]); }
	function bboxMargin(a) { return (a[2] - a[0]) + (a[3] - a[1]); }

	function enlargedArea(a, b) {
	    return (Math.max(b[2], a[2]) - Math.min(b[0], a[0])) *
	           (Math.max(b[3], a[3]) - Math.min(b[1], a[1]));
	}

	function intersectionArea(a, b) {
	    var minX = Math.max(a[0], b[0]),
	        minY = Math.max(a[1], b[1]),
	        maxX = Math.min(a[2], b[2]),
	        maxY = Math.min(a[3], b[3]);

	    return Math.max(0, maxX - minX) *
	           Math.max(0, maxY - minY);
	}

	function contains(a, b) {
	    return a[0] <= b[0] &&
	           a[1] <= b[1] &&
	           b[2] <= a[2] &&
	           b[3] <= a[3];
	}

	function intersects(a, b) {
	    return b[0] <= a[2] &&
	           b[1] <= a[3] &&
	           b[2] >= a[0] &&
	           b[3] >= a[1];
	}

	// sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
	// combines selection algorithm with binary divide & conquer approach

	function multiSelect(arr, left, right, n, compare) {
	    var stack = [left, right],
	        mid;

	    while (stack.length) {
	        right = stack.pop();
	        left = stack.pop();

	        if (right - left <= n) continue;

	        mid = left + Math.ceil((right - left) / n / 2) * n;
	        select(arr, left, right, mid, compare);

	        stack.push(left, mid, mid, right);
	    }
	}

	// Floyd-Rivest selection algorithm:
	// sort an array between left and right (inclusive) so that the smallest k elements come first (unordered)
	function select(arr, left, right, k, compare) {
	    var n, i, z, s, sd, newLeft, newRight, t, j;

	    while (right > left) {
	        if (right - left > 600) {
	            n = right - left + 1;
	            i = k - left + 1;
	            z = Math.log(n);
	            s = 0.5 * Math.exp(2 * z / 3);
	            sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (i - n / 2 < 0 ? -1 : 1);
	            newLeft = Math.max(left, Math.floor(k - i * s / n + sd));
	            newRight = Math.min(right, Math.floor(k + (n - i) * s / n + sd));
	            select(arr, newLeft, newRight, k, compare);
	        }

	        t = arr[k];
	        i = left;
	        j = right;

	        swap(arr, left, k);
	        if (compare(arr[right], t) > 0) swap(arr, left, right);

	        while (i < j) {
	            swap(arr, i, j);
	            i++;
	            j--;
	            while (compare(arr[i], t) < 0) i++;
	            while (compare(arr[j], t) > 0) j--;
	        }

	        if (compare(arr[left], t) === 0) swap(arr, left, j);
	        else {
	            j++;
	            swap(arr, j, right);
	        }

	        if (j <= k) left = j + 1;
	        if (k <= j) right = j - 1;
	    }
	}

	function swap(arr, i, j) {
	    var tmp = arr[i];
	    arr[i] = arr[j];
	    arr[j] = tmp;
	}


	// export as AMD/CommonJS module or global variable
	if (true) !(__WEBPACK_AMD_DEFINE_RESULT__ = function () { return rbush; }.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	else if (typeof module !== 'undefined') module.exports = rbush;
	else if (typeof self !== 'undefined') self.rbush = rbush;
	else window.rbush = rbush;

	})();


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	var each = __webpack_require__(15).coordEach;

	/**
	 * Takes any {@link GeoJSON} object, calculates the extent of all input features, and returns a bounding box.
	 *
	 * @module turf/extent
	 * @category measurement
	 * @param {GeoJSON} input any valid GeoJSON Object
	 * @return {Array<number>} the bounding box of `input` given
	 * as an array in WSEN order (west, south, east, north)
	 * @example
	 * var input = {
	 *   "type": "FeatureCollection",
	 *   "features": [
	 *     {
	 *       "type": "Feature",
	 *       "properties": {},
	 *       "geometry": {
	 *         "type": "Point",
	 *         "coordinates": [114.175329, 22.2524]
	 *       }
	 *     }, {
	 *       "type": "Feature",
	 *       "properties": {},
	 *       "geometry": {
	 *         "type": "Point",
	 *         "coordinates": [114.170007, 22.267969]
	 *       }
	 *     }, {
	 *       "type": "Feature",
	 *       "properties": {},
	 *       "geometry": {
	 *         "type": "Point",
	 *         "coordinates": [114.200649, 22.274641]
	 *       }
	 *     }, {
	 *       "type": "Feature",
	 *       "properties": {},
	 *       "geometry": {
	 *         "type": "Point",
	 *         "coordinates": [114.186744, 22.265745]
	 *       }
	 *     }
	 *   ]
	 * };
	 *
	 * var bbox = turf.extent(input);
	 *
	 * var bboxPolygon = turf.bboxPolygon(bbox);
	 *
	 * var resultFeatures = input.features.concat(bboxPolygon);
	 * var result = {
	 *   "type": "FeatureCollection",
	 *   "features": resultFeatures
	 * };
	 *
	 * //=result
	 */
	module.exports = function(layer) {
	    var extent = [Infinity, Infinity, -Infinity, -Infinity];
	    each(layer, function(coord) {
	      if (extent[0] > coord[0]) extent[0] = coord[0];
	      if (extent[1] > coord[1]) extent[1] = coord[1];
	      if (extent[2] < coord[0]) extent[2] = coord[0];
	      if (extent[3] < coord[1]) extent[3] = coord[1];
	    });
	    return extent;
	};


/***/ },
/* 15 */
/***/ function(module, exports) {

	/**
	 * Lazily iterate over coordinates in any GeoJSON object, similar to
	 * Array.forEach.
	 *
	 * @param {Object} layer any GeoJSON object
	 * @param {Function} callback a method that takes (value)
	 * @param {boolean=} excludeWrapCoord whether or not to include
	 * the final coordinate of LinearRings that wraps the ring in its iteration.
	 * @example
	 * var point = { type: 'Point', coordinates: [0, 0] };
	 * coordEach(point, function(coords) {
	 *   // coords is equal to [0, 0]
	 * });
	 */
	function coordEach(layer, callback, excludeWrapCoord) {
	  var i, j, k, g, geometry, stopG, coords,
	    geometryMaybeCollection,
	    wrapShrink = 0,
	    isGeometryCollection,
	    isFeatureCollection = layer.type === 'FeatureCollection',
	    isFeature = layer.type === 'Feature',
	    stop = isFeatureCollection ? layer.features.length : 1;

	  // This logic may look a little weird. The reason why it is that way
	  // is because it's trying to be fast. GeoJSON supports multiple kinds
	  // of objects at its root: FeatureCollection, Features, Geometries.
	  // This function has the responsibility of handling all of them, and that
	  // means that some of the `for` loops you see below actually just don't apply
	  // to certain inputs. For instance, if you give this just a
	  // Point geometry, then both loops are short-circuited and all we do
	  // is gradually rename the input until it's called 'geometry'.
	  //
	  // This also aims to allocate as few resources as possible: just a
	  // few numbers and booleans, rather than any temporary arrays as would
	  // be required with the normalization approach.
	  for (i = 0; i < stop; i++) {

	    geometryMaybeCollection = (isFeatureCollection ? layer.features[i].geometry :
	        (isFeature ? layer.geometry : layer));
	    isGeometryCollection = geometryMaybeCollection.type === 'GeometryCollection';
	    stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

	    for (g = 0; g < stopG; g++) {

	      geometry = isGeometryCollection ?
	          geometryMaybeCollection.geometries[g] : geometryMaybeCollection;
	      coords = geometry.coordinates;

	      wrapShrink = (excludeWrapCoord &&
	        (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) ?
	        1 : 0;

	      if (geometry.type === 'Point') {
	        callback(coords);
	      } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
	        for (j = 0; j < coords.length; j++) callback(coords[j]);
	      } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
	        for (j = 0; j < coords.length; j++)
	          for (k = 0; k < coords[j].length - wrapShrink; k++)
	            callback(coords[j][k]);
	      } else if (geometry.type === 'MultiPolygon') {
	        for (j = 0; j < coords.length; j++)
	          for (k = 0; k < coords[j].length; k++)
	            for (l = 0; l < coords[j][k].length - wrapShrink; l++)
	              callback(coords[j][k][l]);
	      } else {
	        throw new Error('Unknown Geometry Type');
	      }
	    }
	  }
	}
	module.exports.coordEach = coordEach;

	/**
	 * Lazily reduce coordinates in any GeoJSON object into a single value,
	 * similar to how Array.reduce works. However, in this case we lazily run
	 * the reduction, so an array of all coordinates is unnecessary.
	 *
	 * @param {Object} layer any GeoJSON object
	 * @param {Function} callback a method that takes (memo, value) and returns
	 * a new memo
	 * @param {boolean=} excludeWrapCoord whether or not to include
	 * the final coordinate of LinearRings that wraps the ring in its iteration.
	 * @param {*} memo the starting value of memo: can be any type.
	 */
	function coordReduce(layer, callback, memo, excludeWrapCoord) {
	  coordEach(layer, function(coord) {
	    memo = callback(memo, coord);
	  }, excludeWrapCoord);
	  return memo;
	}
	module.exports.coordReduce = coordReduce;

	/**
	 * Lazily iterate over property objects in any GeoJSON object, similar to
	 * Array.forEach.
	 *
	 * @param {Object} layer any GeoJSON object
	 * @param {Function} callback a method that takes (value)
	 * @example
	 * var point = { type: 'Feature', geometry: null, properties: { foo: 1 } };
	 * propEach(point, function(props) {
	 *   // props is equal to { foo: 1}
	 * });
	 */
	function propEach(layer, callback) {
	  var i;
	  switch (layer.type) {
	      case 'FeatureCollection':
	        features = layer.features;
	        for (i = 0; i < layer.features.length; i++) {
	            callback(layer.features[i].properties);
	        }
	        break;
	      case 'Feature':
	        callback(layer.properties);
	        break;
	  }
	}
	module.exports.propEach = propEach;

	/**
	 * Lazily reduce properties in any GeoJSON object into a single value,
	 * similar to how Array.reduce works. However, in this case we lazily run
	 * the reduction, so an array of all properties is unnecessary.
	 *
	 * @param {Object} layer any GeoJSON object
	 * @param {Function} callback a method that takes (memo, coord) and returns
	 * a new memo
	 * @param {*} memo the starting value of memo: can be any type.
	 */
	function propReduce(layer, callback, memo) {
	  propEach(layer, function(prop) {
	    memo = callback(memo, prop);
	  });
	  return memo;
	}
	module.exports.propReduce = propReduce;


/***/ }
/******/ ])
});
;