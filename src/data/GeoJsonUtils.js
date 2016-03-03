/**
 * Calls the specified callback for each coordinate in the given geometry.
 */
module.exports.forEachCoordinate = function forEach(geometry, callback) {
    var j, k, l;
    var coords = geometry.coordinates;
    if (geometry.type === 'Point') {
        callback(coords);
    } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
        for (j = 0; j < coords.length; j++)
            callback(coords[j]);
    } else if (geometry.type === 'Polygon'
            || geometry.type === 'MultiLineString') {
        var wrapShrink = (geometry.type === 'Polygon') ? 1 : 0;
        for (j = 0; j < coords.length; j++)
            for (k = 0; k < coords[j].length - wrapShrink; k++)
                callback(coords[j][k]);
    } else if (geometry.type === 'MultiPolygon') {
        for (j = 0; j < coords.length; j++)
            for (k = 0; k < coords[j].length; k++)
                for (l = 0; l < coords[j][k].length - 1; l++)
                    callback(coords[j][k][l]);
    } else if (geometry.type === 'GeometryCollection') {
        var geoms = geometry.geometries;
        for (var i = 0, len = geoms.length; i < len; i++) {
            forEach(geoms[i], callback);
        }
    } else {
        throw new Error('Unknown Geometry Type');
    }
}

/**
 * Returns a bounding box for the specified geometry.
 */
module.exports.getBoundingBox = function(geometry) {
    var extent = [ [ Infinity, Infinity ], [ -Infinity, -Infinity ] ];
    this.forEachCoordinate(geometry, function(coord) {
        if (extent[0][0] > coord[0])
            extent[0][0] = coord[0];
        if (extent[0][1] > coord[1])
            extent[0][1] = coord[1];
        if (extent[1][0] < coord[0])
            extent[1][0] = coord[0];
        if (extent[1][1] < coord[1])
            extent[1][1] = coord[1];
    });
    return extent;
}

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
module.exports.forEachGeometry = function forEachGeometry(geometry, callback) {
    var coords = geometry.coordinates;
    switch (geometry.type) {
    case 'Point':
        coords = [ coords ];
    case 'MultiPoint':
        if (typeof callback.onPoints === 'function') {
            callback.onPoints(coords);
        }
        break;
    case 'LineString':
        coords = [ coords ];
    case 'MultiLineString':
        if (typeof callback.onLines === 'function') {
            callback.onLines(coords);
        }
        break;
    case 'Polygon':
        coords = [ coords ];
    case 'MultiPolygon':
        if (typeof callback.onPolygons === 'function') {
            callback.onPolygons(coords);
        }
        break;
    case 'GeometryCollection':
        var geoms = geometry.geometries;
        for (var i = 0, len = geoms.length; i < len; i++) {
            forEachGeometry(geoms[i], callback);
        }
        break;
    }
}
