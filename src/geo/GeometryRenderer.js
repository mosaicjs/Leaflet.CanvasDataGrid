var Utils = require('../utils');

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
