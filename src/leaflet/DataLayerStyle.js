var GeometryRendererStyle = require('../canvas/GeometryRendererStyle');
var extend = require('../data/extend');

function DataLayerStyle(options) {
    this.initialize(options);
}
extend(DataLayerStyle.prototype, GeometryRendererStyle.prototype, {
    enableInteraction : function(zoom){
        return zoom > 9;
    }
});
module.exports = DataLayerStyle;