'use strict'

/*
 *
 * SCADAvis.io Synoptic API © 2018-2022 Ricardo L. Olsen / DSC Systems ALL RIGHTS RESERVED.
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

// global variables
var V = [] // Point values
var F = [] // Point quality flags
var T = [] // Alarm time tags
var TAGS = [] // point tag names
var NPTS = {} // point numbers by tags names
var SUBS = [] // substations
var BAYS = [] // bay of point
var DCRS = [] // point description
var ANOTS = [] // point annotation
var STONS = [] // on status texts
var STOFS = [] // off status texts
var HAS_ALARMS = 0 // Indicates the presence of beep alarm
var LIMSUPS = [] // Analog superior limits for points
var LIMINFS = [] // Analog inferior limits for points
var INVTAGS = {} // list of invalid tags

var SVGDoc = null // SVG Document
var Color_BackgroundSVG = 'gray'

// load image to element
function LoadImage(elem, imgpath) {
  elem.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imgpath)
}

/* Function sprintf(format_string,arguments...)
 * Javascript emulation of the C printf function (modifiers and argument types
 *    "p" and "n" are not supported due to language restrictions)
 *
 * Copyright 2003 K&L Productions. All rights reserved
 * http://www.klproductions.com
 *
 * Terms of use: This function can be used free of charge IF this header is not
 *               modified and remains with the function code.
 *
 * Legal: Use this code at your own risk. K&L Productions assumes NO responsibility
 *        for anything.
 ********************************************************************************/
function sprintf(fstring) {
  let pad = function (str, ch, len) {
    let ps = ''
    for (let i = 0; i < Math.abs(len); i++) ps += ch
    return len > 0 ? str + ps : ps + str
  }
  let processFlags = function (flags, width, rs, arg) {
    let pn = function (flags, arg, rs) {
      if (arg >= 0) {
        if (flags.indexOf(' ') >= 0) rs = ' ' + rs
        else if (flags.indexOf('+') >= 0) rs = '+' + rs
      } else rs = '-' + rs
      return rs
    }
    let iWidth = parseInt(width, 10)
    if (width.charAt(0) == '0') {
      let ec = 0
      if (flags.indexOf(' ') >= 0 || flags.indexOf('+') >= 0) ec++
      if (rs.length < iWidth - ec) rs = pad(rs, '0', rs.length - (iWidth - ec))
      return pn(flags, arg, rs)
    }
    rs = pn(flags, arg, rs)
    if (rs.length < iWidth) {
      if (flags.indexOf('-') < 0) rs = pad(rs, ' ', rs.length - iWidth)
      else rs = pad(rs, ' ', iWidth - rs.length)
    }
    return rs
  }
  let converters = new Array()
  converters['c'] = function (flags, width, precision, arg) {
    if (typeof arg == 'number') return String.fromCharCode(arg)
    if (typeof arg == 'string') return arg.charAt(0)
    return ''
  }
  converters['d'] = function (flags, width, precision, arg) {
    return converters['i'](flags, width, precision, arg)
  }
  converters['u'] = function (flags, width, precision, arg) {
    return converters['i'](flags, width, precision, Math.abs(arg))
  }
  converters['i'] = function (flags, width, precision, arg) {
    let iPrecision = parseInt(precision)
    let rs = Math.abs(arg).toString().split('.')[0]
    if (rs.length < iPrecision) rs = pad(rs, ' ', iPrecision - rs.length)
    return processFlags(flags, width, rs, arg)
  }
  converters['E'] = function (flags, width, precision, arg) {
    return converters['e'](flags, width, precision, arg).toUpperCase()
  }
  converters['e'] = function (flags, width, precision, arg) {
    let iPrecision = parseInt(precision)
    if (isNaN(iPrecision)) iPrecision = 6
    let rs = Math.abs(arg).toExponential(iPrecision)
    if (rs.indexOf('.') < 0 && flags.indexOf('#') >= 0)
      rs = rs.replace(/^(.*)(e.*)$/, '$1.$2')
    return processFlags(flags, width, rs, arg)
  }
  converters['f'] = function (flags, width, precision, arg) {
    let iPrecision = parseInt(precision)
    if (isNaN(iPrecision)) iPrecision = 6
    let rs = Math.abs(arg).toFixed(iPrecision)
    if (rs.indexOf('.') < 0 && flags.indexOf('#') >= 0) rs = rs + '.'
    return processFlags(flags, width, rs, arg)
  }
  converters['G'] = function (flags, width, precision, arg) {
    return converters['g'](flags, width, precision, arg).toUpperCase()
  }
  converters['g'] = function (flags, width, precision, arg) {
    let iPrecision = parseInt(precision)
    let absArg = Math.abs(arg)
    let rse = absArg.toExponential()
    let rsf = absArg.toFixed(6)
    if (!isNaN(iPrecision)) {
      let rsep = absArg.toExponential(iPrecision)
      rse = rsep.length < rse.length ? rsep : rse
      let rsfp = absArg.toFixed(iPrecision)
      rsf = rsfp.length < rsf.length ? rsfp : rsf
    }
    if (rse.indexOf('.') < 0 && flags.indexOf('#') >= 0)
      rse = rse.replace(/^(.*)(e.*)$/, '$1.$2')
    if (rsf.indexOf('.') < 0 && flags.indexOf('#') >= 0) rsf = rsf + '.'
    let rs = rse.length < rsf.length ? rse : rsf
    return processFlags(flags, width, rs, arg)
  }
  converters['o'] = function (flags, width, precision, arg) {
    let iPrecision = parseInt(precision)
    let rs = Math.round(Math.abs(arg)).toString(8)
    if (rs.length < iPrecision) rs = pad(rs, ' ', iPrecision - rs.length)
    if (flags.indexOf('#') >= 0) rs = '0' + rs
    return processFlags(flags, width, rs, arg)
  }
  converters['X'] = function (flags, width, precision, arg) {
    return converters['x'](flags, width, precision, arg).toUpperCase()
  }
  converters['x'] = function (flags, width, precision, arg) {
    let iPrecision = parseInt(precision)
    arg = Math.abs(arg)
    let rs = Math.round(arg).toString(16)
    if (rs.length < iPrecision) rs = pad(rs, ' ', iPrecision - rs.length)
    if (flags.indexOf('#') >= 0) rs = '0x' + rs
    return processFlags(flags, width, rs, arg)
  }
  converters['s'] = function (flags, width, precision, arg) {
    let iPrecision = parseInt(precision)
    let rs = arg
    if (rs.length > iPrecision) rs = rs.substring(0, iPrecision)
    return processFlags(flags, width, rs, 0)
  }
  let farr = fstring.split('%')
  let retstr = farr[0]
  let fpRE = /^([-+ #]*)(\d*)\.?(\d*)([cdieEfFgGosuxX])(.*)$/
  for (let i = 1; i < farr.length; i++) {
    let fps = fpRE.exec(farr[i])
    if (!fps) continue
    if (arguments[i] != null)
      retstr += converters[fps[4]](fps[1], fps[2], fps[3], arguments[i])
    retstr += fps[5]
  }
  return retstr
}

// Remove all SMIL animations
function RemoveAnimate(elem) {
  if (elem === null) {
    return
  }
  let i = 0
  while (i < elem.childNodes.length) {
    if (
      elem.childNodes[i].nodeName == 'animate' ||
      elem.childNodes.nodeName == 'animateTransform' ||
      elem.childNodes.nodeName == 'animateMotion'
    ) {
      elem.removeChild(elem.childNodes[i])
      i = 0
    } else {
      i++
    }
  }
}

// Create SMIL animation
// window.Animate( thisobj, "animate", {'attributeName': 'ry', 'from': 0, 'to': 10, 'fill': 'freeze', 'repeatCount': 5, 'dur': 5 } );
// window.Animate( thisobj, 'animate', {'attributeName': 'width', 'from': 45, 'to': 55, 'repeatCount':5,'dur': 1 });
function Animate(elem, animtype, params) {
  let k, animation
  animation = document.createElementNS('http://www.w3.org/2000/svg', animtype)

  for (k in params) {
    if (params.hasOwnProperty(k)) {
      animation.setAttributeNS(null, k, params[k])
    }
  }

  setTimeout(function () {
    elem.appendChild(animation)
    if (typeof animation.beginElement != 'undefined') {
      animation.endElement()
      animation.beginElement()
    }
  }, 100)
}

// show/hide and translate element
function ShowHideTranslate(idorobj, xd, yd) {
  let obj

  xd = xd || 0
  yd = yd || 0

  const svgdoc = document.getElementById('svgdiv').firstElementChild

  if (svgdoc === null) {
    return
  }

  if (typeof idorobj === 'object') obj = idorobj
  else obj = svgdoc.getElementById(idorobj)

  if (obj === null) {
    return
  }

  if (obj.style.display === 'none') {
    obj.style.display = 'block'
  } else {
    obj.style.display = 'none'
  }

  if (typeof obj.inittransform === 'undefined') {
    obj.inittransform = obj.getAttributeNS(null, 'transform')
  }

  if (obj.inittransform === null) {
    obj.inittransform = ''
  }

  if (xd != 0 || yd != 0)
    obj.setAttributeNS(
      null,
      'transform',
      obj.inittransform +
        ' translate(' +
        parseFloat(xd) +
        ' ' +
        parseFloat(yd) +
        ')'
    )
}

var WebSAGE = {
  RemoveAnimate: RemoveAnimate,
  Animate: Animate,
  ShowHideTranslate: ShowHideTranslate,
  LoadImage: LoadImage,
  g_isInkscape: false,
  g_blinktimerID: 0,
  g_blinkperiod: 1000,
  g_blinkcnt: 0,
  g_blinkList: [], // blinking digital objects
  g_blinkListAna: [], // blinking analog objects
  g_blinkListOld: [], // blinking digital objects (previous)
  g_blinkListAnaOld: [], // blinking analog objects (previous)

  // tamanhos para zoom/pan
  g_zpX: 0,
  g_zpY: 0,
  g_zpW: 0,
  g_zpH: 0,

  g_obj_onclick:
    "{ var pt=parseInt('PONTO'); if (isNaN(pt)) pt=window.NPTS['PONTO']; window.onmouseclick(evt, pt); evt.stopPropagation(); }",

  g_loadtime: 0,
  g_idprefixes: [], // id prefixes to aggregate to TAGs when TAG in form $$#1_POINT_TAG (set from script or passed to by URL parameter IDPREFIX1, IDPREFIX2,...)
  lstpnt: '', // tag list of points

  InkSage: [],
  SetIniExtended: function () {},
  SetExeExtended: function () {},

  doNothing: function () {},

  // Return value from tag or number
  getValue: function (tagornumber) {
    if (tagornumber in V) return V[tagornumber]
    if (tagornumber in NPTS && NPTS[tagornumber] in V)
      return V[NPTS[tagornumber]]
    return 0
  },

  // Return flags from tag or number
  getFlags: function (tagornumber) {
    let f
    if (tagornumber in F) f = F[tagornumber]
    else if (tagornumber in NPTS && NPTS[tagornumber] in F)
      f = F[NPTS[tagornumber]]
    if (isNaN(f))
      return 0xa0 | (WebSAGE.getValue(tagornumber) == 0 ? 0x02 : 0x01)
    else return f
  },

  // Return inferior limit from tag or number
  getInfLim: function (tagornumber) {
    if (tagornumber in LIMINFS) return LIMINFS[tagornumber]
    if (tagornumber in NPTS && NPTS[tagornumber] in LIMINFS)
      return LIMINFS[NPTS[tagornumber]]
    return 0
  },

  // Return superior limit from tag or number
  getSupLim: function (tagornumber) {
    if (tagornumber in LIMSUPS) return LIMSUPS[tagornumber]
    if (tagornumber in NPTS && NPTS[tagornumber] in LIMSUPS)
      return LIMSUPS[NPTS[tagornumber]]
    return 0
  },

  // Return substation from tag or number
  getSubstation: function (tagornumber) {
    if (tagornumber in SUBS) return SUBS[tagornumber]
    if (tagornumber in NPTS && NPTS[tagornumber] in SUBS)
      return SUBS[NPTS[tagornumber]]
    return ''
  },

  // Return bay from tag or number
  getBay: function (tagornumber) {
    if (tagornumber in BAYS) return BAYS[tagornumber]
    if (tagornumber in NPTS && NPTS[tagornumber] in BAYS)
      return BAYS[NPTS[tagornumber]]
    return ''
  },

  // Return description from tag or number
  getDescription: function (tagornumber) {
    if (tagornumber in DCRS) return DCRS[tagornumber]
    if (tagornumber in NPTS && NPTS[tagornumber] in DCRS)
      return DCRS[NPTS[tagornumber]]
    return ''
  },

  // Return alarm time from tag or number
  getTime: function (tagornumber) {
    if (tagornumber in T) return T[tagornumber]
    if (tagornumber in NPTS && NPTS[tagornumber] in T)
      return T[NPTS[tagornumber]]
    return 0
  },

  // Return tag name from tag or number
  getTag: function (tagornumber) {
    if (tagornumber in TAGS) return TAGS[tagornumber]
    if (tagornumber in NPTS && NPTS[tagornumber] in TAGS)
      return TAGS[NPTS[tagornumber]]
    return ''
  },

  tooltipRelac: function (item, pnt) {
    if (pnt == 0 || pnt == 99999 || pnt == 99989 || item.hasTooltip) return

    setTimeout(function () {
      if (item.hasTooltip || item.parentNode.hasTooltip) return

      let tooltip = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'title'
      )
      tooltip.textContent =
        'Tag: ' +
        WebSAGE.getTag(pnt) +
        '\n' +
        'Descr: ' +
        WebSAGE.getDescription(pnt) +
        '\n'

      item.appendChild(tooltip)
      item.hasTooltip = 1
    }, 7000)
  },

  // add point to the list of points, removing special codes like !ALM !TMP
  addPointToList: function (tag) {
    tag = tag.trim()

    if (
      tag.indexOf('!ALM') === 0 ||
      tag.indexOf('!TMP') === 0 ||
      tag.indexOf('!ALR') === 0 ||
      tag.indexOf('!ALR') === 0 ||
      tag.indexOf('!TAG') === 0 ||
      tag.indexOf('!DCR') === 0
    ) {
      tag = tag.substr(4).trim()
    } else if (
      tag.indexOf('!SLIM') === 0 ||
      tag.indexOf('!ILIM') === 0 ||
      tag.indexOf('!STON') === 0
    ) {
      tag = tag.substr(5).trim()
    } else if (tag.indexOf('!STOFF') === 0 || tag.indexOf('!STVAL') === 0) {
      tag = tag.substr(6).trim()
    }

    if (isNaN(tag)) {
      if (tag in NPTS) {
        tag = NPTS[tag]
      } else {
        if (
          tag.indexOf('!') === 0 ||
          tag.indexOf('#') === 0 ||
          tag.indexOf('%') === 0
        )
          // must not begin with a '!' or '#' or '%'
          return 0
      }
    }

    if (
      WebSAGE.lstpnt.indexOf(',' + tag + ',') < 0 &&
      !(WebSAGE.lstpnt.indexOf(tag + ',') === 0)
    ) {
      // append if not already in the list
      WebSAGE.lstpnt = WebSAGE.lstpnt + tag + ','
    }

    return tag
  },

  timerBlink: function () {
    requestAnimationFrame(WebSAGE.timerBlinkDraw)
  },

  timerBlinkDraw: function () {
    let i, half_opac = 0.5

    // avoid object not alarmed anymore left with opacity = half_opac
    if (!(WebSAGE.g_blinkcnt % 2)) {
      // last time was opacity = half_opac
      for (i = 0; i < WebSAGE.g_blinkListOld.length; i++) {
        // looks for the object in the new list, if is not anymore on list, reset opacity
        if (WebSAGE.g_blinkList.indexOf(WebSAGE.g_blinkListOld[i]) === -1)
          WebSAGE.g_blinkListOld[i].style.fillOpacity = 1
      }
      for (i = 0; i < WebSAGE.g_blinkListAnaOld.length; i++) {
        // looks for the object in the new list, if is not anymore on list, reset opacity
        if (WebSAGE.g_blinkListAna.indexOf(WebSAGE.g_blinkListAnaOld[i]) === -1)
          WebSAGE.g_blinkListAnaOld[i].style.fillOpacity = 1
      }
    }

    for (i = 0; i < WebSAGE.g_blinkList.length; i++) {
      if (WebSAGE.g_blinkcnt % 2) {
        WebSAGE.g_blinkList[i].style.strokeOpacity = half_opac
        WebSAGE.g_blinkList[i].style.fillOpacity = half_opac
      } else {
        WebSAGE.g_blinkList[i].style.strokeOpacity = 1
        WebSAGE.g_blinkList[i].style.fillOpacity = 1
      }
    }

    for (i = 0; i < WebSAGE.g_blinkListAna.length; i++) {
      if (WebSAGE.g_blinkcnt % 2) {
        WebSAGE.g_blinkListAna[i].style.strokeOpacity = half_opac
        WebSAGE.g_blinkListAna[i].style.fillOpacity = half_opac
      } else {
        WebSAGE.g_blinkListAna[i].style.strokeOpacity = 1
        WebSAGE.g_blinkListAna[i].style.fillOpacity = 1
      }
    }

    // save lists for next cycle
    WebSAGE.g_blinkListOld = WebSAGE.g_blinkList.slice()
    WebSAGE.g_blinkListAnaOld = WebSAGE.g_blinkListAna.slice()

    WebSAGE.g_blinkcnt++
  },

  // make SVG element with an invalid tag invisible
  processInvalidTagInElement(tag, obj) {
    if (!INVTAGS.hasOwnProperty(tag)) {
      // console.log("Invalid tag: " + tag + (obj? " Object ID:" + obj.id : "") );
      INVTAGS[tag] = 0
    }
    if (obj && obj.style.visibility !== 'collapse')
      obj.style.visibility = 'collapse'
  },

  // returns value after processed special codes !ALMnnnnn e !TMPnnnnn
  valueResolveCoded: function (tag, obj) {
    const retnok = '????'

    if (tag == '' || typeof tag === 'undefined') {
      return retnok
    }

    let t = parseInt(tag)

    if (!isNaN(t)) {
      // tag is a number
      if (typeof V[t] === 'undefined') {
        return retnok
      } else {
        return V[t]
      }
    }

    // tag is not a number
    tag = tag.trim()

    // test if tag corresponds to a number
    if (typeof NPTS[tag] !== 'undefined') {
      // yes: convert to number and return
      if (obj && obj.style.visibility === 'collapse')
        obj.style.visibility = 'inherit'
      if (typeof obj.autoTooltip !== 'undefined') {
        let tt = obj.getElementsByTagName('title')
        if (tt.length > 0)
          tt[0].textContent =
            'TAG: ' +
            tag +
            '\n' +
            'KEY: ' +
            NPTS[tag] +
            '\n' +
            'VAL: ' +
            V[NPTS[tag]]
      }
      return V[NPTS[tag]]
    }

    if (obj && obj.style.visibility === 'collapse')
      obj.style.visibility = 'inherit'

    // try to use alphab. tag directly
    if (typeof V[tag] !== 'undefined') {
      // yes: return it
      return V[tag]
    }

    if (tag.indexOf('#') == 0 || tag.indexOf('%') == 0)
      // special code or indirection
      return WebSAGE.g_retnok

    let f = WebSAGE.getFlags(t)

    if (tag.indexOf('!SLIM') === 0) {
      t = tag.substr(5).trim()
      if (isNaN(t))
        // if not a number, converts it to a number
        t = NPTS[t]
      if (typeof LIMSUPS[t] === 'undefined') {
        return 999999
      }
      return LIMSUPS[t]
    }

    if (tag.indexOf('!ILIM') === 0) {
      t = tag.substr(5).trim()
      if (isNaN(t))
        // if not a number, converts it to a number
        t = NPTS[t]
      if (typeof LIMINFS[t] === 'undefined') {
        return -999999
      }
      return LIMINFS[t]
    }

    if (tag.indexOf('!TAG') === 0) {
      t = tag.substr(4).trim()
      if (isNaN(t))
        // if not a number, converts it to a number
        t = NPTS[t]
      if (typeof TAGS[t] === 'undefined') {
        return ''
      }
      return TAGS[t]
    }

    if (tag.indexOf('!DCR') === 0) {
      t = tag.substr(4).trim()
      if (isNaN(t))
        // if not a number, converts it to a number
        t = NPTS[t]
      if (typeof DCRS[t] === 'undefined') {
        return ''
      }
      return DCRS[t]
    }

    if (tag.indexOf('!STON') === 0) {
      t = tag.substr(5).trim()
      if (isNaN(t))
        // if not a number, converts it to a number
        t = NPTS[t]
      if (typeof STONS[t] === 'undefined') {
        return ''
      }

      return STONS[t]
    }

    if (tag.indexOf('!STOFF') === 0) {
      t = tag.substr(6).trim()
      if (isNaN(t))
        // if not a number, converts it to a number
        t = NPTS[t]
      if (typeof STOFS[t] === 'undefined') {
        return ''
      }

      return STOFS[t]
    }

    if (tag.indexOf('!STVAL') === 0) {
      t = tag.substr(6).trim()
      if (isNaN(t))
        // if not a number, converts it to a number
        t = NPTS[t]
      if ((f & 0x03) === 0x02) {
        return STONS[t]
      }
      if ((f & 0x03) === 0x01) {
        return STOFS[t]
      }
      if ((f & 0x03) === 0x00) {
        return ''
      }
      if ((f & 0x03) === 0x03) {
        return ''
      }
    }

    if (tag.indexOf('!ALR') === 0) {
      t = tag.substr(4).trim()
      if (isNaN(t))
        // if not a number, converts it to a number
        t = NPTS[t]
      if (typeof f === 'undefined') {
        return 0
      }

      if (f & 0x100) {
        return 1
      } else {
        return 0
      }
    }

    if (tag.indexOf('!ALM') === 0) {
      t = tag.substr(3).trim()
      if (isNaN(t))
        // if not a number, converts it to a number
        t = NPTS[t]
      if (typeof f === 'undefined') {
        return 0
      }

      if (f & 0x800 || f & 0x100) {
        return 1
      } else {
        return 0
      }
    }
    if (tag.indexOf('!TMP') === 0) {
      t = tag.substr(3).trim()
      if (isNaN(t))
        // if not a number, converts it to a number
        t = NPTS[t]

      return getTime(t)
    }
    if (tag.indexOf('!EVAL') === 0) {
      t = tag.substr(5).trim()
      try {
        return eval(
          'var thisobj=window.SVGDoc.getElementById("' + obj.id + '"); ' + t
        )
      } catch (err) {
        WebSAGE.processInvalidTagInElement(tag, obj)
        console.log(err)
        return retnok
      }
    }

    WebSAGE.processInvalidTagInElement(tag, obj)
    return retnok
  },

  // process c-printf-like formatting codes
  printCFormat: function (fmt, tag, obj) {
    let valr = WebSAGE.valueResolveCoded(tag, obj)

    if (valr === '????') {
      return valr
    }

    // if not defined, use default
    if (typeof fmt == 'undefined' || fmt === '') {
      if (isNaN(parseFloat(valr))) {
        fmt = '%s'
      } else {
        fmt = '%1.1f'
      }
    }

    // process format codes
    if (fmt.search(/[udrla][\^▲▼△▽]/) >= 0) {
      fmt = fmt.replace('u▲', valr > 0 ? '▲' : valr < 0 ? '▼' : ' ') // up filled triangle
      fmt = fmt.replace('d▼', valr > 0 ? '▼' : valr < 0 ? '▲' : ' ') // down filled triangle
      fmt = fmt.replace('u△', valr > 0 ? '△' : valr < 0 ? '▽' : ' ') // up filled triangle
      fmt = fmt.replace('d▽', valr > 0 ? '▽' : valr < 0 ? '△' : ' ') // down filled triangle
      fmt = fmt.replace('u^', String.fromCharCode(valr >= 0 ? 0x2191 : 0x2193)) // u^ up arrow
      fmt = fmt.replace('d^', String.fromCharCode(valr >= 0 ? 0x2193 : 0x2191)) // d^ down arrow
      fmt = fmt.replace('r^', String.fromCharCode(valr >= 0 ? 0x21a3 : 0x21a2)) // r^ right arrow
      fmt = fmt.replace('l^', String.fromCharCode(valr >= 0 ? 0x21a2 : 0x21a3)) // l^ left arrow
      fmt = fmt.replace('a^', '') // a^, absolute value
      valr = Math.abs(valr)
    }

    if (fmt.indexOf('%') < 0) {
      // no % then use d3 formatting
      let fa = fmt.split('`')
      fa[0] = fa[0].replace('~', '%')
      return d3.format(fa[0])(valr) + (fa.length > 1 ? fa[1] : '')
    }
    return sprintf(fmt, valr)
  },

  // resolves clone tags like %n to n = point number
  pegaTagClone: function (item, lb) {
    let j, k, l, poseq, pattern, poscloned

    // if there is a tag list
    if (typeof lb.list !== 'undefined') {
      // for all the tag list
      for (j = 0; j < lb.list.length; j++) {
        if (typeof lb.list[j].tag !== 'undefined')
          if (lb.list[j].tag.indexOf('%') !== -1)
            if (item.parentNode.nodeName === 'g') {
              // is a cloned tag? (with a % char)
              // looks for the parent node in the XSAC object list
              for (k = 0; k < WebSAGE.InkSage.length; k++) {
                if (WebSAGE.InkSage[k].parent.id === item.parentNode.id) {
                  // parent found
                  if (typeof item.parentNode.noTrace !== 'undefined') {
                    // propagates notrace mark from parent to child
                    item.noTrace = item.parentNode.noTrace
                  }

                  // looks for the tag in the map of cloned tags of the group
                  for (l = 0; l < WebSAGE.InkSage[k].map.length; l++) {
                    // position of the equal sign in the map item, after it there is the resoved tag
                    poseq = WebSAGE.InkSage[k].map[l].indexOf('=')
                    // pattern is %n from  "%n=nnn" where nnn=point number
                    pattern = WebSAGE.InkSage[k].map[l].substring(0, poseq)
                    // position of the % in the cloned tag (may be %n or like !SLIM%n)
                    poscloned = lb.list[j].tag.indexOf('%')
                    if (
                      pattern ===
                      lb.list[j].tag.substring(
                        poscloned,
                        poscloned + pattern.length
                      )
                    ) {
                      // substitutes %n by the point number
                      lb.list[j].tag =
                        lb.list[j].tag.substring(0, poscloned) +
                        WebSAGE.InkSage[k].map[l].substring(poseq + 1)
                      lb.tag = lb.list[j].tag
                      WebSAGE.InkSage[k].tag = lb.list[j].tag
                    }
                  }
                  break
                }
              }
            }
      }
    } else {
      if (typeof lb.tag !== 'undefined')
        if (lb.tag.indexOf('%') !== -1)
          if (item.parentNode.nodeName === 'g') {
            // is a cloned tag? (with a % char)
            if (typeof item.parentNode.noTrace !== 'undefined') {
              // propagates notrace mark from parent to child
              item.noTrace = item.parentNode.noTrace
            }

            // looks for the parent node in the XSAC object list
            for (k = 0; k < WebSAGE.InkSage.length; k++) {
              if (WebSAGE.InkSage[k].parent.id === item.parentNode.id) {
                // parent found
                // looks for the tag in the map of cloned tags of the group
                for (l = 0; l < WebSAGE.InkSage[k].map.length; l++) {
                  // position of the equal sign in the map item, after it there is the resoved tag
                  poseq = WebSAGE.InkSage[k].map[l].indexOf('=')
                  // pattern is %n from  "%n=nnn" where nnn=point number
                  pattern = WebSAGE.InkSage[k].map[l].substring(0, poseq)
                  // position of the % in the cloned tag (may be %n or like !SLIM%n)
                  poscloned = lb.tag.indexOf('%')
                  if (
                    pattern ===
                    lb.tag.substring(poscloned, poscloned + pattern.length)
                  ) {
                    // substitutes %n by the point number
                    lb.tag =
                      lb.tag.substring(0, poscloned) +
                      WebSAGE.InkSage[k].map[l].substring(poseq + 1) +
                      lb.tag.substring(poscloned + pattern.length)
                    item.temPaiGrupo = 1
                  }
                }
                break
              }
            }
          }

      if (typeof lb.src !== 'undefined')
        if (lb.src.indexOf('%') !== -1)
          if (item.parentNode.nodeName === 'g') {
            // is a cloned tag? (with a % char)
            if (typeof item.parentNode.noTrace !== 'undefined') {
              // propagates notrace mark from parent to child
              item.noTrace = item.parentNode.noTrace
            }

            // looks for the parent node in the XSAC object list
            for (k = 0; k < WebSAGE.InkSage.length; k++) {
              if (WebSAGE.InkSage[k].parent.id === item.parentNode.id) {
                // parent found
                // looks for the tag in the map of cloned tags of the group
                for (l = 0; l < WebSAGE.InkSage[k].map.length; l++) {
                  // position of the equal sign in the map item, after it there is the resoved tag
                  poseq = WebSAGE.InkSage[k].map[l].indexOf('=')
                  // pattern is %n from  "%n=nnn" where nnn=point number
                  pattern = WebSAGE.InkSage[k].map[l].substring(0, poseq)
                  // position of the % in the cloned tag (may be %n or like !SLIM%n)
                  poscloned = lb.src.indexOf('%')
                  if (
                    pattern ===
                    lb.src.substring(poscloned, poscloned + pattern.length)
                  ) {
                    // substitutes %n by the point number
                    lb.tag =
                      lb.src.substring(0, poscloned) +
                      WebSAGE.InkSage[k].map[l].substring(poseq + 1) +
                      lb.src.substring(poscloned + pattern.length)
                    lb.src = lb.tag
                    item.temPaiGrupo = 1
                  }
                }
                break
              }
            }
          }

      if (lb.attr === 'tooltips') {
        for (j = 0; j < lb.param.length; j++) {
          if (lb.param[j].indexOf('!EVAL') !== -1)
            if (lb.param[j].indexOf('%') !== -1)
              if (item.parentNode.nodeName === 'g') {
                // is a cloned tag? (with a % char)
                if (typeof item.parentNode.noTrace !== 'undefined') {
                  // propagates notrace mark from parent to child
                  item.noTrace = item.parentNode.noTrace
                }

                // looks for the parent node in the XSAC object list
                for (k = 0; k < WebSAGE.InkSage.length; k++) {
                  if (WebSAGE.InkSage[k].parent.id === item.parentNode.id) {
                    // parent found
                    // looks for the tag in the map of cloned tags of the group
                    for (l = 0; l < WebSAGE.InkSage[k].map.length; l++) {
                      // position of the equal sign in the map item, after it there is the resoved tag
                      poseq = WebSAGE.InkSage[k].map[l].indexOf('=')
                      // pattern is %n from  "%n=nnn" where nnn=point number
                      pattern = WebSAGE.InkSage[k].map[l].substring(0, poseq)
                      // position of the % in the cloned tag (may be %n or like !SLIM%n)
                      poscloned = lb.param[j].indexOf('%')
                      if (
                        pattern ===
                        lb.param[j].substring(
                          poscloned,
                          poscloned + pattern.length
                        )
                      ) {
                        // substitutes %n by the point number
                        lb.param[j] =
                          lb.param[j].substring(0, poscloned) +
                          WebSAGE.InkSage[k].map[l].substring(poseq + 1) +
                          lb.param[j].substring(poscloned + pattern.length)
                        item.temPaiGrupo = 1
                      }
                    }
                    break
                  }
                }
              }
        }
      }
    }
  },

  // Distributes one object after another (to the right or bottom) inside a group
  setGroupDistrib: function (grp) {
    let i, xright, bb, ybottom, dif, tl

    for (i = 0; i < grp.children.length; i++) {
      if (i > 0) {
        if (typeof grp.children[i].inittransform === 'undefined') {
          grp.children[i].inittransform = grp.children[i].getAttributeNS(
            null,
            'transform'
          )
        }
        bb = grp.children[i].getBoundingClientRect()

        if (typeof grp.children[i].lastXlate === 'undefined') {
          grp.children[i].lastXlate = 0
        }

        if (grp.groupDistribType === 'vertical') {
          dif =
            parseFloat(ybottom - bb.top + grp.groupDistribSpacing) +
            grp.children[i].lastXlate
          tl = ' translate(0 ' + dif + ')'
        } else {
          dif =
            parseFloat(xright - bb.left + grp.groupDistribSpacing) +
            grp.children[i].lastXlate
          tl = ' translate(' + dif + ' 0)'
        }

        grp.children[i].setAttributeNS(
          null,
          'transform',
          grp.children[i].inittransform + tl
        )
        grp.children[i].lastXlate = dif
      }
      bb = grp.children[i].getBoundingClientRect()
      xright = bb.right
      ybottom = bb.bottom
      grp.children[i].groupDistrib = 1
    }
  },

  processInkscapeSAGETags: function (item) {
    // SAGE/XSAC on inkscape:label
    let inksage_labeltxt =
      item.getAttributeNS(null, 'inkscape:label') ||
      item.getAttributeNS(
        'http://www.inkscape.org/namespaces/inkscape',
        'label'
      )
    let lbv, pnt, inksage_labelvec, j, i, t
    let tspl, src, xsacsrc, arrcores
    let tooltip, tooltiptext, textNode, clone, nohs, bb, sep
    let tfm, auxobj, pospfx, aft
    let arr = []

    if (inksage_labeltxt === null) {
      return
    }

    if (inksage_labeltxt == '') {
      return
    }

    if (typeof inksage_labeltxt != 'undefined') {
      try {
        while ((pospfx = inksage_labeltxt.indexOf('$$#')) >= 0) {
          // process id prefixes
          aft = inksage_labeltxt.substr(pospfx)
          inksage_labeltxt =
            inksage_labeltxt.substr(0, pospfx) +
            WebSAGE.g_idprefixes[
              parseInt(inksage_labeltxt.substr(pospfx + 3)) - 1
            ] +
            aft.substr(aft.indexOf('_') + 1)
        }

        inksage_labelvec = JSON.parse('[' + inksage_labeltxt + ']') // change JSON text to vector
      } catch (Exception) {
        return
      }

      for (lbv = 0; lbv < inksage_labelvec.length; lbv++) {
        inksage_labelvec[lbv].parent = item
        WebSAGE.pegaTagClone(item, inksage_labelvec[lbv]) // solve clone tags
        if (typeof inksage_labelvec[lbv].tag != 'undefined') {
          // point has tag
          pnt = WebSAGE.addPointToList(inksage_labelvec[lbv].tag)
          if (pnt !== 99999 && pnt !== 0)
            if (typeof item.blockPopup == 'undefined')
              if (item.pontoPopup == undefined) {
                // undefined popup
                WebSAGE.tooltipRelac(item, pnt)
                item.setAttributeNS(
                  null,
                  'onclick',
                  WebSAGE.g_obj_onclick.replace(/PONTO/g, pnt)
                )
                if (item.style !== null) {
                  item.style.cursor = 'pointer'
                }
              }
        }

        switch (inksage_labelvec[lbv].attr) {
          case 'set':
            switch (inksage_labelvec[lbv].tag) {
              case '#exec_once': // exec a script once
              case '#exec': // exec a script once
                try {
                  eval(
                    'var thisobj=window.SVGDoc.getElementById("' +
                      item.id +
                      '"); ' +
                      inksage_labelvec[lbv].src
                  )
                } catch (err) {
                  $('#SP_STATUS').text(err.name + ': ' + err.message + ' [8]')
                  document.getElementById('SP_STATUS').title = err.stack
                }
                break
              case '#set_filter': // set filter to almbox
                if (typeof xPlain == 'undefined') {
                  if (inksage_labelvec[lbv].src != '')
                    if (document.getElementById('almiframe').src == '') {
                      document.getElementById('almiframe').src =
                        'almbox.html?SUBST=' + inksage_labelvec[lbv].src
                      document.getElementById('almiframe').style.display = ''
                    }
                }
                break
              case '#copy_xsac_from': // copy xsac tags from other object
                if (inksage_labelvec[lbv].src != '') {
                  src = inksage_labelvec[lbv].src.split(',')
                  for (j = 0; j < src.length; j++) {
                    auxobj = SVGDoc.getElementById(src[j])
                    if (auxobj !== null) {
                      xsacsrc =
                        auxobj.getAttributeNS(null, 'inkscape:label') ||
                        auxobj.getAttributeNS(
                          'http://www.inkscape.org/namespaces/inkscape',
                          'label'
                        )
                      if (xsacsrc != '') {
                        item.setAttribute('inkscape:label', xsacsrc)
                        // item.setAttributeNS( "http://www.inkscape.org/namespaces/inkscape", "label", xsacsrc );
                        WebSAGE.processInkscapeSAGETags(item)
                      }
                    } else {
                      $('#SP_STATUS').text(
                        "Err: 'copy_xsac_from' " + src[j] + ' --> ' + item.id
                      )
                    }
                  }
                }
                break
              case '#set_group_distribution': // Distributes one object after another (to the right or bottom) inside a group
                {
                  sep = parseFloat(inksage_labelvec[lbv].src)
                  if (isNaN(sep)) {
                    item.groupDistribSpacing = 0
                  } else {
                    item.groupDistribSpacing = sep
                  }

                  if (inksage_labelvec[lbv].prompt === 'vertical') {
                    item.groupDistribType = 'vertical'
                  } else {
                    item.groupDistribType = 'horizontal'
                  }

                  WebSAGE.setGroupDistrib(item)
                }
                break
              default:
                WebSAGE.SetIniExtended(inksage_labelvec, lbv, item)
                break
            }
            break
          case 'popup':
            if (inksage_labelvec[lbv].src.indexOf('preview:') === 0) {
              // WebSAGE.setPreview( item, inksage_labelvec[lbv].src.substr(8),  inksage_labelvec[lbv].width, inksage_labelvec[lbv].height );
            } else if (inksage_labelvec[lbv].src === 'block') {
              // do not open point access on click
              item.setAttributeNS(null, 'onclick', null)
              if (item.style != null) {
                item.style.cursor = ''
              }
              item.blockPopup = 1
              item.noTrace = 1
            } else if (inksage_labelvec[lbv].src === 'notrace') {
              // allows to open point access tracing other object on click
              item.noTrace = 1
            } else {
              // links point to access on click
              pnt = WebSAGE.addPointToList(inksage_labelvec[lbv].src)
              WebSAGE.tooltipRelac(item, pnt)
              item.setAttributeNS(
                null,
                'onclick',
                WebSAGE.g_obj_onclick.replace(/PONTO/g, pnt)
              )
              if (item.style !== null || typeof item.style === 'undefined') {
                item.style.cursor = 'pointer'
              }
              item.pontoPopup = pnt
            }
            break
          case 'get':
            if (
              inksage_labelvec[
                lbv
              ].parent.firstElementChild.textContent.indexOf('|') >= 0
            ) {
              // OFF|ON|FAILED
              inksage_labelvec[lbv].txtOFFON =
                inksage_labelvec[
                  lbv
                ].parent.firstElementChild.textContent.split('|')
            } else {
              inksage_labelvec[lbv].formatoC =
                inksage_labelvec[lbv].parent.firstElementChild.textContent

              pnt = inksage_labelvec[lbv].tag
            }
            break
          case 'color':
            if (item.style !== null) {
              inksage_labelvec[lbv].initfill = item.style.fill
              inksage_labelvec[lbv].initstroke = item.style.stroke
            } else {
              inksage_labelvec[lbv].initfill = ''
              inksage_labelvec[lbv].initstroke = ''
            }
            for (j = 0; j < inksage_labelvec[lbv].list.length; j++) {
              pnt = WebSAGE.addPointToList(inksage_labelvec[lbv].list[j].tag)
              inksage_labelvec[lbv].list[j].cscript = ''
              inksage_labelvec[lbv].list[j].cfill = ''
              inksage_labelvec[lbv].list[j].cstroke = ''
              inksage_labelvec[lbv].list[j].cattrib = ''
              inksage_labelvec[lbv].list[j].cattribval = ''

              if (
                inksage_labelvec[lbv].list[j].param.indexOf('attrib: ') === 0
              ) {
                arr = inksage_labelvec[lbv].list[j].param.substr(8).split('=')
                if (arr.length > 1) {
                  inksage_labelvec[lbv].list[j].cattrib = arr[0]
                  inksage_labelvec[lbv].list[j].cattribval = arr[1]
                }
              } else if (
                inksage_labelvec[lbv].list[j].param.indexOf('script: ') === 0
              ) {
                inksage_labelvec[lbv].list[j].cscript =
                  inksage_labelvec[lbv].list[j].param.substr(8)
              } else {
                // resolve color shortcuts
                arrcores = []
                arrcores = inksage_labelvec[lbv].list[j].param.split('|')
                inksage_labelvec[lbv].list[j].cfill = WebSAGE.translateColor(
                  arrcores[0]
                )
                if (arrcores.length > 1) {
                  inksage_labelvec[lbv].list[j].cstroke = WebSAGE.translateColor(
                    arrcores[1]
                  )
                } else {
                  inksage_labelvec[lbv].list[j].cstroke =
                    inksage_labelvec[lbv].list[j].cfill
                }
              }

              if (pnt != 99999)
                if (typeof item.blockPopup == 'undefined')
                  if (item.pontoPopup === undefined)
                    if (j === 0) {
                      // undefined popup
                      // first item only
                      WebSAGE.tooltipRelac(item, pnt)
                      item.setAttributeNS(
                        null,
                        'onclick',
                        WebSAGE.g_obj_onclick.replace(/PONTO/g, pnt)
                      )
                      if (item.style !== null) {
                        item.style.cursor = 'pointer'
                      }
                    }
            }
            break
          case 'bar':
            inksage_labelvec[lbv].initheight = item.getAttributeNS(
              null,
              'height'
            )
            break
          case 'opac':
            break
          case 'open':
            if (inksage_labelvec[lbv].istag == 0) {
              // Source type = URL:
              //   new:url open new page,
              //   preview:url preview page (popup),
              //   link to another screen (name of the screen file without path/extension)
              if (inksage_labelvec[lbv].src.indexOf('new:') === 0) {
                item.style.cursor = 'pointer'
                item.setAttributeNS(
                  null,
                  'onclick',
                  "window.open( '" +
                    inksage_labelvec[lbv].src.substr(4) +
                    "','','dependent=yes,height=" +
                    inksage_labelvec[lbv].height +
                    ',width=' +
                    inksage_labelvec[lbv].width +
                    ",toolbar=no,directories=no,status=no,menubar=no,scrollbars=no,resizable=no,modal=yes' );"
                )
              } else if (inksage_labelvec[lbv].src.indexOf('preview:') === 0) {
                // WebSAGE.setPreview( item, inksage_labelvec[lbv].src.substr(8), inksage_labelvec[lbv].width, inksage_labelvec[lbv].height );
              } else {
              }
            } else {
              // Source type = TAG : gráfico, deve ser um retângulo
              if (item.tagName === 'rect') {
                // values plot
                inksage_labelvec[lbv].grafico = document.createElementNS(
                  'http://www.w3.org/2000/svg',
                  'polyline'
                )
                item.parentNode.appendChild(inksage_labelvec[lbv].grafico)
                inksage_labelvec[lbv].grafico.setAttributeNS(
                  null,
                  'style',
                  'fill:none; stroke:white; stroke-width: 2'
                )
                tfm = item.getAttributeNS(null, 'transform')
                if (tfm != null) {
                  inksage_labelvec[lbv].grafico.setAttributeNS(
                    null,
                    'transform',
                    tfm
                  )
                }

                // plot thickness same of rectangle
                if (item.style != undefined) {
                  if (item.style.strokeWidth != '') {
                    inksage_labelvec[lbv].grafico.style.strokeWidth =
                      item.style.strokeWidth
                  }
                  if (item.style.stroke != '') {
                    inksage_labelvec[lbv].grafico.style.stroke =
                      item.style.stroke
                  }
                }

                // source field format: point number|plot style|superior limit style|inferior limit style
                // Ex: Source: 1234|stroke:green|stroke:red|stroke:orange
                tspl = inksage_labelvec[lbv].src.split('|')
                inksage_labelvec[lbv].tag = tspl[0]
                if (typeof tspl[1] != 'undefined') {
                  if (tspl[1].trim() != '') {
                    inksage_labelvec[lbv].grafico.setAttributeNS(
                      null,
                      'style',
                      tspl[1]
                    )
                  }
                }

                inksage_labelvec[lbv].valores = []
                inksage_labelvec[lbv].datas = []
                inksage_labelvec[lbv].bb = item.getBBox()
                inksage_labelvec[lbv].bb.left = inksage_labelvec[lbv].bb.x
                inksage_labelvec[lbv].bb.right =
                  inksage_labelvec[lbv].bb.x + inksage_labelvec[lbv].bb.width
                inksage_labelvec[lbv].bb.top = inksage_labelvec[lbv].bb.y
                inksage_labelvec[lbv].bb.bottom =
                  inksage_labelvec[lbv].bb.y + inksage_labelvec[lbv].bb.height
                pnt = WebSAGE.addPointToList(inksage_labelvec[lbv].tag)
                if (typeof item.blockPopup == 'undefined')
                  if (item.pontoPopup == undefined) {
                    // undefined popup
                    WebSAGE.tooltipRelac(item, pnt)
                    item.setAttributeNS(
                      null,
                      'onclick',
                      WebSAGE.g_obj_onclick.replace(/PONTO/g, pnt)
                    )
                    if (item.style != null) {
                      item.style.cursor = 'pointer'
                    }
                  }
              }
            }
            break
          case 'rotate':
            if (item.getAttributeNS(null, 'transform') === null) {
              inksage_labelvec[lbv].inittransform = ''
            } else {
              inksage_labelvec[lbv].inittransform = item.getAttributeNS(
                null,
                'transform'
              )
            }
            break
          case 'tooltips':
            tooltiptext = ''
            for (j = 0; j < inksage_labelvec[lbv].param.length; j++) {
              if (j > 0) {
                tooltiptext = tooltiptext + '\n'
              }
              tooltiptext = tooltiptext + inksage_labelvec[lbv].param[j]
            }
            tooltip = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'title'
            )
            textNode = document.createTextNode(tooltiptext)
            tooltip.appendChild(textNode)
            item.appendChild(tooltip)
            item.hasTooltip = 1
            if (tooltiptext.indexOf('!EVAL') !== -1) {
              inksage_labelvec[lbv].hasActiveTooltip = 1
              inksage_labelvec[lbv].tooltipTitle = tooltip
              inksage_labelvec[lbv].tooltipText = tooltiptext
            }
            break
          case 'slider':
            if (item.getAttributeNS(null, 'transform') === null) {
              inksage_labelvec[lbv].inittransform = ''
            } else {
              inksage_labelvec[lbv].inittransform = item.getAttributeNS(
                null,
                'transform'
              )
            }
            inksage_labelvec[lbv].min = parseFloat(inksage_labelvec[lbv].min)
            inksage_labelvec[lbv].max = parseFloat(inksage_labelvec[lbv].max)

            // find clone (<use>) object
            clone = undefined
            nohs = SVGDoc.getElementsByTagName('use')
            for (i = 0; i < nohs.length; i++) {
              if (
                nohs
                  .item(i)
                  .getAttributeNS('http://www.w3.org/1999/xlink', 'href') ==
                '#' + item.getAttributeNS(null, 'id')
              ) {
                clone = nohs.item(i)
                inksage_labelvec[lbv].clone = clone
                break
              }
            }
            if (clone != undefined) {
              clone.style.display = 'none' // hide clone
              let clonetfm = clone.getAttributeNS(null, 'transform')
              let st1 = clonetfm.indexOf('(')
              let st2 = clonetfm.indexOf(',')
              if (st2 === -1) st2 = clonetfm.indexOf(' ')
              let st3 = clonetfm.indexOf(')')
              if (st2 == -1) st2 = st3
              inksage_labelvec[lbv].rangex =
                parseFloat(clonetfm.substring(st1 + 1, st2)) || 0
              inksage_labelvec[lbv].rangey =
                parseFloat(clonetfm.substring(st2 + 1, st3)) || 0
            }
            break
          case 'zoom':
            bb = item.getBoundingClientRect()
            item.setAttributeNS(
              null,
              'onclick',
              ' window.WebSAGE.g_zpX = ' +
                bb.left +
                ';window.WebSAGE.g_zpY = ' +
                bb.top +
                ';window.WebSAGE.g_zpW = ' +
                bb.width * 2.0 +
                ';window.WebSAGE.g_zpH = ' +
                bb.height * 2.0 +
                ";window.WebSAGE.zoomPan(10);evt.currentTarget.style.display='none';"
            )
            break
          case 'script':
            for (i = 0; i < inksage_labelvec[lbv].list.length; i++) {
              switch (inksage_labelvec[lbv].list[i].evt) {
                case 'mouseup':
                case 'mousedown':
                case 'mouseover':
                case 'mouseout':
                case 'mousemove':
                case 'keydown':
                  item.setAttributeNS(
                    null,
                    'on' + inksage_labelvec[lbv].list[i].evt,
                    'thisobj=evt.currentTarget;' +
                      inksage_labelvec[lbv].list[i].param
                  )
                  if (inksage_labelvec[lbv].list[i].evt.indexOf('mouse') >= 0)
                    if (typeof item.blockPopup == 'undefined')
                      if (item.style !== null) item.style.cursor = 'pointer'
                  break
                case 'exec_once':
                  try {
                    function evalprot(src) {
                      // create context to protect some vars from being changed by the eval code
                      var lbv = null
                      var i = null
                      return eval(src)
                    }
                    evalprot(
                      'var thisobj=document.getElementById("' +
                        item.id +
                        '"); ' +
                        inksage_labelvec[lbv].list[i].param
                    )
                  } catch (err) {
                    $('#SP_STATUS').text(err.name + ': ' + err.message + ' [8]')
                    document.getElementById('SP_STATUS').title = err.stack
                  }
                  break
                case 'exec_on_update':
                  break
                case 'vega':
                case 'vega-lite':
                case 'vega4':
                  inksage_labelvec[lbv].tag =
                    '#' + inksage_labelvec[lbv].list[i].evt
                  inksage_labelvec[lbv].src =
                    inksage_labelvec[lbv].list[i].param.split('\n')[0]
                  inksage_labelvec[lbv].prompt = inksage_labelvec[lbv].list[
                    i
                  ].param.substring(
                    inksage_labelvec[lbv].list[i].param.indexOf('\n') + 1
                  )
                  WebSAGE.SetIniExtended(inksage_labelvec, lbv, item)
                  break
                case 'vega-json':
                case 'vega4-json':
                  inksage_labelvec[lbv].tag =
                    '#' + inksage_labelvec[lbv].list[i].evt
                  inksage_labelvec[lbv].prompt =
                    inksage_labelvec[lbv].list[i].param
                  WebSAGE.SetIniExtended(inksage_labelvec, lbv, item)
                  break
              }
            }
            break
          case 'text':
            break
          case 'clone':
            if (
              'map' in inksage_labelvec[lbv] &&
              inksage_labelvec[lbv].map.length > 0
            ) {
              let var_tag = inksage_labelvec[lbv].map[0].split('=')
              pnt = WebSAGE.addPointToList(var_tag[1])
              if (pnt !== 0) {
                item.setAttributeNS(
                  null,
                  'onclick',
                  WebSAGE.g_obj_onclick.replace(/PONTO/g, pnt)
                )
                if (item.style !== null || typeof item.style === 'undefined')
                  item.style.cursor = 'pointer'
                item.pontoPopup = pnt
              }
            }
            break
          default:
            break
        }

        WebSAGE.InkSage.push(inksage_labelvec[lbv]) // save for later processing
      }
    }
  },

  preprocessSVGDisplay: function () {
    if (SVGDoc === null) {
      return
    }
    let i

    // first, process groups because of clones on XSAC
    let nohs = SVGDoc.getElementsByTagName('g')
    for (i = 0; i < nohs.length; i++) {
      WebSAGE.processInkscapeSAGETags(nohs.item(i))
    }

    // look for tags on text objects
    nohs = SVGDoc.getElementsByTagName('text')
    try {
      for (i = 0; i < nohs.length; i++) {
        WebSAGE.processInkscapeSAGETags(nohs.item(i))
      }
    } catch (err) {
      $('#SP_STATUS').text('Error!' + ' [4]')
      document.getElementById('SP_STATUS').title = err.stack
    }

    // shapes
    nohs = []
    let tmp
    tmp = SVGDoc.getElementsByTagName('rect')
    for (i = 0; i < tmp.length; i++) {
      nohs.push(tmp.item(i))
    }
    tmp = SVGDoc.getElementsByTagName('ellipse')
    for (i = 0; i < tmp.length; i++) {
      nohs.push(tmp.item(i))
    }
    tmp = SVGDoc.getElementsByTagName('path')
    for (i = 0; i < tmp.length; i++) {
      nohs.push(tmp.item(i))
    }
    tmp = SVGDoc.getElementsByTagName('image')
    for (i = 0; i < tmp.length; i++) {
      nohs.push(tmp.item(i))
    }
    tmp = SVGDoc.getElementsByTagName('circle')
    for (i = 0; i < tmp.length; i++) {
      nohs.push(tmp.item(i))
    }
    tmp = SVGDoc.getElementsByTagName('line')
    for (i = 0; i < tmp.length; i++) {
      nohs.push(tmp.item(i))
    }
    tmp = SVGDoc.getElementsByTagName('polyline')
    for (i = 0; i < tmp.length; i++) {
      nohs.push(tmp.item(i))
    }
    tmp = SVGDoc.getElementsByTagName('polygon')
    for (i = 0; i < tmp.length; i++) {
      nohs.push(tmp.item(i))
    }
    tmp = SVGDoc.getElementsByTagName('use')
    for (i = 0; i < tmp.length; i++) {
      nohs.push(tmp.item(i))
    }

    for (i = 0; i < nohs.length; i++) {
      if (nohs[i].nodeName !== 'g' && nohs[i].nodeName !== 'text') {
        // groups already processed
        try {
          WebSAGE.processInkscapeSAGETags(nohs[i])
        } catch (err) {
          $('#SP_STATUS').text('Error!' + ' [5]')
          document.getElementById('SP_STATUS').title =
            'Obj ID=' + nohs[i].id + ' ' + err.stack
        }
      }
    }
  },

  blinkAlarmed: function (tag, item) {
    let f = WebSAGE.getFlags(tag)
    if (f & 0x100) {
      // alarm
      if ((f & 0x20) == 0) {
        // A/D type
        if (WebSAGE.g_blinkList.indexOf(item) === -1)
          WebSAGE.g_blinkList.push(item)
      } else {
        if (WebSAGE.g_blinkListAna.indexOf(item) === -1)
          WebSAGE.g_blinkListAna.push(item)
      }
    } else {
      {
        let i = WebSAGE.g_blinkList.indexOf(item)
        item.style.fillOpacity = 1
        item.style.strokeOpacity = 1
        if (i !== -1) WebSAGE.g_blinkList.splice(i, 1)
        i = WebSAGE.g_blinkListOld.indexOf(item)
        if (i !== -1) WebSAGE.g_blinkListOld.splice(i, 1)
        i = WebSAGE.g_blinkListAna.indexOf(item)
        if (i !== -1) WebSAGE.g_blinkListAna.splice(i, 1)
        i = WebSAGE.g_blinkListAnaOld.indexOf(item)
        if (i !== -1) WebSAGE.g_blinkListAnaOld.splice(i, 1)
        return
      }
    }
  },

  showValsSVG: function () {
    if (document.hidden || !requestAnimationFrame) {
      WebSAGE.drawSVG()
    } else {
      requestAnimationFrame(WebSAGE.drawSVG)
    }
  },

  // process XSAC/SAGE scada animations on SVG
  drawSVG: function () {
    try {
      SVGDoc = document.getElementById('svgdiv').children[0]
    } catch (exception) {
      console.log('Unsupported browser!')
      return
    }

    let fill, stroke, attrib, attribval, bb, ft, i, j
    let digital, val, tag, vt, ch

    for (i = 0; i < WebSAGE.InkSage.length; i++) {
      if (typeof WebSAGE.InkSage[i].xdone != 'undefined') continue

      if (WebSAGE.InkSage[i].tag != undefined) {
        tag = WebSAGE.InkSage[i].tag
        vt = WebSAGE.valueResolveCoded(tag, WebSAGE.InkSage[i].parent)
      }

      if (
        vt != '????' ||
        WebSAGE.InkSage[i].attr === 'color' ||
        WebSAGE.InkSage[i].attr === 'set' ||
        WebSAGE.InkSage[i].attr === 'script'
      ) {
        switch (WebSAGE.InkSage[i].attr) {
          case 'set':
            switch (WebSAGE.InkSage[i].tag) {
              case '#exec_on_update': // exec a script every time data changed
                try {
                  eval(
                    'var thisobj=window.SVGDoc.getElementById("' +
                      WebSAGE.InkSage[i].parent.id +
                      '"); ' +
                      WebSAGE.InkSage[i].src
                  )
                } catch (err) {
                  $('#SP_STATUS').text(err.name + ': ' + err.message + ' [8]')
                  document.getElementById('SP_STATUS').title = err.stack
                }
                break
              default:
                WebSAGE.SetExeExtended(i)
                break
            }
            break
          case 'open':
            // graphic plot ?
            if (WebSAGE.InkSage[i].istag == 1)
              if (WebSAGE.InkSage[i].parent.tagName === 'rect') {
                let indv, xx, yy, sep
                let dotlist = ''
                let d = new Date()

                if (WebSAGE.InkSage[i].hasOwnProperty('valores'))
                  if (typeof WebSAGE.InkSage[i].valores[tag] == 'undefined') {
                    WebSAGE.InkSage[i].valores[tag] = []
                    WebSAGE.InkSage[i].datas[tag] = []
                  }

                // verify value not changing, so abort unnecessary replot. Passed 30 seconds plot it anyway.
                if (WebSAGE.InkSage[i].hasOwnProperty('valores'))
                  if (typeof WebSAGE.InkSage[i].valores[tag] != 'undefined')
                    if (WebSAGE.InkSage[i].valores[tag].length > 0)
                      if (
                        vt ==
                        WebSAGE.InkSage[i].valores[tag][
                          WebSAGE.InkSage[i].valores[tag].length - 1
                        ]
                      )
                        if (
                          (d.getTime() -
                            WebSAGE.InkSage[i].datas[
                              WebSAGE.InkSage[i].datas[tag].length - 1
                            ]) /
                            1000 <
                          30
                        )
                          break

                if (WebSAGE.InkSage[i].hasOwnProperty('valores'))
                  if (typeof WebSAGE.InkSage[i].valores[tag] != 'undefined') {
                    WebSAGE.InkSage[i].valores[tag].push(vt)
                    WebSAGE.InkSage[i].datas[tag].push(d.getTime())
                    bb = WebSAGE.InkSage[i].bb
                    if (WebSAGE.InkSage[i].width > 0)
                      // trending plot / time window
                      for (
                        indv = WebSAGE.InkSage[i].valores[tag].length - 1;
                        indv >= 0;
                        indv--
                      ) {
                        let secdif =
                          (d.getTime() - WebSAGE.InkSage[i].datas[tag][indv]) /
                          1000
                        if (secdif > Math.abs(WebSAGE.InkSage[i].width)) {
                          // exceeded time
                          WebSAGE.InkSage[i].valores[tag].splice(indv, 1)
                          WebSAGE.InkSage[i].datas[tag].splice(indv, 1)
                        } else {
                          // still on time window, plots
                          xx =
                            bb.right -
                            parseFloat(
                              (secdif / Math.abs(WebSAGE.InkSage[i].width)) *
                                bb.width
                            )
                          yy =
                            bb.bottom -
                            parseFloat(
                              ((WebSAGE.InkSage[i].valores[tag][indv] -
                                WebSAGE.InkSage[i].y) /
                                WebSAGE.InkSage[i].height) *
                                bb.height
                            )
                          if (yy > bb.bottom) {
                            yy = bb.bottom
                          }
                          if (yy < bb.top) {
                            yy = bb.top
                          }
                          sep = indv === 0 ? '' : ','
                          dotlist =
                            dotlist + xx.toFixed(3) + ' ' + yy.toFixed(3) + sep
                        }
                      }
                    // day up to now type plot
                    else
                      for (
                        indv = WebSAGE.InkSage[i].valores[tag].length - 1;
                        indv >= 0;
                        indv--
                      ) {
                        let secdif =
                          (WebSAGE.InkSage[i].datas[tag][indv] -
                            WebSAGE.InkSage[i].dataini) /
                          1000
                        if (
                          WebSAGE.InkSage[i].datas[tag][indv] >
                          WebSAGE.InkSage[i].datafim
                        ) {
                          // exceeded time
                          WebSAGE.InkSage[i].valores[tag] = []
                          WebSAGE.InkSage[i].datas[tag] = []
                          let dtn = new Date()
                          WebSAGE.InkSage[i].dataini =
                            dtn.getTime() -
                            (dtn.getTime() %
                              (Math.abs(WebSAGE.InkSage[i].width) * 1000)) +
                            ((dtn.getTimezoneOffset() * 60 * 1000) %
                              (Math.abs(WebSAGE.InkSage[i].width) * 1000))
                          WebSAGE.InkSage[i].datafim =
                            WebSAGE.InkSage[i].dataini +
                            Math.abs(WebSAGE.InkSage[i].width * 1000)
                        } else {
                          // still on time window, plots
                          xx =
                            bb.left +
                            parseFloat(
                              (secdif / Math.abs(WebSAGE.InkSage[i].width)) *
                                bb.width
                            )
                          yy =
                            bb.bottom -
                            parseFloat(
                              ((WebSAGE.InkSage[i].valores[tag][indv] -
                                WebSAGE.InkSage[i].y) /
                                WebSAGE.InkSage[i].height) *
                                bb.height
                            )
                          if (yy > bb.bottom) {
                            yy = bb.bottom
                          }
                          if (yy < bb.top) {
                            yy = bb.top
                          }
                          sep = indv === 0 ? '' : ','
                          dotlist =
                            dotlist + xx.toFixed(3) + ' ' + yy.toFixed(3) + sep
                        }
                      }

                    if (dotlist.charAt(dotlist.length - 1) === ',') {
                      dotlist = dotlist.substring(0, dotlist.length - 1)
                    }
                    WebSAGE.InkSage[i].grafico.setAttributeNS(
                      null,
                      'points',
                      dotlist
                    )
                  }
              }
            break
          case 'get': // put value of tag on text
            if (typeof WebSAGE.InkSage[i].txtOFFON !== 'undefined') {
              if (
                WebSAGE.valueResolveCoded(tag, WebSAGE.InkSage[i].parent) === 0
              )
                val = WebSAGE.InkSage[i].txtOFFON[1]
              else val = WebSAGE.InkSage[i].txtOFFON[0]
            } else {
              val = WebSAGE.printCFormat(
                WebSAGE.InkSage[i].formatoC,
                tag,
                WebSAGE.InkSage[i].parent
              )
            }
            if (
              val != WebSAGE.InkSage[i].parent.firstElementChild.textContent
            ) {
              WebSAGE.InkSage[i].parent.firstElementChild.textContent = val
              if (WebSAGE.InkSage[i].parent.groupDistrib) {
                WebSAGE.setGroupDistrib(WebSAGE.InkSage[i].parent.parentNode)
              }

              WebSAGE.InkSage[i].lastVal = WebSAGE.getValue(tag)
            }
            WebSAGE.blinkAlarmed(tag, WebSAGE.InkSage[i].parent)
            break
          case 'color': // ranges of values to change color and more
            let script = ''
            fill = ''
            stroke = ''
            attrib = ''
            attribval = ''
            tag = ''
            vt = 0
            for (j = 0; j < WebSAGE.InkSage[i].list.length; j++) {
              if (tag !== WebSAGE.InkSage[i].list[j].tag) {
                tag = WebSAGE.InkSage[i].list[j].tag
                vt = WebSAGE.valueResolveCoded(tag, WebSAGE.InkSage[i].parent)
              }

              if (typeof WebSAGE.getFlags(tag) === 'undefined') {
                if (vt === '????') {
                  ft = 0x80 | 0x20 // analog failed
                } else {
                  ft = 0x20 // analog ok
                }
              } else {
                ft = WebSAGE.getFlags(tag)
              }
              digital = (ft & 0x20) === 0

              if (vt !== '????') {
                ch = WebSAGE.InkSage[i].list[j].data
                if (digital) {
                  val = parseInt(ch)
                  if (
                    (!isNaN(val) && (ft & 0x03) >= val) ||
                    (!isNaN(val) && (ft & 0x83) >= (val | 0x80)) ||
                    (ch === 'a' && ft & 0x100) || // alarmed
                    (ch === 'f' && ft & 0x80) // failed
                  ) {
                    fill = WebSAGE.InkSage[i].list[j].cfill
                    stroke = WebSAGE.InkSage[i].list[j].cstroke
                    script = WebSAGE.InkSage[i].list[j].cscript
                    attrib = WebSAGE.InkSage[i].list[j].cattrib
                    attribval = WebSAGE.InkSage[i].list[j].cattribval
                  }
                } else {
                  val = parseFloat(ch)

                  if (
                    (ch === 'n' && ft & 0x800) || // anormal
                    (ch === 'c' && ft & 0x1000) || // frozen
                    (ch === 'a' && ft & 0x100) || // alarmed
                    (ch === 'f' && ft & 0x80) || // failed
                    (!isNaN(val) && vt >= val)
                  ) {
                    let strf, atustrf, proxval
                    if (typeof WebSAGE.InkSage[i].list[j + 1] != 'undefined') {
                      // is there a next data in list
                      strf = WebSAGE.InkSage[i].list[j + 1].cfill
                      if (strf[0] === '@') {
                        // interpolate?
                        strf = strf.substring(1)
                        atustrf = WebSAGE.InkSage[i].list[j].cfill
                        if (atustrf[0] === '@') atustrf = atustrf.substring(1)
                        proxval = parseFloat(
                          WebSAGE.InkSage[i].list[j + 1].data
                        )
                        fill = chroma
                          .mix(
                            atustrf,
                            strf,
                            (vt - val) / (proxval - val),
                            'hsl'
                          )
                          .toString()
                      } else fill = WebSAGE.InkSage[i].list[j].cfill

                      strf = WebSAGE.InkSage[i].list[j + 1].cstroke
                      if (strf[0] === '@') {
                        // interpolate?
                        strf = strf.substring(1)
                        atustrf = WebSAGE.InkSage[i].list[j].cstroke
                        if (atustrf[0] === '@') atustrf = atustrf.substring(1)
                        proxval = parseFloat(
                          WebSAGE.InkSage[i].list[j + 1].data
                        )
                        stroke = chroma
                          .mix(
                            atustrf,
                            strf,
                            (vt - val) / (proxval - val),
                            'hsl'
                          )
                          .toString()
                      } else stroke = WebSAGE.InkSage[i].list[j].cstroke
                    } else {
                      fill = WebSAGE.InkSage[i].list[j].cfill
                      if (fill[0] === '@') fill = fill.substring(1)
                      stroke = WebSAGE.InkSage[i].list[j].cstroke
                      if (stroke[0] === '@') stroke = stroke.substring(1)
                    }

                    script = WebSAGE.InkSage[i].list[j].cscript
                    attrib = WebSAGE.InkSage[i].list[j].cattrib
                    attribval = WebSAGE.InkSage[i].list[j].cattribval
                  }
                }

                WebSAGE.blinkAlarmed(tag, WebSAGE.InkSage[i].parent)
              }
            }

            if (typeof WebSAGE.InkSage[i].parent.temAnimacao !== 'undefined')
              if (WebSAGE.InkSage[i].parent.temAnimacao) {
                RemoveAnimate(WebSAGE.InkSage[i].parent)
              }

            if (attrib !== '') {
              WebSAGE.InkSage[i].parent.setAttributeNS(null, attrib, attribval)
            } else if (script !== '') {
              WebSAGE.InkSage[i].parent.temAnimacao = 1
              WebSAGE.InkSage[i].parent.style.fill = WebSAGE.InkSage[i].initfill
              WebSAGE.InkSage[i].parent.style.stroke =
                WebSAGE.InkSage[i].initstroke
              try {
                eval(
                  'var thisobj=window.SVGDoc.getElementById("' +
                    WebSAGE.InkSage[i].parent.id +
                    '"); ' +
                    script
                )
              } catch (err) {
                $('#SP_STATUS').text(err.name + ': ' + err.message + ' [7]')
                document.getElementById('SP_STATUS').title = err.stack
              }
            } else {
              if (fill !== '') {
                WebSAGE.InkSage[i].parent.style.fill = fill
              } else {
                WebSAGE.InkSage[i].parent.style.fill =
                  WebSAGE.InkSage[i].initfill
              }

              if (stroke !== '') {
                WebSAGE.InkSage[i].parent.style.stroke = stroke
              } else {
                WebSAGE.InkSage[i].parent.style.stroke =
                  WebSAGE.InkSage[i].initstroke
              }
            }
            if (WebSAGE.InkSage[i].parent.groupDistrib) {
              WebSAGE.setGroupDistrib(WebSAGE.InkSage[i].parent.parentNode)
            }
            if (tag == 99999) {
              // if constant value (99999), remove of subsequent processing
              WebSAGE.InkSage[i].xdone = 1
            }
            break
          case 'bar':
            let heigth =
              (WebSAGE.InkSage[i].initheight * (vt - WebSAGE.InkSage[i].min)) /
              (WebSAGE.InkSage[i].max - WebSAGE.InkSage[i].min)
            // limit height: 0 to initial height
            if (heigth < 0) {
              heigth = 0
            }
            if (heigth > WebSAGE.InkSage[i].initheight) {
              heigth = WebSAGE.InkSage[i].initheight
            }
            WebSAGE.InkSage[i].parent.setAttributeNS(null, 'height', heigth)
            WebSAGE.blinkAlarmed(tag, WebSAGE.InkSage[i].parent)
            break
          case 'opac':
            let opac = 1
            if (WebSAGE.InkSage[i].max === WebSAGE.InkSage[i].min) opac = 1
            else {
              opac =
                (vt - WebSAGE.InkSage[i].min) /
                (WebSAGE.InkSage[i].max - WebSAGE.InkSage[i].min)
              if (opac < 0) opac = 0
              if (opac > 1) opac = 1
            }
            if (isNaN(opac)) opac = 1
            WebSAGE.InkSage[i].parent.style.opacity = opac
            WebSAGE.blinkAlarmed(tag, WebSAGE.InkSage[i].parent)
            break
          case 'rotate':
            bb = WebSAGE.InkSage[i].parent.getBBox()
            let tcx = parseFloat(
              WebSAGE.InkSage[i].parent.getAttributeNS(
                null,
                'inkscape:transform-center-x'
              ) ||
                WebSAGE.InkSage[i].parent.getAttributeNS(
                  'http://www.inkscape.org/namespaces/inkscape',
                  'transform-center-x'
                )
            )
            let tcy = parseFloat(
              WebSAGE.InkSage[i].parent.getAttributeNS(
                null,
                'inkscape:transform-center-y'
              ) ||
                WebSAGE.InkSage[i].parent.getAttributeNS(
                  'http://www.inkscape.org/namespaces/inkscape',
                  'transform-center-y'
                )
            )
            if (isNaN(tcx)) {
              tcx = 0
            }
            if (isNaN(tcy)) {
              tcy = 0
            }
            let xcen = bb.x + bb.width / 2 + tcx
            let ycen = bb.y + bb.height / 2 - tcy
            let ang =
              ((vt - WebSAGE.InkSage[i].min) /
                (WebSAGE.InkSage[i].max - WebSAGE.InkSage[i].min)) *
              360
            WebSAGE.InkSage[i].parent.setAttributeNS(
              null,
              'transform',
              WebSAGE.InkSage[i].inittransform +
                ' rotate(' +
                ang +
                ' ' +
                xcen +
                ' ' +
                ycen +
                ') '
            )
            WebSAGE.blinkAlarmed(tag, WebSAGE.InkSage[i].parent)
            break
          case 'tooltips':
            if (typeof WebSAGE.InkSage[i].hasActiveTooltip !== 'undefined')
              if (WebSAGE.InkSage[i].hasActiveTooltip === 1) {
                let pini
                let pend
                let ev
                let tc
                tc = WebSAGE.InkSage[i].tooltipText
                do {
                  pini = tc.indexOf('!EVAL', 0)
                  pend = tc.indexOf('!END', 1)
                  if (pend === -1) {
                    pend = 9999999
                  }
                  if (pini !== -1) {
                    ev = eval(tc.substring(pini + 5, pend))
                    if (!isNaN(Number(ev))) {
                      ev = sprintf('%1.3f', ev)
                    }

                    tc = tc.substring(0, pini) + ev + tc.substring(pend + 4)
                  }
                } while (pini !== -1)

                WebSAGE.InkSage[i].tooltipTitle.textContent = tc
              }
            break
          case 'slider':
            if (vt > WebSAGE.InkSage[i].max) {
              vt = WebSAGE.InkSage[i].max
            }
            if (vt < WebSAGE.InkSage[i].min) {
              vt = WebSAGE.InkSage[i].min
            }
            let proporcao =
              (vt - WebSAGE.InkSage[i].min) /
              (WebSAGE.InkSage[i].max - WebSAGE.InkSage[i].min)
            WebSAGE.InkSage[i].parent.setAttributeNS(
              null,
              'transform',
              WebSAGE.InkSage[i].inittransform +
                ' translate(' +
                proporcao * WebSAGE.InkSage[i].rangex +
                ' ' +
                proporcao * WebSAGE.InkSage[i].rangey +
                ') '
            )
            WebSAGE.blinkAlarmed(tag, WebSAGE.InkSage[i].parent)
            break
          case 'text':
            if (typeof WebSAGE.getFlags(tag) == 'undefined') {
              ft = vt
            } else {
              ft = WebSAGE.getFlags(tag)
            }
            digital = (ft & 0x20) == 0
            let txt = ''
            for (j = 0; j < WebSAGE.InkSage[i].map.length; j++) {
              let poseq = WebSAGE.InkSage[i].map[j].indexOf('=')
              ch = WebSAGE.InkSage[i].map[j].substring(0, 1)
              if (digital) {
                val = parseInt(WebSAGE.InkSage[i].map[j].substring(0, poseq))
                if (
                  (ft & 0x03) >= val ||
                  (ft & 0x83) >= (val | 0x80) ||
                  (ch === 'a' && ft & 0x100) || // alarmado
                  (ch === 'f' && ft & 0x80) // falha
                ) {
                  txt = WebSAGE.InkSage[i].map[j].substring(poseq + 1)
                }
              } else {
                val = parseFloat(WebSAGE.InkSage[i].map[j].substring(0, poseq))
                if (
                  vt >= val ||
                  (ch === 'a' && ft & 0x100) || // alarmado
                  (ch === 'f' && ft & 0x80) // falha
                ) {
                  txt = WebSAGE.InkSage[i].map[j].substring(poseq + 1)
                }
              }
            }
            if (txt != WebSAGE.InkSage[i].parent.textContent) {
              if (
                WebSAGE.InkSage[i].parent.firstChild &&
                WebSAGE.InkSage[i].parent.firstChild.tagName === 'tspan'
              )
                WebSAGE.InkSage[i].parent.firstChild.textContent = txt
              else WebSAGE.InkSage[i].parent.textContent = txt
            }

            WebSAGE.blinkAlarmed(tag, WebSAGE.InkSage[i].parent)
            break
          case 'clone':
            break
          case 'script':
            for (j = 0; j < WebSAGE.InkSage[i].list.length; j++) {
              switch (WebSAGE.InkSage[i].list[j].evt) {
                case 'exec_on_update': // execute a script every time data is updated
                  try {
                    function evalprot(src) {
                      // create context to protect some vars from being changed by the eval code
                      var i,
                        j,
                        val,
                        vt,
                        mudou_dig,
                        mudou_ana = null
                      return eval(src)
                    }
                    evalprot(
                      'var thisobj=document.getElementById("' +
                        WebSAGE.InkSage[i].parent.id +
                        '"); ' +
                        WebSAGE.InkSage[i].list[j].param
                    )
                  } catch (err) {
                    $('#SP_STATUS').text(err.name + ': ' + err.message + ' [8]')
                    document.getElementById('SP_STATUS').title = err.stack
                  }
                  break
                case 'vega':
                case 'vega-lite':
                case 'vega-json':
                case 'vega4':
                case 'vega4-json':
                  WebSAGE.SetExeExtended(i)
                  break
                default:
                  break
              }
            }
            break
          default:
            break
        }
      }
    }

    // show the svg after the first pass
    if (document.getElementById('svgdiv').style.opacity == 0)
      document.getElementById('svgdiv').style.opacity = 1
  }, // drawSVG

  zoomPan: function (opc, mul, event) {
    if (SVGDoc === null) {
      return
    }
    let ptScr, ptSvg, w, h

    if (mul === undefined) mul = 1

    switch (opc) {
      case 12: // zoom in centered on mouse pointer
        ptScr = SVGDoc.createSVGPoint()
        ptScr.x = event.clientX
        ptScr.y = event.clientY
        ptSvg = ptScr.matrixTransform(SVGDoc.getScreenCTM().inverse())
        WebSAGE.g_zpW = WebSAGE.g_zpW * 0.95
        WebSAGE.g_zpH = WebSAGE.g_zpH * 0.95
        w = WebSAGE.g_zpW / 0.95
        h = WebSAGE.g_zpH / 0.95
        WebSAGE.g_zpX =
          WebSAGE.g_zpX +
          (w - WebSAGE.g_zpW) * ((ptSvg.x - WebSAGE.g_zpX) / WebSAGE.g_zpW) -
          2.5
        WebSAGE.g_zpY =
          WebSAGE.g_zpY +
          (h - WebSAGE.g_zpH) * ((ptSvg.y - WebSAGE.g_zpY) / WebSAGE.g_zpH) -
          1.5
        break
      case 18: // zoom out centered on mouse pointer
        ptScr = SVGDoc.createSVGPoint()
        ptScr.x = event.clientX
        ptScr.y = event.clientY
        ptSvg = ptScr.matrixTransform(SVGDoc.getScreenCTM().inverse())
        WebSAGE.g_zpW = WebSAGE.g_zpW * 1.05
        WebSAGE.g_zpH = WebSAGE.g_zpH * 1.05
        w = WebSAGE.g_zpW / 1.05
        h = WebSAGE.g_zpH / 1.05
        WebSAGE.g_zpX =
          WebSAGE.g_zpX +
          (w - WebSAGE.g_zpW) * ((ptSvg.x - WebSAGE.g_zpX) / WebSAGE.g_zpW) -
          2.5
        WebSAGE.g_zpY =
          WebSAGE.g_zpY +
          (h - WebSAGE.g_zpH) * ((ptSvg.y - WebSAGE.g_zpY) / WebSAGE.g_zpH) -
          1.5
        break
      case 0:
      case 2: // zoom in
        WebSAGE.g_zpW = WebSAGE.g_zpW * 0.9
        WebSAGE.g_zpH = WebSAGE.g_zpH * 0.9
        WebSAGE.g_zpX = WebSAGE.g_zpX + 1
        break
      case 1: // up
        WebSAGE.g_zpY =
          WebSAGE.g_zpY + (mul * 20 * WebSAGE.g_zpW) / ScreenViewer_SVGMaxWidth
        break
      case 3: // left
        WebSAGE.g_zpX =
          WebSAGE.g_zpX + (mul * 30 * WebSAGE.g_zpW) / ScreenViewer_SVGMaxWidth
        break
      case 4: // restore
        WebSAGE.g_zpX = 0
        WebSAGE.g_zpY = 0
        WebSAGE.g_zpW = ScreenViewer_SVGMaxWidth
        WebSAGE.g_zpH = ScreenViewer_SVGMaxHeight
        break
      case 5: // right
        WebSAGE.g_zpX =
          WebSAGE.g_zpX - (mul * 30 * WebSAGE.g_zpW) / ScreenViewer_SVGMaxWidth
        break
      case 6:
      case 8: // zoom out
        WebSAGE.g_zpW = WebSAGE.g_zpW * 1.1
        WebSAGE.g_zpH = WebSAGE.g_zpH * 1.1
        WebSAGE.g_zpX = WebSAGE.g_zpX + 1
        break
      case 7: // down
        WebSAGE.g_zpY =
          WebSAGE.g_zpY - (mul * 20 * WebSAGE.g_zpW) / ScreenViewer_SVGMaxWidth
        break
      case 9: // zoom out with bigger step
        WebSAGE.g_zpW = WebSAGE.g_zpW * 1.3
        WebSAGE.g_zpH = WebSAGE.g_zpH * 1.3
        WebSAGE.g_zpX = WebSAGE.g_zpX + 1
        break
      default:
        break
    }

    SVGDoc.setAttributeNS(
      null,
      'viewBox',
      WebSAGE.g_zpX +
        ' ' +
        WebSAGE.g_zpY +
        ' ' +
        WebSAGE.g_zpW +
        ' ' +
        WebSAGE.g_zpH
    )
  },

  setBgColor: function (cor) {
    if (cor == 'none') {
      const sodipodibase = SVGDoc.getElementById('base')
      if (sodipodibase)
        Color_BackgroundSVG = cor = sodipodibase.attributes.pagecolor.value
      else return
    }

    // bg color on SVG root
    SVGDoc.setAttributeNS(null, 'style', 'background-color: ' + cor + ';')
    // bg color on SVG div
    $('#svgdiv').css('background-color', cor)

    document.body.bgColor = cor
  },

  // resolve color shortcuts
  translateColor: function (cor) {
    let num
    if (
      cor.substr(0, 5) == '-cor-' ||
      cor.substr(0, 5) == '-clr-' ||
      cor.substr(0, 5) == '-pbi-'
    )
      switch (cor) {
        case '-pbi-background':
          cor = PBIColorBackground
          break
        case '-pbi-foreground':
          cor = PBIColorForeground
          break
        case '-pbi-bad':
          cor = PBIColorBad
          break
        case '-pbi-good':
          cor = PBIColorBad
          break
        case '-pbi-maximum':
          cor = PBIColorMaximum
          break
        case '-pbi-minimum':
          cor = PBIColorMinimum
          break
        case '-pbi-selected':
          cor = PBIColorSelected
          break
        case '-pbi-negative':
          cor = PBIColorNegative
          break
        case '-pbi-positive':
          cor = PBIColorPositive
          break
        case '-clr-background':
        case '-clr-bgd':
        case '-cor-bgd':
          cor = Color_BackgroundSVG
          break
        case '-clr-tbr':
        case '-cor-tbr':
          cor = ScreenViewer_ToolbarColor
          break
        case '-clr-almini':
        case '-cor-almini':
          cor = VisorTelas_CorAlarmeInibido
          break
        case '-clr-failed':
        case '-cor-medfal':
          cor = VisorTelas_Medidas_Cor_Falha
          break
        default:
          if (cor.substr(0, 5) == '-pbi-') {
            num = parseInt(cor.substr(5, 3), 10)
            if (isNaN(num)) {
              cor = 'none'
            } else {
              num = num > 0 ? num - 1 : 0
              cor = PBIColorTable[num]
            }
          } else {
            num = parseInt(cor.substr(5, 3), 10)
            if (isNaN(num)) {
              cor = 'none'
            } else {
              cor = ScreenViewer_ColorTable[num]
            }
          }
          break
      }

    return cor
  },

  // Make an element dragabble
  makeDraggable: function (obj) {
    if (!obj) return

    obj.style.cursor = 'crosshair'

    obj.drgDragging = false
    obj.drgX = 0
    obj.drgY = 0
    if (typeof obj.inittransform === 'undefined')
      obj.inittransform = obj.getAttributeNS(null, 'transform')
    if (obj.inittransform === null) obj.inittransform = ''

    $(obj).bind('mousedown', function (event) {
      if (obj.style.display == 'none') {
        // do not initiate drag if object already not displayed
        obj.style.cursor = 'crosshair'
        obj.drgDragging = false
        obj.drgMouseOffsetX = 0
        obj.drgMouseOffsetY = 0
        window.drgObject = null
        return
      }

      obj.style.cursor = 'move'
      obj.drgDragging = true
      window.drgObject = obj
      let p = SVGDoc.createSVGPoint()
      p.x = event.clientX
      p.y = event.clientY
      // var m = obj.parentNode.getScreenCTM()
      obj.drgMouseOffsetX = p.x - obj.drgX
      obj.drgMouseOffsetY = p.y - obj.drgY
    })

    $(obj).bind('mouseup', function (event) {
      obj.style.cursor = 'crosshair'
      obj.drgDragging = false
      obj.drgMouseOffsetX = 0
      obj.drgMouseOffsetY = 0
      window.drgObject = null
    })

    $(obj).bind('mousemove', function (event) {
      if (obj.drgDragging === true) {
        let p = SVGDoc.createSVGPoint()
        p.x = event.clientX
        p.y = event.clientY

        let m = obj.parentNode.getScreenCTM()
        p.x -= obj.drgMouseOffsetX
        p.y -= obj.drgMouseOffsetY

        // avoids moving full document
        window.MOUSEX = event.clientX
        window.MOUSEY = event.clientY

        // move the object in svg coordinates
        obj.drgX = p.x
        obj.drgY = p.y
        m.e = m.f = 0
        p = p.matrixTransform(m.inverse())
        obj.setAttributeNS(
          null,
          'transform',
          'translate(' + p.x + ',' + p.y + ') ' + obj.inittransform
        )
        event.stopPropagation()
      }
    })
  },

  init: function () {
    WebSAGE.g_loadtime = new Date()

    // vai nos objetos com 'id' e coloca como 'title' a mensagem correspondente de Titles, carrega as imagens (de images.js)
    //$('img[id]').attr('src', function (index) {
    //  return Imgs[this.id]
    //})

    try {
      SVGDoc = document.getElementById('svgdiv').children[0]

      if (SVGDoc == null && tela !== '') {
        return
      }

      WebSAGE.g_isInkscape =
        (SVGDoc.getAttributeNS(null, 'inkscape:version') ||
          SVGDoc.getAttributeNS(
            'http://www.inkscape.org/namespaces/inkscape',
            'version'
          )) != ''
      if (WebSAGE.g_isInkscape) {
        Color_BackgroundSVG = ScreenViewer_Background
      }

      // set bg color in HTML and SVG
      if (SVGDoc != null) WebSAGE.setBgColor(Color_BackgroundSVG)
    } catch (exception) {}

    if (true)
      WebSAGE.g_blinktimerID = setInterval(
        WebSAGE.timerBlink,
        WebSAGE.g_blinkperiod
      )

    // disable right click
    document.oncontextmenu = function () {
      return false
    }

    // make elements non selectable
    $('html > head').append(
      '<style> body { user-select:none; -webkit-user-select:none; } </style>'
    )

    if (typeof SVGDoc != 'undefined')
      if (SVGDoc != null) {
        SVGDoc.oncontextmenu = function () {
          return false
        }
      }

    document.body.style.overflowX = 'hidden'
    document.body.style.overflowY = 'hidden'

    // adjust SVG dimensions to max sizes
    if (typeof SVGDoc != 'undefined')
      if (SVGDoc != null) {
        SVGDoc.setAttributeNS(null, 'width', ScreenViewer_SVGMaxWidth)
        SVGDoc.setAttributeNS(null, 'height', ScreenViewer_SVGMaxHeight)

        // avoids selection of objects in SVG
        SVGDoc.onselectstart = new Function('return false;')
      }

    WebSAGE.g_zpW = ScreenViewer_SVGMaxWidth
    WebSAGE.g_zpH = ScreenViewer_SVGMaxHeight

    try {
      WebSAGE.preprocessSVGDisplay()
    } catch (err) {
      $('#SP_STATUS').text('Error!' + ' [0]')
      document.getElementById('SP_STATUS').title = err.stack
    }

    // mouse wheel zoom
    $(SVGDoc).bind('mousewheel wheel DOMMouseScroll', function (event) {
      if (window.wheelBlock === false) {
        if (
          event.originalEvent.wheelDelta > 0 ||
          event.originalEvent.detail < 0 ||
          event.originalEvent.deltaY < 0
        ) {
          // scroll up
          WebSAGE.zoomPan(
            window.wheelDirBackOut === true ? 12 : 18,
            null,
            event.originalEvent
          )
        } else {
          // scroll down
          WebSAGE.zoomPan(
            window.wheelDirBackOut === true ? 18 : 12,
            null,
            event.originalEvent
          )
        }
        if (window.wheelBlockEventPropagation) event.stopPropagation()
      }
    })

    // mouse drag to move display
    $(SVGDoc).bind('mousedown', function (event) {
      if (
        !event.originalEvent.isTrusted &&
        event.clientX === 80 &&
        event.clientY === 20
      )
        // artificial event?
        return
      window.MOUSEX = event.clientX
      window.MOUSEY = event.clientY
      window.SVGDoc.style.cursor = 'move'
    })
    $(SVGDoc).bind('mouseup', function (event) {
      if (
        !event.originalEvent.isTrusted &&
        event.clientX === 80 &&
        event.clientY === 20
      )
        // artificial event?
        return
      window.SVGDoc.style.cursor = 'default'
      if (typeof window.drgBlock === 'undefined') {
        if (window.MOUSEX > event.clientX)
          window.WebSAGE.zoomPan(3, (window.MOUSEX - event.clientX) / 30)
        else window.WebSAGE.zoomPan(5, (event.clientX - window.MOUSEX) / 30)
        if (window.MOUSEY > event.clientY)
          window.WebSAGE.zoomPan(1, (window.MOUSEY - event.clientY) / 20)
        else window.WebSAGE.zoomPan(7, (event.clientY - window.MOUSEY) / 20)
        if (window.drgObject) {
          // release object dragging
          window.drgObject.drgDragging = false
          window.drgObject.drgMouseOffsetX = 0
          window.drgObject.drgMouseOffsetY = 0
          window.drgObject = null
        }
      }
    })
  }, // init
} // WebSAGE

// useful shortcuts
var $V = WebSAGE.getValue
var $F = WebSAGE.getFlags
var $T = WebSAGE.getTime
var $W = WebSAGE
