loadImages(
        {
            images : {
                "Peinture" : "./node_modules/open-iconic/svg/account-login.svg",
                "Objets d'art" : "./node_modules/open-iconic/svg/account-login.svg",
                "Sciences" : "./node_modules/open-iconic/svg/account-login.svg",
                "Archéologie" : "./node_modules/open-iconic/svg/account-login.svg",
                "Art contemporain" : "./node_modules/open-iconic/svg/account-login.svg",
                "Autre" : "./node_modules/open-iconic/svg/account-login.svg"
            },
            width : 32,
            height : 32,
        }, function(err, images) {
            main({
                container : document.getElementById('map'),
                resources : window.DATA,
                images : images
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
            svgToCanvas(svg, w, h, function(err, canvas) {
                counter++;
                result[key] = canvas;
                if (counter == keys.length) {
                    callback(null, result);
                }
            });
        })(keys[i], images[keys[i]]);
    }
}

function svgToCanvas(svg, width, height, callback) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvg(canvas, svg, {
        offsetX : 0,
        offsetY : 0,
        // scaleWidth : width,
        // scaleHeight : height,
        ignoreDimensions : true,
        renderCallback : function() {
            callback(null, canvas);
        }
    });
}

function main(options) {
    var mapContainer = options.container;
    var resources = options.resources;

    function getData(key) {
        var value = mapContainer.getAttribute('data-' + key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        } catch (err) {
            return value;
        }
    }

    // Create a map
    var map = L.map(mapContainer);

    // Add a background layer for the map.
    // We load the address for the map layer tiles from the map container
    // element ('data-tiles-url' attribute).
    var tilesUrl = getData('tiles-url');
    var maxZoom = getData('max-zoom');
    var attribution = getData('attribution');
    var tilesLayer = L.tileLayer(tilesUrl, {
        attribution : attribution,
        maxZoom : maxZoom
    });
    map.addLayer(tilesLayer);

    function getGeometry(r) {
        return r.x.geometry;
    }
    function getProperties(r) {
        return r.x.properties;
    }
    // Load data and transform them into markers with basic interactivity
    // DATA object is defined in the './data.js' script.
    var museumsLayer = newMuseumsLayer({
        images : options.images,
        defaultType : 'Autre',
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
        getProperties : getProperties
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
    var mapCenter = getData('center');
    var mapZoom = getData('zoom');
    var latlng = L.latLng(mapCenter[1], mapCenter[0]);
    map.setView(latlng, mapZoom);
}

function newMuseumsLayer(options) {

    function drawImage(image, color) {
        var canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        var lineWidth = 1;
        var context = canvas.getContext('2d');
        var centerX = canvas.width / 2;
        var centerY = canvas.height / 2;
        var radius = Math.round(Math.min(canvas.width / 2, canvas.height / 2))
                - lineWidth * 2;

        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        context.fillStyle = color;
        context.fill();
        context.lineWidth = lineWidth;
        context.strokeStyle = 'gray';
        context.stroke();

        context.fillStyle = 'gray';
        context.strokeStyle = 'gray';
        context
                .drawImage(image, 0, 0, image.width, image.height,
                        (canvas.width - image.width) / 2,
                        (canvas.height - image.height) / 2, canvas.width,
                        canvas.height);
        return canvas;
    }

    var cache = {};
    function getColoredImage(type, color) {
        var key = options.type + ':' + color;
        var result = cache[key];
        if (!result) {
            var images = options.images;
            var image = images[type] || images[options.defaultType];
            result = drawImage(image, color);
            cache[key] = result;
        }
        return result;
    }

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
        marker : function(resource, resourceOptions) {
            var properties = options.getProperties(resource);
            if (!properties)
                return;
            var type = properties.category;
            var color = 'yellow';
            var image = getColoredImage(type, color);
            return {
                image : image,
                anchor : [ image.width / 2, image.height ]
            };
        }
    });
    var provider = new L.DataLayer.DataProvider(options);
    var dataLayer = new L.DataLayer({
        style : style,
        provider : provider
    });
    dataLayer.on('mousemove', function(ev) {
        // console.log('mousemove', ev.data);
    })
    return dataLayer;
}
