var imageUrls = {
    "Peinture" : "./node_modules/open-iconic/svg/brush.svg",
    "Objets d'art" : "./node_modules/open-iconic/svg/brush.svg",
    "Sciences" : "./node_modules/open-iconic/svg/bolt.svg",
    "Archéologie" : "./node_modules/open-iconic/svg/heart.svg",
    "Art contemporain" : "./node_modules/open-iconic/svg/eye.svg",
    "Autre" : "./node_modules/open-iconic/svg/map-marker.svg"
};
var colors = {
    'bibliotheque' : 'red',
    'artmusee' : 'blue',
    'musee' : 'yellow'
};

loadImages({
    images : imageUrls,
    width : 32,
    height : 32,
}, function(err, images) {
    main({
        container : document.getElementById('map'),
        resources : window.DATA,
        images : images,
        colors : colors
    });
});

function loadImages(options, callback) {
    var result = {};
    var counter = 0;
    var images = options.images;
    var w = options.width;
    var h = options.height;
    var keys = Object.keys(images);
    for (var i = 0; i < keys.length; i++) {
        (function(key, svg) { // We need it!
            svgToCanvas(svg, function(err, canvas) {
                counter++;
                result[key] = {
                    svg : svg,
                    canvas : canvas
                };
                if (counter == keys.length) {
                    callback(null, result);
                }
            });
        })(keys[i], images[keys[i]]);
    }
}

function svgToCanvas(svg, callback) {
    var canvas = document.createElement('canvas');
    canvg(canvas, svg, {
        renderCallback : function() {
            callback(null, canvas);
        }
    });
}

function main(options) {
    var mapContainer = options.container;
    var resources = options.resources;

    function getTagAttr(key) {
        var value = mapContainer.getAttribute('data-' + key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        } catch (err) {
            return value;
        }
    }
    function getGeometry(r) {
        return r.x.geometry;
    }
    function getProperties(r) {
        return r.x.properties;
    }
    function getResourceType(r) {
        var properties = getProperties(r);
        return properties ? properties.category : null;
    }
    function getResourceCategory(r) {
        var properties = getProperties(r);
        if (!properties)
            return;
        var name = properties.name || '';
        name = name.toLowerCase();
        if (name.indexOf('biblio') >= 0) {
            return 'bibliotheque';
        } else if (name.indexOf('art') >= 0) {
            return 'artmusee';
        }
        return 'musee';
    }
    function getMarkerSize(zoom) {
        var baseZoom = 14;
        var baseWidth = 32;
        var baseHeight = 32;
        var minWidth = 8;
        var minHeight = 8;
        var k = Math.pow(2, zoom - baseZoom);
        return {
            x : Math.max(minWidth, Math.round(baseWidth * k)),
            y : Math.max(minHeight, Math.round(baseHeight * k))
        };
    }

    // Create a map
    var map = L.map(mapContainer);

    // Add a background layer for the map.
    // We load the address for the map layer tiles from the map container
    // element ('data-tiles-url' attribute).
    var tilesUrl = getTagAttr('tiles-url');
    var maxZoom = getTagAttr('max-zoom');
    var attribution = getTagAttr('attribution');
    var tilesLayer = L.tileLayer(tilesUrl, {
        attribution : attribution,
        maxZoom : maxZoom
    });
    map.addLayer(tilesLayer);

    // Load data and transform them into markers with basic interactivity
    // DATA object is defined in the './data.js' script.
    var museumsLayer = newMuseumsLayer({
        images : options.images,
        colors : options.colors,
        defaultType : 'Autre',
        defaultCategory : 'musee',
        data : {
            forEach : function(callback) {
                for (var i = 0; i < resources.features.length; i++) {
                    callback({
                        x : resources.features[i]
                    }, i);
                }
            }
        },
        getGeometry : getGeometry,
        getProperties : getProperties,
        getResourceType : getResourceType,
        getResourceCategory : getResourceCategory,
        getMarkerSize : getMarkerSize
    });

    // Bind an event listener for this layer
    museumsLayer.on('click', function(ev) {
        var counter = 0;
        function renderMuseum(open, data) {
            var props = getProperties(data);
            var script = '';
            var content = '' + //
            '<div>' + //
            '<h3>' + props.name + '</h3>' + //
            '<div><em>' + props.category + '</em></div>' + //
            '<p>' + props.description + '</p>' + //
            '</div>';
            return content;
        }

        var latlng;
        var geom = getGeometry(ev.data);
        if (geom.type === 'Point') {
            var coords = geom.coordinates;
            latlng = L.latLng(coords[1], coords[0]);
        } else {
            latlng = ev.latlng;
        }

        var open = ev.array.length > 1;
        var contentArray = ev.array.map(renderMuseum.bind(null, open));
        var content;
        if (contentArray.length > 1) {
            content = '<ol><li>' + contentArray.join('</li>\n<li>')
                    + '</li></ol>';
        } else {
            content = contentArray.join('');
        }
        var offset = [ 8, -15 ]; // dataRenderer.getPopupOffset();
        var popup = L.popup({
            offset : offset,
            maxHeight : 250
        });
        popup.setLatLng(latlng);
        popup.setContent(content);
        popup.openOn(map);
    });
    map.addLayer(museumsLayer);

    // Visualize the map.
    // We get the map center and zoom from the container element.
    // ('data-center' and 'map-zoom' element attributes)
    var mapCenter = getTagAttr('center');
    var mapZoom = getTagAttr('zoom');
    var latlng = L.latLng(mapCenter[1], mapCenter[0]);
    map.setView(latlng, mapZoom);
}

function newMuseumsLayer(options) {
    // Update images
    // Update marker size following the zoom (image key: "zoom:type:category")
    // 

    function drawMarker(image, color, zoom) {
        var canvas = document.createElement('canvas');
        var imageSize = options.getMarkerSize(zoom);
        var diameter = Math.min(imageSize.x, imageSize.y);
        canvas.width = diameter;
        canvas.height = diameter;
        var lineWidth = diameter / 10;
        var context = canvas.getContext('2d');
        var centerX = canvas.width / 2;
        var centerY = canvas.height / 2;
        var radius = diameter / 2 - lineWidth;

        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        context.fillStyle = color;
        context.fill();
        context.lineWidth = lineWidth;
        context.strokeStyle = 'gray';
        context.stroke();

        // var iconWidth = canvas.width;
        // var iconHeight = canvas.height;
        var iconWidth = image.width;
        var iconHeight = image.height;
        context.drawImage(image, 0, 0, image.width, image.height, //
        (canvas.width - iconWidth) / 2, (canvas.height - iconHeight) / 2,
                iconWidth, iconHeight);
        return canvas;
    }

    var cache = {};
    function getColoredMarker(category, type, zoom) {
        var key = [ zoom, category, type ].join(':');
        var result = cache[key];
        if (!result) {
            var images = options.images;
            var image = images[type] || images[options.defaultType];

            var colors = options.colors;
            var color = colors[category] || colors[options.defaultCategory];
            result = drawMarker(image.canvas, color, zoom);
            cache[key] = result;
        }
        return result;
    }

    var dataLayer;
    var style = new L.DataLayer.GeometryRendererStyle({
        lineColor : 'red',
        line : {
            lineOpacity : 0.9,
            lineWidth : 3
        },
        polygon : {
            fillOpacity : 0.5,
            fillColor : 'blue',
            lineOpacity : 0.9,
            lineColor : 'red',
            lineWidth : 3
        },
        marker : function(resource, params) {
            var type = options.getResourceType(resource);
            var category = options.getResourceCategory(resource);
            if (!type || !category)
                return;
            var zoom = params.tilePoint.z;
            var image = getColoredMarker(category, type, zoom);
            return {
                image : image,
                anchor : [ image.width / 2, image.height ]
            };
        }
    });
    var provider = new L.DataLayer.DataProvider(options);
    var imageIndex = {};
    dataLayer = new L.DataLayer({
        style : style,
        provider : provider,
        imageIndex : function(image, params) {
            // var properties = options.getProperties(params.data);
            return imageIndex;
        },
        tilePad : function(params) {
            var markerSize = options.getMarkerSize(params.tilePoint.z);
            var tileSize = 256;
            var deltaX = markerSize.x ? tileSize / markerSize.x : 1;
            var deltaY = markerSize.y ? tileSize / markerSize.y : 1;
            return [ deltaX, deltaY, deltaX, deltaY ];
        }
    });
    dataLayer.on('mousemove', function(ev) {
        // console.log('mousemove', ev.data);
    })
    return dataLayer;
}
