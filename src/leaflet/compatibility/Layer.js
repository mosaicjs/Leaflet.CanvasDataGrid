var L = require('leaflet');

function newLayer(Parent) {
    var Type;
    if (L.Layer) {
        // v1.0.0-beta2
        Type = Parent.extend({
            _getPane : function() {
                return this._map.getPane(this.options.pane);
            },
        });
    } else {
        // v0.7.7
        Type = Parent.extend({
            includes : L.Mixin.Events,
            _getPane : function() {
                var panes = this._map.getPanes();
                return panes[this.options.pane];
            }
        });
        Type.prototype.initialize = Type.prototype.initialize || function(options) {
            L.Util.setOptions(this, options);
        }
        Type.prototype.onAdd = Type.prototype.onAdd || function(map) {
            this._map = map;
        }
        Type.prototype.onRemove = Type.prototype.onRemove || function() {
            delete this._map;
        }
    }
    return Type;
}

module.exports = newLayer;