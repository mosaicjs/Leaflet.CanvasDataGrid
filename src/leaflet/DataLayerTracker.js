var L = require('leaflet');

var ParentType;
if (L.Layer) {
    // v1.0.0-beta2
    ParentType = L.Marker.extend({
        _getPane : function() {
            return this._map.getPane(this.options.pane);
        },
    });
    ParentType.throttle = L.Util.throttle;
} else {
    // v0.7.7
    ParentType = L.Marker.extend({
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
        options = options || {
            clickable : false
        };
        ParentType.prototype.initialize.call(this, L.latLng(0, 0), options);
        this.options.icon = L.divIcon({
        });
        var timeout = 50;
        this._refreshData = ParentType.throttle(this._refreshData, timeout * 2,
                this);
        this._refreshIcon = ParentType.throttle(this._refreshIcon, timeout,
                this);
        this.setDataLayer(this.options.dataLayer);
    },

    setDataLayer : function(layer) {
        this._dataLayer = layer;
    },

    onAdd : function(map) {
        ParentType.prototype.onAdd.apply(this, arguments);
        this._initIcon();
        this._map.on('mousemove zoomend moveend', this._onMove, this);
        this._map.on('click', this._onMapClicked, this);
        this.on('popupopen', this._onPopupOpen, this);
        this.on('popupclose', this._onPopupClose, this);
    },

    onRemove : function(map) {
        this.off('popupclose', this._onPopupClose, this);
        this.off('popupopen', this._onPopupOpen, this);
        this._map.off('click', this._onMapClicked, this);
        this._map.off('mousemove zoomend moveend', this._onMove, this);
        this._removeIcon();
        ParentType.prototype.onRemove.apply(this, arguments);
    },

    // -----------------------------------------------------------------------

    _onPopupOpen : function(ev){
        this._frozen = true;
    },

    _onPopupClose : function(ev){
        this._frozen = false;
        this._moveTo(this._lastPos);
    },

    _onMapClicked : function(ev){
        this._moveTo(ev.latlng, true);
    },

    _onMove : function(ev) {
        this._moveTo(ev.latlng);
    },

    _moveTo : function(latlng, force) {
        this._lastPos = latlng || this._lastPos;
        if (this._frozen && !force) 
           return;
        if (latlng) {
            this.setLatLng(latlng);
        }
        this._refreshData();
        this._refreshIcon();
    },

    // -----------------------------------------------------------------------

    _refreshData : function() {
        if (!this._latlng)
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
        var data = this.getData();
        var element = this.getElement();
        element.innerHTML = '';
        var elm = L.DomUtil.create('div', '', element);
        elm.innerHTML = data.length + '';
        var style = this._getTooltipStyle(elm, data);
        L.Util.extend(elm.style, style);
    },

    _refreshIcon : function() {
        var elm = this.getElement();
        var style = this._getTrackerStyle(elm, this.getData());
        L.Util.extend(elm.style, style);
    },

    // -----------------------------------------------------------------------

    getElement : function() {
        return this._icon;
    },

    // -----------------------------------------------------------------------

    getData : function(){
        return this._data;
    },

    // -----------------------------------------------------------------------

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
              borderRadius : '0.5em',
              borderBottomLeftRadius : '0',
          };
        });
    },

    _getTrackerStyle : function(elm, data) {
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
                  || 3;
              border = borderWidth + 'px solid ' + color;
          }
          return {
              display : 'block',
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
          ParentType.prototype._initIcon.apply(this, arguments);
          var pane = this._getPane();
  			  pane.appendChild(this._icon);
  		  this._icon.style.display = 'none';
    },


});
module.exports = DataLayerTracker;
