var Utils = require('../utils');

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
