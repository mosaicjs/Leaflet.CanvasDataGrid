var L = require('leaflet');

var GridLayer;
if (L.GridLayer) {
    // for v1.0.0-beta2
    GridLayer = L.GridLayer.extend({
        _loadTile : function(tile, tilePoint) {
            tile._layer = this;
            tile._tilePoint = tilePoint;
            this._drawTile(tile, tilePoint);
            return tile;
        },
        _tileCoordsToKey : function(coords) {
            return coords.x + ':' + coords.y + ':' + coords.z;
        },
    });
} else {
    // for v0.7.7
    GridLayer = L.TileLayer.extend({

        includes : L.Mixin.Events,

        _tileCoordsToBounds : function(coords) {
            var map = this._map;
            var tileSize = this.getTileSize();
            var nwPoint = L.point(coords.x * tileSize.x, // 
            coords.y * tileSize.y);
            var sePoint = L.point(nwPoint.x + tileSize.x, //
            nwPoint.y + tileSize.y);
            var nw = map.unproject(nwPoint, coords.z);
            var se = map.unproject(sePoint, coords.z);
            return new L.LatLngBounds(nw, se);
        },

        _tileCoordsToKey : function(coords) {
            return coords.x + ':' + coords.y;
        },

        getTileSize : function() {
            // for v0.7.7
            var s = this._getTileSize();
            return new L.Point(s, s);
        },

        _loadTile : function(tile, tilePoint) {
            tile._layer = this;
            tile._tilePoint = tilePoint;
            this._adjustTilePoint(tilePoint);
            this._drawTile(tile, tilePoint);
            this._tileOnLoad.call(tile);
            return tile;
        },

        _initContainer : function() {
            L.TileLayer.prototype._initContainer.apply(this, arguments);
            if (this.options.pane) {
                var tilePane = this._map._panes[this.options.pane];
                tilePane.appendChild(this._container);
            }
        }

    });
}
module.exports = GridLayer;