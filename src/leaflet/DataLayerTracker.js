var L = require('leaflet');

var ParentType;
if (L.Layer) {
    // v1.0.0-beta2
    ParentType = L.Layer.extend({
        _getPane : function() {
            return this._map.getPane(this.options.pane);
        },
    });
    ParentType.throttle = L.Util.throttle;
} else {
    // v0.7.7
    ParentType = L.Class.extend({
        includes : L.Mixin.Events,
        _getPane : function() {
            var panes = this._map.getPanes();
            return panes[this.options.pane];
        }
    });
    ParentType.throttle = function(f, time, context) {
        var timeoutId, that, args;
        return function() {
            that = context || this;
            args = [];
            for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            if (timeoutId === undefined) {
                timeoutId = setTimeout(function() {
                    timeoutId = undefined;
                    return f.apply(that, args);
                }, time);
            }
        };
    }
}
var DataLayerTracker = ParentType.extend({
    options : {
        pane : 'markerPane',
    // interactive: false,
    // riseOnHover: true,
    // riseOffset: 250
    },

    initialize : function(options) {
        L.setOptions(this, options);
        var timeout = 50;
        this._refreshData = ParentType.throttle(this._refreshData, timeout,
                this);
        this.setDataLayer(this.options.dataLayer);
    },

    setDataLayer : function(layer) {
        this._dataLayer = layer;
    },

    onAdd : function(map) {
        this._map = map;
        this._initIcon();
        this._map.on('mousemove zoomend mouvend', this._onMove, this);
        this._dataLayer.on('mouseenter', this._onMouseEnter, this);
        this._dataLayer.on('mouseleave', this._onMouseLeave, this);
    },

    onRemove : function(map) {
        this._map.off('mousemove zoomend mouvend', this._onMove, this);
        this._dataLayer.off('mouseenter', this._onMouseEnter, this);
        this._dataLayer.off('mouseleave', this._onMouseLeave, this);
        this._removeIcon();
        delete this._map;
    },

    // -----------------------------------------------------------------------

    _onMove : function(ev) {
        if (ev.latlng) {
            this._setLatLng(ev.latlng);
        }
        this._refreshData();
        this._refreshIcon();
    },

    _onMouseEnter : function(ev) {
        this._show = true;
        this._element.style.display = 'block';
    },

    _onMouseLeave : function(ev) {
        this._show = false;
        this._element.style.display = 'none';
    },

    // -----------------------------------------------------------------------

    _refreshData : function() {
        if (!this._show || !this._latlng)
            return;
        var radius = this._getRadius();
        var that = this;
        this._dataLayer.loadDataAround(this._latlng, [ radius, radius ], //
        function(err, data) {
            that._data = data;
            that._renderData();
        });
    },

    _renderData : function() {
        var data = this._data;
        this._element.innerHTML = '';
        var elm = L.DomUtil.create('div', '', this._element);
        elm.innerHTML = data.length + '';
        var style = this._getTooltipStyle(elm, data);
        L.Util.extend(elm.style, style);
    },

    _refreshIcon : function() {
        var elm = this._element;
        if (!this._show) {
            return;
        }
        var style = this._getBorderStyle(elm);
        L.Util.extend(elm.style, style);
    },

    // -----------------------------------------------------------------------

    getLatLng : function() {
        return this._latlng;
    },

    _setLatLng : function(latlng) {
        if (!latlng)
            return;
        var oldLatLng = this._latlng;
        this._latlng = L.latLng(latlng);

        if (this._element && this._map) {
            var pos = this._map.latLngToLayerPoint(this._latlng).round();
            L.DomUtil.setPosition(this._element, pos);
        }

        return this.fire('move', {
            oldLatLng : oldLatLng,
            latlng : this._latlng,
            target : this
        });
    },

    getElement : function() {
        return this._element;
    },

    _getRadius : function() {
        if (!this._r) {
            var r = (typeof this.options.radius === 'function') //
            ? this.options.radius //
            : function(zoom) {
                return this.options.radius || 40;
            };
            this._r = r.bind(this);
        }
        var zoom = this._map.getZoom();
        return this._r(zoom);
    },

    _getTooltipStyle : function(elm, data) {
        return this._getStyle('tooltipStyle', elm, data, function(){
          if (!data.length)
             return { display : 'none' };
          var r = this._getRadius();
          var max = 15;
          var shift = (r > max) ? '-1em' : '-2em';
          var color = this.options.tooltipColor || this.options.color || 'gray';
          var textColor = this.options.tooltipTextColor || this.options.color || 'black';
          var bgColor = this.options.tooltipBgColor || 'white';
          return {
              display : 'block',
              position : 'absolute',
              backgroundColor : bgColor,
              top : shift,
              left : '100%',
              padding : '0.1em 0.5em',
              border : '1px solid ' + color,
              color : textColor,
              borderRadius : '0.8em',
              borderBottomLeftRadius : '0',
          };
        });
    },

    _getBorderStyle : function(elm, data) {
        return this._getStyle('trackerStyle', elm, data, function(){
          var r = this._getRadius();
          var d = r * 2;
          var border = this.options.trackerBorder || this.options.border;
          if (!border) {
              var color = this.options.trackerColor
                  || this.options.color
                  || 'rgba(255, 255, 255, .5)';
              var borderWidth = this.options.trackerWidth
                  || this.options.width
                  || 1;
              border = borderWidth + 'px solid ' + color;
          } 
          return {
              border : border,
              borderRadius : d + 'px',
              height : d + 'px',
              width : d + 'px',
              background : 'none',
              marginLeft : -r + 'px',
              marginTop : -r + 'px',
          };
        });
    },

    _getStyle : function(key, elm, data, f){
        var val = this.options[key] || f;
        if (typeof val === 'function') {
            val = val.call(this, elm, data);
        }
        return val;
    },

    _initIcon : function() {
        if (!this._element) {
            var className = '';
            var container = this._getPane();
            this._element = L.DomUtil.create('div', className, container);
        }
        this._element.style.display = 'none';
        return this._element;
    },

    _removeIcon : function() {
        if (this._element) {
            L.DomUtil.remove(this._element);
            delete this._element;
        }
    },

});
module.exports = DataLayerTracker;
