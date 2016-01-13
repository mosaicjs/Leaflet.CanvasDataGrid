var extend = require('./extend');
var GeometryUtils = require('./GeometryUtils');

/**
 * A common interface visualizing data on canvas.
 */
function GeometryRenderer() {
    this.initialize.apply(this, arguments);
}
extend(GeometryRenderer.prototype, {

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
     * @param styles
     *            style provider defining how features should be visualized
     */
    drawFeature : function(resource, styles, options) {
        var that = this;
        var geometry = this._getGeometry(resource, options);
        if (!geometry)
            return;
        drawGeometry(geometry);
        return;

        function drawMarker(point, index) {
            var markerStyle = styles.getMarkerStyle(resource, extend({},
                    options, {
                        index : index,
                        point : point,
                        data : resource
                    }));
            if (!markerStyle || !markerStyle.image)
                return;

            var pos = [ point[0], point[1] ]; // Copy
            if (markerStyle.anchor) {
                pos[0] -= markerStyle.anchor[0];
                pos[1] -= markerStyle.anchor[1];
            }
            that.context.drawImage(markerStyle.image, pos, extend({
                data : resource
            }, markerStyle));
        }
        function drawMarkers(points) {
            points = that._getBboxPoints(points);
            if (points.length) {
                points = that._getProjectedPoints(points);
                for (var i = 0; i < points.length; i++) {
                    var point = points[i];
                    drawMarker(point, i);
                }
            }
        }

        function drawLine(points, index) {
            var lineStyle = styles.getLineStyle(resource, extend({}, options, {
                points : points,
                index : index,
                data : resource
            }));
            if (lineStyle) {
                points = that._getBboxClippedLines(points);
                points = that._getProjectedPoints(points);
                that.context.drawLine(points, extend({
                    data : resource
                }, lineStyle));
            }
            // drawMarker([ 0, 0 ]);
        }
        //
        function drawPolygon(coords, index) {
            var polygonStyle = styles.getPolygonStyle(resource, extend({},
                    options, {
                        coords : coords,
                        index : index,
                        data : resource
                    }));
            if (polygonStyle) {
                var clipped = that._getBboxPolygon(coords[0]);
                var polygons = that._getProjectedPoints(clipped);
                var holes = [];
                for (var i = 1; i < coords.length; i++) {
                    // TODO: clip the hole by bounding box
                    var clippedHole = that._getBboxPolygon(coords[i]);
                    if (clippedHole.length) {
                        var hole = that._getProjectedPoints(clippedHole);
                        if (hole.length) {
                            holes.push(hole);
                        }
                    }
                }
                that.context.drawPolygon([ polygons ], holes, extend({
                    data : resource
                }, polygonStyle));
            }
            // drawMarker([ 0, 0 ]);
        }

        function drawGeometry(geometry) {
            var i, geom;
            var coords = geometry.coordinates;
            switch (geometry.type) {
            case 'Point':
                drawMarkers([ coords ]);
                break;
            case 'MultiPoint':
                drawMarkers(coords);
                break;
            case 'LineString':
                drawLine(coords);
                break;
            case 'MultiLineString':
                for (i = 0; i < coords.length; i++) {
                    drawLine(coords[i], i);
                }
                break;
            case 'Polygon':
                drawPolygon(coords);
                break;
            case 'MultiPolygon':
                for (i = 0; i < coords.length; i++) {
                    drawPolygon(coords[i], i);
                }
                break;
            case 'GeometryCollection':
                geoms = geometry.geometries;
                for (i = 0, len = geoms.length; i < len; i++) {
                    drawGeometry(geoms[i]);
                }
                break;
            }
        }
    },

    // ------------------------------------------------------------------

    _getBboxPoints : function(coords) {
        if (this.options.bbox) {
            // coords = GeometryUtils.clipPoints(coords, this.options.bbox);
        }
        return coords;
    },

    _getBboxClippedLines : function(coords) {
        var clipPolygon = this._getClipPolygon();
        if (clipPolygon.length) {
            // coords = GeometryUtils.clipLines(coords, clipPolygon);
        }
        return coords;
    },

    _getBboxPolygon : function(coords) {
        var clipPolygon = this._getClipPolygon();
        if (clipPolygon.length) {
            //            coords = GeometryUtils.clipPolygon(coords, clipPolygon);
        }
        return coords;
    },

    _getClipPolygon : function() {
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

    _getGeometry : function(resource) {
        if (typeof this.options.getGeometry === 'function') {
            return this.options.getGeometry(resource);
        }
        return resource.geometry;
    },

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
        // FIXME: projected points calculation do not work as expected
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
