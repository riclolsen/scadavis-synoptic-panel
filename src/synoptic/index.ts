/*
 *
 * SCADAvis.io Synoptic API © 2018-2023 Ricardo L. Olsen / DSC Systems ALL RIGHTS RESERVED.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

export type SvArgs = {
  container: HTMLDivElement | string;
  apikey: string;
  iframeparams: string | null;
  svgurl: string | null;
  colorsTable: Record<number, string>;
};

export class ScadaVis {
  version = '2.0.7t';
  iframe: HTMLIFrameElement | null = null;
  componentloaded = false;
  readyfordata = false;
  domain = '*';
  rtdata: any = { data: { type: 'tags', tags: [] } };
  npts: any = {};
  vals: any = {};
  qualifs: any = {};
  descriptions: any = {};
  npt = 0;
  svgobj: any = null;
  zoomobj: any = null;
  moveobj: any = null;
  enabletoolsobj: any = null;
  enablekeyboardobj: any = null;
  enableflashobj: any = null;
  hidewatermarkobj: any = null;
  setcolorobj: any = [];
  setcolorsobj: any = null;
  resetobj: any = null;
  tagsList = '';
  onready: any = null;
  onerror: any = null;
  onclick: any = null;
  loadingSVG = 0;
  updateHandle = 0;
  resolveFunction: any = null;
  rejectFunction: any = null;
  container: HTMLDivElement | string | Object | any = null;
  apikey: any = null;
  iframeparams: any = null;
  svgurl: any = null;
  colorsTable: any = null;
  enablemouseobj: any = null;
  mousewheelobj: any = null;
  loaded: any = null;
  aux = false;
  panelContainerResizeObserver: any;

  /**
   * Generate an unique DOM element ID.
   * @private
   * @method guidGenerator
   * @memberof scadavis
   * @returns {string} DOM ID.
   */
  guidGenerator (): string {
    const S4 = function () {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4();
  }

  /**
   * Create a DOM element from HTML.
   * @private
   * @method createElementFromHTML
   * @memberof scadavis
   * @returns {string} DOM ID.
   */
  createElementFromHTML (htmlString: string): ChildNode | null {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
  }

  /**
   * Load the SVG synoptic display file from a SVG URL.
   * @method loadURL
   * @memberof scadavis
   * @param {string} svgurl - The SVG URL.
   */
  loadURL (svgurl: string) {
    this.svgobj = null;
    this.readyfordata = false;
    this.svgurl = svgurl;
    if (this.svgurl !== '' && this.loadingSVG === 0) {
      this.loadingSVG = 1;
      const xhr = new XMLHttpRequest();
      xhr.open('GET', this.svgurl); // here you point to the SVG synoptic display file
      let _this = this;
      xhr.onload = function () {
        if (xhr.status === 200) {
          {
            _this.loadingSVG = 0;
          }
          if (_this.componentloaded) {
            // SCADAvis component already loaded?
            _this.iframe?.contentWindow?.postMessage(xhr.responseText, _this.domain);
          }
          // send the SVG file contents to the component
          else {
            _this.svgobj = xhr.responseText;
          } // buffers the result for later use (this can save some time)
        }
      };
      xhr.onreadystatechange = function (oEvent) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
          } else {
            _this.loadingSVG = 0;
            if (this.onerror) {
              _this.onerror(xhr.statusText);
            } else {
              console.warn('SCADAvis.io API: error loading SVG URL. ' + xhr.statusText);
            }
          }
        }
      };
      xhr.send();
    }
  }

  /**
   * Reset all data values and tags.
   * @method resetData
   * @memberof scadavis
   */
  resetData () {
    this.npt = 0;
    this.npts = {};
    this.vals = {};
    this.qualifs = {};
    this.descriptions = {};

    const obj = { data: { type: 'resetData' } };
    if (this.readyfordata) {
      window.postMessage(obj, this.domain);
    } else {
      this.resetobj = obj;
    }
  }

  /**
   * Update values for tags to the component. Send all tags available. Work as a promise. Only available for version 2+.
   * @method refreshDisplay
   * @memberof scadavis
   * @param {Object.<string, number>} [values] - values in a object like { "tag1" : 1.0, "tag2": 1.2, "tag3": true }.
   * @returns {Object} Returns a promise. The promise resolves after the display refresh is completed.
   */
  refreshDisplay (values?: Record<string, number>) {
    let _this = this;
    return new Promise(function (resolve, reject) {
      if (!_this.readyfordata) {
        reject(new Error('Not ready for data!'));
        return;
      }
      if (_this.resolveFunction) {
        reject(new Error('Ongoing display refresh!'));
        return;
      }
      _this.resolveFunction = resolve;
      _this.rejectFunction = reject;
      _this.updateValues(values);
    });
  }

  /**
   * Update values for tags to the component. Send all tags available. (use refreshDisplay when promise-based method preferred)
   * @method updateValues
   * @memberof scadavis
   * @param {Object.<string, number>} [values] - values in a object like { "tag1" : 1.0, "tag2": 1.2, "tag3": true }.
   * @returns {number} Returns request handle or null if not ready.
   */
  updateValues (values?: Record<string, number>) {
    if (!this.readyfordata) {
      return null;
    }
    let _this = this;
    if (typeof values === 'object' && values !== null) {
      Object.keys(values).map(function (tag, index) {
        let n;
        if (tag in _this.npts) {
          n = _this.npts[tag];
        } else {
          n = ++_this.npt;
          _this.npts[tag] = n;
        }
        _this.vals[tag] = values[tag];
        _this.qualifs[tag] = 0x00;
      });
    }

    const rtdata: any = {
      data: { type: 'tags', tags: [], handle: ++this.updateHandle },
    };
    Object.keys(this.npts).map(function (tag, index) {
      rtdata.data.tags[index] = {};
      rtdata.data.tags[index].path = tag;
      rtdata.data.tags[index].value = _this.vals[tag];
      rtdata.data.tags[index].quality = !(_this.qualifs[tag] & 0x80);
      if (typeof _this.vals[tag] === 'number') {
        rtdata.data.tags[index].type = 'float';
      } else if (typeof _this.vals[tag] === 'boolean') {
        rtdata.data.tags[index].type = 'bool';
      } else {
        rtdata.data.tags[index].type = 'string';
      }
      rtdata.data.tags[index].parameters = {
        Value: {
          TagClientItem: _this.npts[tag],
          Alarmed: (_this.qualifs[tag] & 0x100) === 0x100,
          Desc: _this.descriptions[tag],
        },
      };
    });
    this.iframe?.contentWindow?.postMessage(rtdata, this.domain);
    return rtdata.handle;
  }

  /**
   * Set a value for a tag. The component will be updated immediately if the component is ready for data.
   * Notice that updating the component at too many times per second can cause performance problems.
   * Preferably update many values using storeValue() then call updateValues() once (repeat after a second or more).
   * @method setValue
   * @memberof scadavis
   * @param {string} tag - Tag name.
   * @param {number} value - Value for the tag.
   * @param {bool} [failed=false] - True if value is bad or old, false or absent if value is good.
   * @param {bool} [alarmed=false] - True if value is alarmed, false or absent if value is normal.
   * @param {string} [description=tag] - Description.
   * @returns {bool} Returns true if the component was updated (true) or the value was buffered (false).
   */
  setValue (tag: string, value: number, failed?: boolean, alarmed?: boolean, description?: string) {
    if (tag === '' || tag === undefined || tag === null) {
      return this.readyfordata;
    }
    let n;
    failed = failed || false;
    alarmed = alarmed || false;
    description = description || tag;
    if (tag in this.npts) {
      n = this.npts[tag];
    } else {
      n = ++this.npt;
      this.npts[tag] = n;
    }
    this.vals[tag] = value;
    this.qualifs[tag] = (failed ? 0x80 : 0x00) | (alarmed ? 0x100 : 0x00);
    this.descriptions[tag] = description;
    if (this.readyfordata) {
      const rtdata: any = {
        data: { type: 'tags', tags: [], handle: ++this.updateHandle },
      };
      rtdata.data.tags[0] = {};
      rtdata.data.tags[0].path = tag;
      rtdata.data.tags[0].value = value;
      rtdata.data.tags[0].quality = !(this.qualifs[tag] & 0x80);
      if (typeof value === 'number') {
        rtdata.data.tags[0].type = 'float';
      } else if (typeof value === 'boolean') {
        rtdata.data.tags[0].type = 'bool';
      } else {
        rtdata.data.tags[0].type = 'string';
      }
      rtdata.data.tags[0].parameters = {
        Value: {
          TagClientItem: n,
          Alarmed: (this.qualifs[tag] & 0x100) === 0x100,
          Desc: this.descriptions[tag],
        },
      };
      this.iframe?.contentWindow?.postMessage(rtdata, this.domain);
    }
    return this.readyfordata;
  }

  /**
   * Store a value for a tag. The component will not be updated until called updateValues().
   * @method storeValue
   * @memberof scadavis
   * @param {string} tag - Tag name.
   * @param {number} value - Value for the tag.
   * @param {bool} [failed=false] - True if value is bad or old, false or absent if value is good.
   * @param {bool} [alarmed=false] - True if value is alarmed, false or absent if value is normal.
   * @param {string} [description=tag] - Description.
   * @returns {bool} - Returns true if the component is ready for data, false if not.
   */
  storeValue (tag: string, value: number, failed?: boolean, alarmed?: boolean, description?: string) {
    if (tag === '' || tag === undefined || tag === null) {
      return this.readyfordata;
    }
    let n;
    failed = failed || false;
    alarmed = alarmed || false;
    description = description || tag;
    if (tag in this.npts) {
      n = this.npts[tag];
    } else {
      n = ++this.npt;
      this.npts[tag] = n;
    }
    this.vals[tag] = value;
    this.qualifs[tag] = (failed ? 0x80 : 0x00) | (alarmed ? 0x100 : 0x00);
    this.descriptions[tag] = description;
    return this.readyfordata;
  }

  /**
   * Get a value for a tag.
   * @method getValue
   * @memberof scadavis
   * @param {Object} tag - Tag name.
   * @returns {number} Returns the value for the tag or null if not found.
   */
  getValue (tag: string): number | null {
    if (tag in this.vals) {
      return this.vals[tag];
    }
    return null;
  }

  /**
   * Recover the API Key.
   * @method getApiKey
   * @memberof scadavis
   * @returns {string} API Key.
   */
  getApiKey (): string {
    return this.apikey;
  }

  /**
   * Get SCADAvis.io API Version.
   * @method getVersion
   * @memberof scadavis
   * @returns {string} SCADAvis.io API Version.
   */
  getVersion (): string {
    return this.version;
  }

  /**
   * Get the DOM element of the iframe.
   * @method getIframe
   * @memberof scadavis
   * @returns {Object} DOM element reference.
   */
  getIframe (): HTMLIFrameElement | null {
    return this.iframe;
  }

  /**
   * Get the current state of the component.
   * @method getComponentState
   * @memberof scadavis
   * @returns {number} 0=not loaded, 1=loaded and ready for graphics, 2=SVG graphics processed and ready for data.
   */
  getComponentState (): number {
    if (this.componentloaded === false) {
      return 0;
    } else if (this.readyfordata === false) {
      return 1;
    }
    return 2;
  }

  /**
   * Get SCADAvis.io Component Version.
   * @method getComponentVersion
   * @memberof scadavis
   * @returns {string} SCADAvis.io Component Version.
   */
  getComponentVersion (): string {
    return this.version;
  }

  /**
   * Get tags list from the loaded SVG graphics.
   * @method getTagsList
   * @memberof scadavis
   * @returns {string} Tags list.
   */
  getTagsList (): string {
    return this.tagsList;
  }

  /**
   * Move the graphic. Multiple calls have cumulative effect.
   * @method moveBy
   * @memberof scadavis
   * @param {number} [dx=0] Horizontal distance.
   * @param {number} [dy=0] Vertical distance.
   * @param {boolean} [animate=false] Animate or not.
   */
  moveBy (dx: number, dy?: number, animate?: any) {
    dx = dx || 0;
    dy = dy || 0;
    animate = animate || false;
    const obj = { data: { type: 'moveBy', dx: dx, dy: dy, animate: animate } };
    if (this.readyfordata) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    } else {
      this.moveobj = obj;
    }
  }

  /**
   * Apply zoom level. Multiple calls have cumulative effect.
   * @method zoomTo
   * @memberof scadavis
   * @param {number} [zoomLevel=1.1] Zoom level. >1 zoom in, <1 zoom out.
   * @param {string|{x: number, y: number}} [target={x:0,y:0}] Id of object to zoom in/out or x/y coordinates.
   * @param {boolean} [animate=false] Animate or not.
   */
  zoomTo (zoomLevel: number, target?: any, animate?: boolean) {
    zoomLevel = zoomLevel || 1.1;
    animate = animate || false;
    const obj = {
      data: {
        type: 'zoomTo',
        zoomLevel: zoomLevel,
        target: target,
        animate: animate,
      },
    };
    if (this.readyfordata) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    } else {
      this.zoomobj = obj;
    }
  }

  /**
   * Apply default zoom level/position.
   * @method zoomToOriginal
   * @memberof scadavis
   * @param {boolean} [animate=false] Animate or not.
   */
  zoomToOriginal (animate?: boolean) {
    animate = animate || false;
    const obj = { data: { type: 'zoomToOriginal', animate: animate } };
    if (this.readyfordata) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    }
  }

  /**
   * Enable or disable pan and zoom tools.
   * @method enableTools
   * @memberof scadavis
   * @param {boolean} [panEnabled=true] Enable/disable Pan tool.
   * @param {boolean} [zoomEnabled=false] Enable/disable Zoom tool.
   */
  enableTools (panEnabled?: boolean, zoomEnabled?: boolean) {
    if (typeof panEnabled === 'undefined' || panEnabled) {
      panEnabled = true;
    }
    if (typeof zoomEnabled === 'undefined') {
      zoomEnabled = false;
    }
    const obj = {
      data: {
        type: 'enableTools',
        panEnabled: panEnabled,
        zoomEnabled: zoomEnabled,
      },
    };
    if (this.readyfordata) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    } else {
      this.enabletoolsobj = obj;
    }
  }

  /**
   * Enable or disable pan and zoom via mouse.
   * @method enableMouse
   * @memberof scadavis
   * @param {boolean} [panEnabled=true] Enable/disable pan via mouse.
   * @param {boolean} [zoomEnabled=true] Enable/disable zoom via mouse.
   */
  enableMouse (panEnabled?: boolean, zoomEnabled?: boolean) {
    if (typeof panEnabled === 'undefined' || panEnabled) {
      panEnabled = true;
    }
    if (typeof zoomEnabled === 'undefined' || zoomEnabled) {
      zoomEnabled = true;
    }
    const obj = {
      data: {
        type: 'enableMouse',
        panEnabled: panEnabled,
        zoomEnabled: zoomEnabled,
      },
    };
    if (this.readyfordata) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    } else {
      this.enablemouseobj = obj;
    }
  }

  /**
   * Set direction of zoom bound to mouse wheel, and event propagation.
   * @method setMouseWheel
   * @memberof scadavis
   * @param {boolean} [directionBackOut=true] true=back/out, false=back/in.
   * @param {boolean} [blockEventPropagation=true] Enable/disable wheel event propagation.
   */
  setMouseWheel (directionBackOut?: boolean, blockEventPropagation?: boolean) {
    if (typeof directionBackOut === 'undefined' || directionBackOut) {
      directionBackOut = true;
    }
    if (typeof blockEventPropagation === 'undefined' || blockEventPropagation) {
      blockEventPropagation = true;
    }
    const obj = {
      data: {
        type: 'setMouseWheel',
        directionBackOut: directionBackOut,
        blockEventPropagation: blockEventPropagation,
      },
    };
    if (this.readyfordata) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    } else {
      this.mousewheelobj = obj;
    }
  }

  /**
   * Enable or disable keyboard functions (zoom & pan).
   * @method enableKeyboard
   * @memberof scadavis
   * @param {boolean} [keyEnabled=true] Enable/disable Pan tool.
   */
  enableKeyboard (keyEnabled?: boolean) {
    if (typeof keyEnabled === 'undefined' || keyEnabled) {
      keyEnabled = true;
    }
    const obj = { data: { type: 'enableKeyboard', keyEnabled: keyEnabled } };
    if (this.readyfordata) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    } else {
      this.enablekeyboardobj = obj;
    }
  }

  /**
   * Enable or disable alarm flash (objects blinking when alarmed).
   * @method enableAlarmFlash
   * @memberof scadavis
   * @param {boolean} [alarmFlashEnabled=true] Enable/disable global alarm flash.
   */
  enableAlarmFlash (alarmFlashEnabled?: boolean) {
    if (typeof alarmFlashEnabled === 'undefined' || alarmFlashEnabled) {
      alarmFlashEnabled = true;
    }
    const obj = {
      data: { type: 'enableAlarmFlash', alarmFlashEnabled: alarmFlashEnabled },
    };
    if (this.componentloaded) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    } else {
      this.enableflashobj = obj;
    }
  }

  /**
   * Hides the watermark.
   * @method hideWatermark
   * @memberof scadavis
   */
  hideWatermark () {
    const obj = { data: { type: 'hideWatermark' } };
    if (this.readyfordata) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    } else {
      this.hidewatermarkobj = obj;
    }
  }

  /**
   * Set color code for color shortcuts.
   * @method setColor
   * @memberof scadavis
   * @param {number} [colorNumber] Color shortcut number.
   * @param {string} [colorCode] Color code.
   */
  setColor (colorNumber: number, colorCode: string) {
    const obj = {
      data: {
        type: 'setColor',
        colorNumber: colorNumber,
        colorCode: colorCode,
      },
    };
    if (this.componentloaded) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    } else {
      this.setcolorobj.push(obj);
    }
  }

  /**
   * Set color codes for color shortcuts.
   * @method setColors
   * @memberof scadavis
   * @param {Object.<number,string>} [colorsTable] Color shortcut number.
   */
  setColors (colorsTable: Record<number, string>) {
    const obj = {
      data: {
        type: 'setColors',
        colorsTable: colorsTable,
      },
    };
    if (this.componentloaded) {
      this.iframe?.contentWindow?.postMessage(obj, this.domain);
    } else {
      this.setcolorsobj = obj;
    }
  }

  /**
   * Set event listeners.
   * @method on
   * @memberof scadavis
   * @param {string} event Event name, one of: "ready", "click" (the first parameter of callback is the element id).
   * @param {function} callback Callback function.
   * @returns True for valid event, false for invalid event name.
   */
  on (event: string, callback: Function): boolean {
    let ret = false;
    switch (event) {
      case 'loaded':
        this.loaded = callback;
        ret = true;
        break;
      case 'ready':
        this.onready = callback;
        ret = true;
        break;
      case 'error':
        this.onerror = callback;
        ret = true;
        break;
      case 'click':
        this.onclick = callback;
        ret = true;
        break;
      default:
        break;
    }

    return ret;
  }

  /**
   * Must be created with the "new" keyword. (use scadavisInit when promise-based method preferred). E.g. var svgraph = new scadavis("div1", "", "https://svgurl.com/svgurl.svg");
   * @class scadavis - SCADAvis.io synoptic API class.
   * @param {string} [container] - ID of the container object. If empty or null the iframe will be appended to the body.
   * @param {string} [iframeparams] - Parameter string for configuring iframe (excluding id and src and sandbox) e.g. 'frameborder="0" height="250" width="250"'.
   * @param {string} [svgurl] - URL for the SVG file.
   * @param {{container: string|Object, iframeparams: string, svgurl: string, colorsTable: Object}} [paramsobj] - Alternatively parameters can be passed in an object.
   * Example usage: var svgraph = new scadavis("div1", "", "https://svgurl.com/svgurl.svg");
   */
  constructor (container: SvArgs | string, iframeparams?: string, svgurl?: string) {
    const _this: any = this;
    let id;
    let iframehtm;
    let scrolling = ' scrolling="no" ';

    if (typeof container === 'object') {
      this.container = container.container || '';
      this.apikey = container.apikey || '';
      this.iframeparams = container.iframeparams || 'frameborder="0" height="250" width="250"';
      this.svgurl = container.svgurl || '';
      this.colorsTable = container.colorsTable || null;
    } else {
      this.container = container || '';
      this.apikey = '';
      this.iframeparams = iframeparams || 'frameborder="0" height="250" width="250"';
      this.svgurl = svgurl || '';
      this.colorsTable = null;
    }

    this.iframe = null;
    this.componentloaded = false;
    this.readyfordata = false;
    this.domain = '*';
    this.rtdata = { data: { type: 'tags', tags: [] } };
    this.npts = {};
    this.vals = {};
    this.qualifs = {};
    this.descriptions = {};
    this.npt = 0;
    this.svgobj = null;
    this.zoomobj = null;
    this.moveobj = null;
    this.enabletoolsobj = null;
    this.enablekeyboardobj = null;
    this.enableflashobj = null;
    this.hidewatermarkobj = null;
    this.setcolorobj = [];
    this.setcolorsobj = null;
    this.resetobj = null;
    this.tagsList = '';
    this.onready = null;
    this.onerror = null;
    this.onclick = null;
    this.loadingSVG = 0;
    this.updateHandle = 0;
    this.resolveFunction = null;
    this.rejectFunction = null;

    id = this.guidGenerator();

    if (typeof this.container === 'string') {
      if (this.container.trim().length === 0) {
        this.container = document.body;
      } else {
        this.container = document.getElementById(this.container);
        if (this.container === null) {
          this.container = document.body;
        }
      }
    }

    //// get library path
    //const scripts = document.getElementsByTagName('script');
    //let libPath = '.';
    //for (let i = 0; i < scripts.length; ++i) {
    //  const pos = scripts[i].src.indexOf('synopticapi.js');
    //  if (pos > 0) {
    //    libPath = scripts[i].src.substring(0, pos - 1);
    //    break;
    //  }
    //}

    // default is scrolling='no'
    if (this.iframeparams.indexOf('scrolling') >= 0) {
      scrolling = '';
    }
    const subUrl = grafanaBootData?.appSubUrl || grafanaBootData?.settings?.appSubUrl || '';
    iframehtm =
      '<iframe id="' +
      id +
      '" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" ' +
      this.iframeparams +
      scrolling +
      ` src="${subUrl}/public/plugins/scadavis-synoptic-panel/synoptic/synoptic.html"></iframe>`;
    if (this.container.innerHTML !== undefined) {
      (this.container as HTMLDivElement).appendChild(this.createElementFromHTML(iframehtm) as Node);
    } else {
      (this.container as HTMLDivElement).insertAdjacentHTML('afterend', iframehtm);
    }

    this.iframe = document.getElementById(id) as HTMLIFrameElement;

    this.componentloaded = false;
    this.readyfordata = false;

    if (this.colorsTable) {
      this.setColors(this.colorsTable);
    }
    if (this.svgurl !== '') {
      this.loadURL(this.svgurl);
    }

    window.addEventListener('message', function (event: any) {
      // receive messages, watch for messages from the SCADAvis.io component.

      // for better security: check the origin of the message ( must be from the SCADAvis.io domain and component iframe )
      if (
        event.source === _this.iframe.contentWindow
        // && event.origin === this.domain
      ) {
        // when message of type "updated", resolve promise
        if (
          typeof event.data === 'object' &&
          event.data.data.type !== undefined &&
          event.data.data.type === 'updated' &&
          event.data.data.handle === _this.updateHandle
        ) {
          if (event.data.data.error) {
            if (_this.rejectFunction) {
              _this.rejectFunction(new Error(event.data.data.error));
            }
          } else if (_this.resolveFunction) {
            _this.resolveFunction();
          }
          _this.resolveFunction = null;
          _this.rejectFunction = null;
          return;
        }

        // when message of type "loaded", get and send an SVG file to it
        if (typeof event.data === 'object' && event.data.data.type !== undefined && event.data.data.type === 'loaded') {
          _this.componentloaded = true;
          if (_this.setcolorobj.length > 0) {
            for (let i = 0; i < _this.setcolorobj.length; i++) {
              event.source.postMessage(_this.setcolorobj[i], event.origin);
            }
            _this.setcolorobj = [];
          }
          if (_this.setcolorsobj !== null) {
            event.source.postMessage(_this.setcolorsobj, event.origin);
            _this.setcolorsobj = null;
          }
          if (_this.enableflashobj !== null) {
            event.source.postMessage(_this.enableflashobj, event.origin);
            _this.enableflashobj = null;
          }
          if (_this.svgobj !== null) {
            event.source.postMessage(_this.svgobj, event.origin);
          }
          // send the SVG file contents to the component
          else if (_this.svgurl !== '') {
            _this.loadURL(_this.svgurl);
          }
          return;
        }

        // when message type "ready", the SVG screen is processed, then we can send real time data to the SCADAvis.io component
        if (typeof event.data === 'object' && event.data.data.type !== undefined && event.data.data.type === 'ready') {
          _this.readyfordata = true;
          _this.tagsList = event.data.data.attributes.tagsList;
          if (_this.rtdata.data.tags.length) {
            _this.updateValues();
          }
          if (_this.zoomobj) {
            event.source.postMessage(_this.zoomobj, event.origin);
            _this.zoomobj = null;
          }
          if (_this.moveobj) {
            event.source.postMessage(_this.moveobj, event.origin);
            _this.moveobj = null;
          }
          if (_this.enabletoolsobj) {
            event.source.postMessage(_this.enabletoolsobj, event.origin);
            _this.enabletoolsobj = null;
          }
          if (_this.enablemouseobj) {
            event.source.postMessage(_this.enablemouseobj, event.origin);
            _this.enablemouseobj = null;
          }
          if (_this.mousewheelobj) {
            event.source.postMessage(_this.mousewheelobj, event.origin);
            _this.mousewheelobj = null;
          }
          if (_this.enablekeyboardobj) {
            event.source.postMessage(_this.enablekeyboardobj, event.origin);
            _this.enablekeyboardobj = null;
          }
          if (_this.hidewatermarkobj) {
            event.source.postMessage(_this.hidewatermarkobj, event.origin);
            _this.hidewatermarkobj = null;
          }
          if (_this.resetobj) {
            event.source.postMessage(_this.resetobj, event.origin);
            _this.resetobj = null;
          }
          if (_this.onready) {
            _this.onready();
          }
          return;
        }

        // when message of type "click", emit the event callback
        if (typeof event.data === 'object' && event.data.data.type !== undefined && event.data.data.type === 'click') {
          if (_this.onclick) {
            _this.onclick(event.data.data.attributes.event, event.data.data.attributes.tag);
          }
          return;
        }
      }
    });

    // return this
  }

  /**
   * Initialization of the library via promise. Only available for version 2+.
   * @function scadavisInit
   * @global
   * @param {string} [container] - ID of the container object. If empty or null the iframe will be appended to the body.
   * @param {string} [iframeparams] - Parameter string for configuring iframe (excluding id and src and sandbox) e.g. 'frameborder="0" height="250" width="250"'.
   * @param {string} [svgurl] - URL for the SVG file.
   * @param {{container: string|Object, iframeparams: string, svgurl: string, colorsTable: Object}} [paramsobj] - Alternatively parameters can be passed in an object.
   * @returns {Object} Returns a promise with the {@link scadavis} object as a parameter. The promise resolves after the svg file is preprocessed (if an SVG file was specified) or after the component is loaded.
   * Example usage: scadavisInit( {container: "div1", svgurl: "file.svg"} ).then(function (sv) { ... });
   */
  /*  
scadavisInit (container: any, iframeparams: string, svgurl: string) {
  let _this = this;
  return new Promise(function (resolve, reject) {
    try {
      if (typeof container === 'object') {
        svgurl = svgurl || container.svgurl;
        delete container.svgurl;
      }
      const sv = _this.scadavis(container, iframeparams, '');
      if (!svgurl) {
        resolve(sv);
        return;
      }
      sv.on('error', function (errMsg: any) {
        reject(errMsg);
      });
      sv.on('ready', function () {
        resolve(sv);
      });
      sv.loadURL(svgurl);
    } catch (e) {
      reject(e);
    }
  });
}
*/
}
