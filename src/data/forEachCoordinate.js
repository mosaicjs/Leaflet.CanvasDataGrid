module.exports = function forEach(geometry, callback) {
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
    } else {
        throw new Error('Unknown Geometry Type');
    }
}
