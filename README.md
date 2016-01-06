- name of the plugin
- a simple, concise description of what it does
- requirements
    - Leaflet version
    - other external dependencies (if any)
    - browser / device compatibility
- links to demos
- instructions for including the plugin
- simple usage code example
- API reference (methods, options, events)

## Data Layer

This Leaflet plugin allows to visualize data on maps using HTML Canvas tiles.
It is available under the MIT license. 

### Requirements

Leaflet v1.0.0-beta2

### Demo

### Installation

> npm install 

### Examples

### API references

* CanvasTools - a set of methods used to draw images, lines and polygons on canvas
  TODO: replace "clipLine", "clipLines", "clipPolygon" by "turf.intersect" 
  TODO: replace "simplify" method by "turf.simplify" 
    * CanvasContext - a generic class allowing to associate data with images
      and geometries drawn on canvas.
      TODO: data indexing code should be externalized to a GridIndex class
* DataLayer - a Leaflet layer visualizing data on canvas tiles.
  - use IDataProvider instances to load data associated with individual tiles
  - use DataRenderer to visualize loaded objects
* DataRenderer - visualize individual GeoJSON features on the canvas 
