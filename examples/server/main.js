/** Demo by Ubimix (http://www.ubimix.com). */
main('map');

// var data = window.data;

function main(id) {
    var mapContainer = document.getElementById(id);
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

    // Load data and transform them into markers with basic interactivity
    // DATA object is defined in the './data.js' script.
    var museumsLayer = newMuseumsLayer(DATA.features);

    // Bind an event listener for this layer
    museumsLayer.on('click', function(ev) {
        var counter = 0;
        function renderMuseum(open, data) {
            var props = data.properties;
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
        if (ev.data.geometry.type === 'Point') {
            var coords = ev.data.geometry.coordinates;
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

function newMuseumsLayer(data) {

    var image = document.querySelector('img.icon');
    image.parentNode.removeChild(image);
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
        marker : function(resource, options) {
            return {
                image : image,
                anchor : [ image.width / 2, image.height ]
            };
        }
    });
    var provider = new L.DataLayer.DataProvider({
        data : data
    });
    var dataLayer = new L.DataLayer({
        style : style,
        provider : provider
    });
    dataLayer.on('mousemove', function(ev) {
        console.log('mousemove', ev.data);
    })
    return dataLayer;
}
