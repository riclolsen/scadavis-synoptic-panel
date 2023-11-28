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

WebSAGE.getJSONData = function () {
  $.ajax({
    // crossDomain: true,
    url: 'jsondatasimul.php?KEYS=' + WebSAGE.lstpnt + '&RAND=' + Math.random(),
    dataType: 'text',
    success: WebSAGE.getJSONData_onSuccess,
    headers: {
      // 'Authorization':'Bearer ' + authData.token,
      'Content-Type': 'application/json',
    },
  })
}

WebSAGE.getJSONData_onSuccess = function (data) {
  let i,
    j,
    k,
    vars,
    nponto,
    tag,
    intnum,
    oor,
    range,
    vstr1,
    vstr2,
    vbool1,
    vbool2,
    vnumb1,
    vnumb2,
    value,
    qual,
    ts,
    desc,
    cntpnt,
    digital,
    obj

  if (typeof data === 'string') obj = JSON.parse(data)
  else if (typeof data === 'object') obj = data

  if (obj.hasOwnProperty('data')) {
    // API OAS over JSON API
    obj = obj.data
  }
  if (obj.hasOwnProperty('tags')) {
    // API OAS
    for (i = 0; i < obj.tags.length; i++) {
      vars = obj.tags[i]
      tag = vars.path

      if (!vars.hasOwnProperty('type'))
        vars.type = typeof vars.val == 'bool' ? 'bool' : 'float'

      if (!vars.hasOwnProperty('quality')) vars.quality = true

      if (!vars.hasOwnProperty('parameters')) vars.parameters = {}
      if (!vars.parameters.hasOwnProperty('Value')) vars.parameters.Value = {}
      if (!vars.parameters.hasOwnProperty('HighAlarmLimit'))
        vars.parameters.HighAlarmLimit = {}
      if (!vars.parameters.hasOwnProperty('LowAlarmLimit'))
        vars.parameters.LowAlarmLimit = {}

      intnum = parseInt(vars.parameters.Value.TagClientItem) || NaN
      if (!isNaN(intnum) && intnum !== 0) nponto = intnum
      else nponto = i + 1 // if point key not defined, assume the order as key

      NPTS[tag] = nponto
      TAGS[nponto] = tag
      DCRS[nponto] = vars.parameters.Value.Desc || tag
      SUBS[nponto] = vars.parameters.Value.LocationLevel0 || ''
      BAYS[nponto] = vars.parameters.Value.LocationLevel1 || ''
      T[nponto] = vars.parameters.Value.TimeStamp || new Date().getTime()
      ANOTS[nponto] = vars.parameters.Value.BlockingAnnotation || ''

      if (vars.type === 'float') {
        // analog value
        LIMSUPS[nponto] = parseFloat(
          vars.parameters.HighAlarmLimit.Value || Number.POSITIVE_INFINITY
        )
        LIMINFS[nponto] = parseFloat(
          vars.parameters.LowAlarmLimit.Value || Number.NEGATIVE_INFINITY
        )
        V[nponto] = vars.value
        F[nponto] = vars.quality ? 0x20 : 0x20 | 0x80
      } else if (vars.type === 'bool') {
        // digital state
        STONS[nponto] =
          vars.parameters.Value.DigitalAlarmTextAppendTrue || '_TRUE_'
        STOFS[nponto] =
          vars.parameters.Value.DigitalAlarmTextAppendFalse || '_FALSE_'
        F[nponto] = vars.quality ? 0x00 : 0x80
        if (vars.value) {
          // ON
          V[nponto] = 0
          F[nponto] = F[nponto] | 0x02
        } else {
          // OFF
          V[nponto] = 1
          F[nponto] = F[nponto] | 0x01
        }
        oor = vars.parameters.Value.OutOfRange || 0
        if (oor !== 0) {
          // out of range translate to double point binary 00 or 11
          V[nponto] = vars.value ? 1 : 0
          F[nponto] = F[nponto] | vars.value ? 0x03 : 0x00
        }
      } else if (vars.type === 'string') {
        // string value
        LIMSUPS[nponto] = parseFloat(
          vars.parameters.HighAlarmLimit.Value || Number.POSITIVE_INFINITY
        )
        LIMINFS[nponto] = parseFloat(
          vars.parameters.LowAlarmLimit.Value || Number.NEGATIVE_INFINITY
        )
        V[nponto] = vars.value
        F[nponto] = vars.quality ? 0x00 : 0x80
      }

      F[nponto] =
        F[nponto] | (vars.parameters.Value.Alarmed | false ? 0x100 : 0)
    }
  }

  if (obj.hasOwnProperty('valueRanges')) {
    // Google Sheets
    cntpnt = 0
    for (i = 0; i < obj.valueRanges.length; i++) {
      range = obj.valueRanges[i]

      // majorDimension must be ROWS (but can not be present on data)
      if (
        !range.hasOwnProperty('majorDimension') ||
        range.majorDimension === 'ROWS'
      ) {
        for (j = 0; j < range.values.length; j++) {
          vars = range.values[j]

          value = null
          qual = true
          ts = null
          tag = null
          desc = null
          vnumb1 = null
          vnumb2 = null
          vbool1 = null
          vbool2 = null
          vstr1 = null
          vstr2 = null
          digital = false
          for (k = 0; k < vars.length; k++) {
            switch (typeof vars[k]) {
              case 'boolean': // use as quality
                if (vbool1 !== null && vbool2 === null) vbool2 = vars[k]
                if (vbool1 === null) vbool1 = vars[k]
                break
              case 'number': // use as value or timestamp
                if (vnumb1 !== null && vnumb2 === null) vnumb2 = vars[k]
                if (vnumb1 === null) vnumb1 = vars[k]
                break
              case 'string': // use as tag (as long as dont repeat)
                if (vstr1 !== null && vstr2 === null) vstr2 = vars[k]
                if (vstr1 === null) vstr1 = vars[k]
                break
              default:
                break
            }
          }

          // first try to find a value
          if (vnumb1 !== null) {
            value = vnumb1
            if (vstr1 !== null && isNaN(parseFloat(vstr1)))
              // so tag can be the first string
              tag = vstr1
            else if (vstr2 !== null && isNaN(parseFloat(vstr2)))
              // or the second string
              tag = vstr2
          } else {
            // cant find a type number, then try to use the string as value if possible
            if (!isNaN(parseFloat(vstr1))) {
              value = parseFloat(vstr1) // a number
              if (vstr2 !== null && isNaN(parseFloat(vstr2)))
                // so tag can be the second string
                tag = vstr2
            } // try the reverse
            else if (!isNaN(parseFloat(vstr2))) {
              value = parseFloat(vstr2) // a number
              if (vstr1 !== null && isNaN(parseFloat(vstr1)))
                // so tag can be the firts string
                tag = vstr1
            }
          }

          // if dont have a value but has 1 or 2 bools, the first is value and the second is quality (digital point)
          if (value === null && vbool1 !== null) {
            value = vbool1 ? 1 : 0
            digital = true
            if (vbool2 !== null) qual = vbool2
          } else {
            // has value
            if (vbool1 !== null)
              // so bool is quality
              qual = vbool1
            // a second nember may be a timestamp
            if (vnumb2 !== null) {
              ts = vnumb2
            }
          }

          if (tag === null || tag === '') {
            // could not find a tag
            tag = vars.range + '-' + (j + 1) // use range and the row number for the range
          } else {
            // has tag, second string can be a description
            if (vstr2 !== null) desc = vstr2
          }

          nponto = ++cntpnt

          NPTS[tag] = nponto
          TAGS[nponto] = tag
          DCRS[nponto] = desc || tag
          SUBS[nponto] = vars.range
          BAYS[nponto] = ''
          T[nponto] = ts || new Date().getTime()
          ANOTS[nponto] = ''

          if (!digital) {
            // analog value
            LIMSUPS[nponto] = 999999999
            LIMINFS[nponto] = -999999999
            V[nponto] = value
            F[nponto] = qual ? 0x00 : 0x80
          } else {
            // digital state
            STONS[nponto] = '_TRUE_'
            STOFS[nponto] = '_FALSE_'
            F[nponto] = vars.quality ? 0x20 : 0x20 | 0x80
            if (value) {
              // ON
              V[nponto] = 0
              F[nponto] = F[nponto] | 0x02
            } else {
              // OFF
              V[nponto] = 1
              F[nponto] = F[nponto] | 0x01
            }
          }
        }
      }
    }
  }

  if (obj.hasOwnProperty('type') && obj.type === 'zoomTo') {
    if (SVGDoc === null) return
    let tx = 0,
      ty = 0

    if (typeof obj.target === 'string' && SVGDoc.getElementById(obj.target)) {
      tx =
        SVGDoc.getElementById(obj.target).getBBox().x +
        SVGDoc.getElementById(obj.target).getBBox().width / 2
      ty =
        SVGDoc.getElementById(obj.target).getBBox().y +
        SVGDoc.getElementById(obj.target).getBBox().height / 2
    } else if (typeof obj.target === 'object') {
      tx = obj.target.x || 0
      ty = obj.target.y || 0
    }

    let w = WebSAGE.g_zpW / obj.zoomLevel
    let h = WebSAGE.g_zpH / obj.zoomLevel
    let x =
      WebSAGE.g_zpX -
      (w - WebSAGE.g_zpW) * ((tx - WebSAGE.g_zpX) / WebSAGE.g_zpW)
    let y =
      WebSAGE.g_zpY -
      (h - WebSAGE.g_zpH) * ((ty - WebSAGE.g_zpY) / WebSAGE.g_zpH)

    WebSAGE.g_zpX = x
    WebSAGE.g_zpY = y
    WebSAGE.g_zpW = w
    WebSAGE.g_zpH = h
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
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'moveBy') {
    if (SVGDoc === null) return
    WebSAGE.g_zpX += obj.dx
    WebSAGE.g_zpY += obj.dy
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
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'zoomToOriginal') {
    if (SVGDoc === null) return
    WebSAGE.g_zpX = 0
    WebSAGE.g_zpY = 0
    WebSAGE.g_zpW = ScreenViewer_SVGMaxWidth
    WebSAGE.g_zpH = ScreenViewer_SVGMaxHeight
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
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'enableTools') {
    document.getElementById('ZOOMIN_ID').style.display = obj.zoomEnabled
      ? ''
      : 'none'
    document.getElementById('ZOOMOUT_ID').style.display = obj.zoomEnabled
      ? ''
      : 'none'
    document.getElementById('MOVE_ID').style.display = obj.panEnabled
      ? ''
      : 'none'
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'enableMouse') {
    if (obj.panEnabled === false) window.drgBlock = true
    else delete window.drgBlock
    if (obj.zoomEnabled === false) window.wheelBlock = true
    else window.wheelBlock = false
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'setMouseWheel') {
    if (obj.directionBackOut === true) window.wheelDirBackOut = true
    else delete window.wheelDirBackOut
    if (obj.blockEventPropagation === true)
      window.wheelBlockEventPropagation = true
    else delete window.wheelBlockEventPropagation
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'enableKeyboard') {
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'enableAlarmFlash') {
    if (obj.alarmFlashEnabled)
      WebSAGE.timerBlink = function () {
        requestAnimationFrame(WebSAGE.timerBlinkDraw)
      }
    else WebSAGE.timerBlink = function () {}
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'hideWatermark') {
    document.getElementById('WATERMARK').style.display = 'none'
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'setColor') {
    if (
      'colorNumber' in obj &&
      typeof obj.colorNumber === 'number' &&
      'colorCode' in obj &&
      typeof obj.colorCode === 'string'
    ) {
      if (obj.colorNumber == -1) WebSAGE.setBgColor(obj.colorCode)
      else ScreenViewer_ColorTable[obj.colorNumber] = obj.colorCode
    }
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'setColors') {
    if ('colorsTable' in obj && typeof obj.colorsTable === 'object') {
      for (const colorNumber in obj.colorsTable) {
        if (colorNumber === -1)
          WebSAGE.setBgColor(obj.colorsTable[colorNumber])
        else ScreenViewer_ColorTable[colorNumber] = obj.colorsTable[colorNumber]
      }
    }
    return
  }

  if (obj.hasOwnProperty('type') && obj.type === 'resetData') {
    if (SVGDoc === null) return
    TAGS = []
    NPTS = []
    SUBS = []
    BAYS = []
    DCRS = []
    ANOTS = []
    STONS = []
    STOFS = []
    LIMSUPS = []
    LIMINFS = []
  }

  //if (obj.hasOwnProperty("type") && obj.type==="enableValueChangeAnimation") {
  //  if (SVGDoc === null)
  //    return;
  //  window.enableValueChangeAnimation = obj.animEnabled;
  //}

  let error = null
  try {
    WebSAGE.showValsSVG()
  } catch (e) {
    error = e
  }

  // respond with a JSON API object http://jsonapi.org
  const resp = {
    data: {
      type: 'updated',
      id: '4',
      handle: obj.handle,
      attributes: {
        version: Version,
      },
      error: error,
      links: {
        self: 'http://scadavis.io/synoptic/synoptic.html',
      },
    },
    meta: Meta,
    jsonapi: {
      version: '1.0',
    },
  }
  parent.postMessage(resp, '*')
}

