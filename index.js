var L = require('leaflet');
require('./src/leaflet/compatibility/Utils');

L.DataLayer = require('./src/leaflet/DataLayer');
L.DataLayer.DataLayerStyle = require('./src/leaflet/DataLayerStyle');
L.DataLayer.DataLayerTracker = require('./src/leaflet/DataLayerTracker');
L.DataLayer.FocusLayer = require('./src/leaflet/FocusLayer');

L.DataLayer.CanvasContext = require('./src/canvas/CanvasContext');
L.DataLayer.GeometryRenderer = require('./src/canvas/GeometryRenderer');
L.DataLayer.GeometryRendererStyle = require('./src/canvas/GeometryRendererStyle');

L.DataLayer.IDataProvider = require('./src/data/IDataProvider');
L.DataLayer.DataProvider = require('./src/data/DataProvider');

L.DataLayer.GeoJsonUtils = require('./src/data/GeoJsonUtils');
L.DataLayer.GridIndex = require('./src/data/GridIndex');
L.DataLayer.ImageGridIndex = require('./src/canvas/ImageGridIndex');
L.DataLayer.ImageUtils = require('./src/canvas/ImageUtils');
module.exports = L.DataLayer;
