import {MetricsPanelCtrl} from 'app/plugins/sdk';
import _ from 'lodash';
import kbn from 'app/core/utils/kbn';
import TimeSeries from 'app/core/time_series';
// import rendering from './rendering';
import legend from './legend';
import 'https://scadavis.io/synoptic/synopticapi.js';

export class SCADAvisCtrl extends MetricsPanelCtrl {

  constructor($scope, $injector, $rootScope) {
    super($scope, $injector);
    this.$rootScope = $rootScope;
    this.hiddenSeries = {};

    var panelDefaults = {
      svgurl: 'https://raw.githubusercontent.com/riclolsen/displayfiles/master/helloworld.svg',
      showZoomPan: false,
      autoResize: false,
      zoomLevel: 1.0,
      lastZoomLevel: -1,
      legend: {
        show: true, // disable/enable legend
        values: true
      },
      links: [],
      prevDataLength: 0,
      datasource: null,
      maxDataPoints: 3,
      interval: null,
      targets: [{}],
      cacheTimeout: null,
      nullPointMode: 'connected',
      legendType: 'Under graph',
      breakPoint: '50%',
      aliasColors: {},
      format: 'short',
      valueName: 'current',
      strokeWidth: 1,
      fontSize: '80%'
    };

    _.defaults(this.panel, panelDefaults);
    _.defaults(this.panel.legend, panelDefaults.legend);

    this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));

    this.setLegendWidthForLegacyBrowser();
  }

  onInitEditMode() {
    this.addEditorTab('Options', 'public/plugins/scadavis-synoptic-panel/editor.html', 2);
    this.unitFormats = kbn.getUnitFormats();
  }

  setUnitFormat(subItem) {
    this.panel.format = subItem.value;
    this.render();
  }

  onDataError() {
    this.series = [];
    this.render();
  }

  changeSeriesColor(series, color) {
    series.color = color;
    this.panel.aliasColors[series.alias] = series.color;
    this.render();
  }

  onRender() {
    this.data = this.parseSeries(this.series);
    var svelem = this.$panelContainer[0].querySelector('.scadavis-panel__chart');
    if (svelem && typeof svelem.svgraph !== "undefined" && this.panel.autoResize) {
      svelem.svgraph.zoomToOriginal();
      svelem.svgraph.zoomTo(this.panel.zoomLevel * ((svelem.clientWidth < svelem.clientHeight)?svelem.clientWidth/250 : svelem.clientHeight/250) );
      }     
  }

  parseSeries(series) {
    return _.map(this.series, (serie, i) => {
      return {
        label: serie.alias,
        data: serie.stats[this.panel.valueName],
        color: this.panel.aliasColors[serie.alias] || this.$rootScope.colors[i],
        legendData: serie.stats[this.panel.valueName],
      };
    });
  }

  onLoadSVGFromFile(){
    var _this = this;
    var fileInput = document.getElementById("fileInput");    
    if (fileInput){
       fileInput.addEventListener('change', function (e) {
         var file = fileInput["files"][0];
         if (file.type == "image/svg+xml") {
           var reader = new FileReader();
           reader.onload = function (e) {
              _this.panel.svgurl = reader.result;
              var svelem = _this.$panelContainer[0].querySelector('.scadavis-panel__chart');
              svelem.svgraph.loadURL(_this.panel.svgurl);
              _this.panel.lastZoomLevel = -1;
           }
         }
      reader.readAsDataURL(file);
      })
    }
    fileInput.click();
  }

  onDataReceived(dataList) {
    this.series = dataList.map(this.seriesHandler.bind(this));
    this.data = this.parseSeries(this.series);
    this.render(this.data);
	
    var svgurl = this.panel.svgurl
    try {
      svgurl = this.templateSrv.replace(this.panel.svgurl, this.panel.scopedVars, 'html');
      }
    catch (e) {
      console.log('panel error: ', e);
      }
		
    if ( typeof this.$panelContainer != 'undefined' ) {
      var svelem = this.$panelContainer[0].querySelector('.scadavis-panel__chart');

      if (svelem && typeof svelem.svgraph === "undefined") {      
        svelem.svgraph = new scadavis({ svgurl: svgurl, 
                                        container: svelem, 
                                        iframeparams: 'frameborder="0" width="100%" height="100%" style="overflow:hidden;height:100%;width:100%;" '
                                      });
        svelem.svgraph.enableMouse(false, false);
        svelem.svgraph.zoomTo(this.panel.zoomLevel);
        svelem.svgraph.hideWatermark();
        this.panel.lastZoomLevel = -1;
        }

      if (svelem && typeof svelem.svgraph !== "undefined") {
        if ( this.panel.lastZoomLevel != this.panel.zoomLevel ) {  
          svelem.svgraph.zoomToOriginal();
          if (this.panel.autoResize)
            svelem.svgraph.zoomTo(this.panel.zoomLevel * ( (svelem.clientWidth < svelem.clientHeight)?svelem.clientWidth/250: svelem.clientHeight/250) );
          else
            svelem.svgraph.zoomTo(this.panel.zoomLevel);
          this.panel.lastZoomLevel = this.panel.zoomLevel;          
          }
		
        if ( svelem.svgraph.svgurl != svgurl ) {
           svelem.svgraph.loadURL(svgurl);
           this.panel.lastZoomLevel = -1;
           }        
        svelem.svgraph.enableTools(this.panel.showZoomPan, this.panel.showZoomPan);
        if ( typeof  this.panel.prevDataLength == "number" )
          if ( this.data.length < this.panel.prevDataLength ) {
             svelem.svgraph.resetData();
             svelem.svgraph.updateValues();
          }
        this.panel.prevDataLength = this.data.length;
        for (var i=0; i<this.data.length; i++) {
          svelem.svgraph.storeValue(this.data[i].label, this.data[i].data, 0, 0, this.data[i].label); 
          svelem.svgraph.storeValue("@"+(i+1), this.data[i].data, 0, 0, this.data[i].label);
          }
        svelem.svgraph.updateValues();
      }
    }
  }

  seriesHandler(seriesData) {
    var series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target
    });

    series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
    return series;
  }

  getDecimalsForValue(value) {
    if (_.isNumber(this.panel.decimals)) {
      return { decimals: this.panel.decimals, scaledDecimals: null };
    }

    var delta = value / 2;
    var dec = -Math.floor(Math.log(delta) / Math.LN10);

    var magn = Math.pow(10, -dec);
    var norm = delta / magn; // norm is between 1.0 and 10.0
    var size;

    if (norm < 1.5) {
      size = 1;
    } else if (norm < 3) {
      size = 2;
      // special case for 2.5, requires an extra decimal
      if (norm > 2.25) {
        size = 2.5;
        ++dec;
      }
    } else if (norm < 7.5) {
      size = 5;
    } else {
      size = 10;
    }

    size *= magn;

    // reduce starting decimals if not needed
    if (Math.floor(value) === value) { dec = 0; }

    var result = {};
    result.decimals = Math.max(0, dec);
    result.scaledDecimals = result.decimals - Math.floor(Math.log(size) / Math.LN10) + 2;

    return result;
  }

  formatValue(value) {
    var decimalInfo = this.getDecimalsForValue(value);
    var formatFunc = kbn.valueFormats[this.panel.format];
    if (formatFunc) {
      return formatFunc(value, decimalInfo.decimals, decimalInfo.scaledDecimals);
    }
    return value;
  }

  link(scope, elem, attrs, ctrl) {
    this.$panelContainer = elem.find('.panel-container');
    // rendering(scope, elem, attrs, ctrl);
  }

  toggleSeries(serie) {
    if (this.hiddenSeries[serie.label]) {
      delete this.hiddenSeries[serie.label];
    } else {
      this.hiddenSeries[serie.label] = true;
    }
    this.render();
  }

  onLegendTypeChanged() {
    this.setLegendWidthForLegacyBrowser();
    this.render();
  }

  setLegendWidthForLegacyBrowser() {
    var isIE11 = !!window.MSInputMethodContext && !!document.documentMode;
    if (isIE11 && this.panel.legendType === 'Right side' && !this.panel.legend.sideWidth) {
      this.panel.legend.sideWidth = 150;
    }
  }
}

SCADAvisCtrl.templateUrl = 'module.html';
