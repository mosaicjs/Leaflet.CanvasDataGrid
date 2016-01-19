# Leaflet.CanvasDataGrid

CanvasDataGrid is a Leaflet plugin allowing to create one or several layers which render data on canvas tiles. It maintains an internal index on the data rendered by each canvas tile, based on [RBush](https://github.com/mourner/rbush).

## Demo

## Requirements
  * Leaflet v1.0.0-beta2
  * Development libraries needed (under Ubuntu): cairo, libpango1.0-dev, libjpeg-dev, libgif-dev

## Installation

> npm install

## Examples

## API

### DataLayer

DataLayer is a Leaflet layer that renders data on canvas tiles.
- Instances of `IDataProvider` are used to load data associated with individual tiles.
- `DataRenderer` is used to render the loaded objects.

### DataRenderer

`DataRenderer` renders individual GeoJSON features on a canvas.

### CanvasTools

`CanvasTools` consists of a set of methods used to draw images, lines and polygons on canvas.
- TODO: replace "clipLine", "clipLines", "clipPolygon" by "turf.intersect"
- TODO: replace "simplify" method by "turf.simplify"

### CanvasContext

`CanvasContext` is a generic class allowing to associate data with images and geometries drawn on canvas.

TODO: data indexing code should be externalized to a GridIndex class

## License
  Leaflet.CanvasDataGrid is licensed under the [MIT License](https://opensource.org/licenses/MIT).
