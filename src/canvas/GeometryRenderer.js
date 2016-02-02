var extend = require('../data/extend');
var GeometryUtils = require('../data/GeometryUtils');
var GeoJsonUtils = require('../data/GeoJsonUtils');

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
        return GeoJsonUtils.forEachGeometry(geometry, {
            onPoints : function(points) {
                points = that._prepareMarkerCoordinates(points);
                if (points.length) {
                    for (var i = 0; i < points.length; i++) {
                        var point = points[i];
                        _drawMarker(point, i);
                    }
                }
            },
            onLines : function(lines) {
                var lineStyle = styles.getLineStyle(resource, extend({},
                        options, {
                            coords : lines,
                            data : resource
                        }));
                if (!lineStyle)
                    return;
                var segments = [];
                for (var i = 0; i < lines.length; i++) {
                    var segment = that._prepareLineCoordinates(lines[i]);
                    segments.push(segment);
                }
                that.context.drawLines(segments, extend({
                    data : resource
                }, lineStyle));
                // _drawMarker([ 0, 0 ]);
            },
            onPolygons : function(polygons) {
                for (var i = 0; i < polygons.length; i++) {
                    this._onPolygon(polygons[i]);
                }
            },
            _onPolygon : function(polygon) {
                var polygonStyle = styles.getPolygonStyle(resource, extend({},
                        options, {
                            coords : polygon,
                            data : resource
                        }));
                if (!polygonStyle)
                    return;
                var coords = [];
                for (var i = 0; i < polygon.length; i++) {
                    var ring = that._preparePolygonCoordinates(polygon[i]);
                    if (ring.length) {
                        coords.push(ring);
                    }
                }
                that.context.drawPolygon(coords, extend({
                    data : resource
                }, polygonStyle));
                // _drawMarker([ 0, 0 ]);
            }
        });

        function _drawMarker(point) {
            var markerStyle = styles.getMarkerStyle(resource, extend({},
                    options, {
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

    },

    // ------------------------------------------------------------------

    _prepareLineCoordinates : function(coords) {
        var clipPolygon = this._getClipPolygon();
        if (clipPolygon.length) {
            var bbox = [ clipPolygon[0], clipPolygon[2] ];
            coords = GeometryUtils.clipLines(coords, bbox);
        }
        coords = this._getProjectedPoints(coords);
        return coords;
    },

    _prepareMarkerCoordinates : function(coords) {
        var clipPolygon = this._getClipPolygon();
        if (clipPolygon.length) {
            var bbox = [ clipPolygon[0], clipPolygon[2] ];
            coords = GeometryUtils.clipPoints(coords, bbox);
        }
        coords = this._getProjectedPoints(coords);
        return coords;
    },

    _preparePolygonCoordinates : function(coords) {
        var clipPolygon = this._getClipPolygon();
        if (clipPolygon.length) {
            var newCoords = GeometryUtils.clipPolygon(coords, clipPolygon);
            coords = newCoords;
        }
        coords = this._getProjectedPoints(coords);
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
        // if (typeof this.options.project === 'function') {
        this._getProjectedPoints = function(coordinates) {
            return this.options.project(coordinates);
        }
        return this._getProjectedPoints(coordinates);
        // }
        // // FIXME: projected points calculation do not work as
        // expected
        // var t = this.getTransformation();
        // var s = this.getScale();
        // var origin = this.getOrigin();
        // var o = t.direct(origin[0], origin[1], s);
        // var result = [];
        // for (var i = 0; i < coordinates.length; i++) {
        // var p = coordinates[i];
        // var point = t.direct(p[0], p[1], s);
        // point[0] = Math.round(point[0] - o[0]);
        // point[1] = Math.round(point[1] - o[1]);
        // result.push(point);
        // }
        // return result;
    },

    // getTransformation : function() {
    // if (!this._transformation) {
    // this._transformation = this.options.transformation
    // || transform(1 / 180, 0, -1 / 90, 0);
    // function transform(a, b, c, d) {
    // return {
    // direct : function(x, y, scale) {
    // return [ scale * (x * a + b), scale * (y * c + d) ];
    // },
    // inverse : function(x, y, scale) {
    // return [ (x / scale - b) / a, (y / scale - d) / c ];
    // }
    // };
    // }
    // }
    // return this._transformation;
    // },
    //
    // /** Returns the current scale */
    // getScale : function() {
    // return this.options.scale || 1;
    // },

    /** Returns the initial shift */
    getOrigin : function() {
        return this.options.origin || [ 0, 0 ];
    },

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
