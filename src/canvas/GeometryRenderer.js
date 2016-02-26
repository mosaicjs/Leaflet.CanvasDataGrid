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
        if (typeof styles !== 'function' && typeof styles.getStyle === 'function') {
            styles = styles.getStyle.bind(styles);
        }
        if (typeof styles !== 'function') {
            var s = styles;
            styles = function(){ return s; }
        }
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
                var lineStyle = styles(extend({},
                        options, {
                            resource : resource,
                            geometry : geometry,
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
                var polygonStyle = styles(extend({},
                        options, {
                            resource : resource,
                            geometry : geometry,
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
            var markerStyle = styles(extend({},
                    options, {
                        resource : resource,
                        geometry : geometry,
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
        return this.options.project(coordinates);
    },

    /** Returns the initial shift */
    getOrigin : function() {
        return this.options.origin || [ 0, 0 ];
    },

});

module.exports = GeometryRenderer;
