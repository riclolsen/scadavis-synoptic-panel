// SCADAVis.io Synoptic Panel for Grafana
// © 2023 Ricardo L. Olsen / DSC Systems

import { PanelProps } from '@grafana/data';
import React, { useEffect, useMemo } from 'react';
import { ScadavisPanelOptions } from 'types';
import * as synopticapi from './synoptic';

const svObjs: synopticapi.ScadaVis[] = [];
const svState: svStateT[] = [];
type tagValuesT = Record<string, number>;
type svStateT = {
  svId: string;
  svReactElem: any;
  dashboardUID: string;
  lastOptions: ScadavisPanelOptions;
};

// replacement for crypt.randomUUID (that is only available for https context)
// https://stackoverflow.com/a/2117523/2800218
// LICENSE: https://creativecommons.org/licenses/by-sa/4.0/legalcode
function _randomUUID(): string {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

// apply zoom, etc. to the SVG view
function doAdjusts(options: ScadavisPanelOptions, svgraph: synopticapi.ScadaVis) {
  svgraph.zoomToOriginal();
  svgraph.moveBy(-options.moveByX, -options.moveByY);
  const el = svgraph.getIframe()?.parentElement?.parentElement;
  if (el && el.clientWidth > 0 && el.clientHeight > 0) {
    const iframe = svgraph.getIframe();
    if (iframe) {
      iframe.width = '' + (el.clientWidth - 5);
      iframe.height = '' + (el.clientHeight - 5);
    }
    if (options.autoResize) {
      svgraph.zoomTo(
        options.zoomLevel * (el.clientWidth < el.clientHeight ? el.clientWidth / 250 : el.clientHeight / 250)
      );
    } else {
      svgraph.zoomTo(options.zoomLevel);
    }
  } else {
    svgraph.zoomTo(options.zoomLevel);
  }
}

// update for edit mode (will have 2 parent elements for the scadavis div)
function updatePanels(
  options: ScadavisPanelOptions,
  svgraph: synopticapi.ScadaVis,
  objInd: number,
  tagValues: tagValuesT
) {
  const elms = document.querySelectorAll("[id='" + svState[objInd].svId + "']");
  const iframe = svgraph.getIframe();
  for (let i = 0; iframe && i < elms.length; i++) {
    if (elms[i].firstChild !== iframe) {
      elms[i].appendChild(iframe);
      svgraph.on('ready', () => {
        svgraph.enableMouse(options.enableMousePan, options.enableMouseWheelZoom);
        svgraph.enableTools(options.showZoomPan, options.showZoomPan);
        svgraph.zoomToOriginal();
        svgraph.moveBy(-options.moveByX, -options.moveByY);
        const el = iframe.parentElement?.parentElement;
        if (el) {
          svgraph.panelContainerResizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
              if (entry.contentRect) {
                doAdjusts(options, svgraph);
              }
            }
          });
          svgraph.panelContainerResizeObserver.observe(el);
        }
        if (el && el.clientWidth > 0 && el.clientHeight > 0) {
          iframe.width = '' + (el.clientWidth - 5);
          iframe.height = '' + (el.clientHeight - 5);
          if (options.autoResize) {
            svgraph.zoomTo(
              options.zoomLevel * (el.clientWidth < el.clientHeight ? el.clientWidth / 250 : el.clientHeight / 250)
            );
          } else {
            svgraph.zoomTo(options.zoomLevel);
          }
        } else {
          svgraph.zoomTo(options.zoomLevel);
        }
        svgraph.updateValues(tagValues);
      });
    }
  }

  // changed options, apply new zoom etc.
  if (JSON.stringify(svState[objInd].lastOptions) !== JSON.stringify(options)) {
    doAdjusts(options, svObjs[objInd]);
    svState[objInd].lastOptions = Object.assign(options);
  }
  svgraph.updateValues(tagValues);
}

export const ScadavisPanel: React.FC<PanelProps<ScadavisPanelOptions>> = ({
  options,
  data,
  width,
  height,
  onOptionsChange,
}) => {
  // maps tag values
  const tagValues = useMemo((): tagValuesT => {
    return {};
  }, []);
  let cntMappedFields = 0;
  for (let i = 0; i < data.series.length; i++) {
    const s = data.series[i];
    for (let j = 0; j < s.fields.length; j++) {
      const f = s.fields[j];
      if (f.type !== 'number' || f.values.length === 0) {
        continue;
      }
      cntMappedFields++;
      tagValues['@' + cntMappedFields] = f.values[f.values.length - 1];
      if (f.name) {
        const values = f.values as any;
        if (values.buffer) {
          tagValues['@' + cntMappedFields] = values.buffer[values.buffer.length - 1];
          tagValues[f.name] = values.buffer[values.buffer.length - 1];
        } else {
          tagValues['@' + cntMappedFields] = values[f.values.length - 1];
          tagValues[f.name] = f.values[values.length - 1];
        }
      }
    }
  }

  const objInd = data.request?.panelId || -1;
  const firstExec = !(objInd in svObjs) || !document.getElementById(svObjs[objInd].container.id);
  if (firstExec) {
    // first execution: create object to save current state
    let lastOptions: ScadavisPanelOptions = {
      svgUrl: '',
      zoomLevel: -1,
      moveByX: -999999,
      moveByY: -999999,
      autoResize: false,
      showZoomPan: false,
      enableMousePan: false,
      enableMouseWheelZoom: false,
    };
    if (objInd in svState) {
      lastOptions = svState[objInd].lastOptions;
      if (svState[objInd].dashboardUID === data?.request?.dashboardUID) {
        options.svgUrl = lastOptions.svgUrl;
      }
    }
    const svId = 'scadavis_' + _randomUUID();
    svState[objInd] = {
      svId: svId,
      svReactElem: React.createElement('div', { id: svId }),
      dashboardUID: data?.request?.dashboardUID as string,
      lastOptions: lastOptions,
    };
  }

  if (!firstExec && options.svgUrl === svState[objInd].lastOptions.svgUrl) {
    // check edit mode (will have 2 parent elements for the scadavis div)
    const svgraph = svObjs[objInd];
    updatePanels(options, svgraph, objInd, tagValues);
  }

  if (!firstExec) {
    // new SVG file (loaded as URL or from URL)?
    if (options.svgUrl !== svState[objInd].lastOptions.svgUrl) {
      svObjs[objInd].getIframe()?.remove();
      const svgraph = new synopticapi.ScadaVis({
        container: svState[objInd].svId,
        iframeparams: `frameborder="0" height="${height}" width="${width}"`,
        svgurl: options.svgUrl,
      } as synopticapi.SvArgs);
      if (svgraph) {
        svObjs[objInd] = svgraph;
        const iframe = svgraph.getIframe();
        if (iframe) {
          document.getElementById(svObjs[objInd].container.id)?.appendChild(iframe);
        }
      }
      svState[objInd].lastOptions = Object.assign(options);
      updatePanels(options, svgraph, objInd, tagValues);
    }
  }

  useEffect(() => {
    // at first execution, after the react object created (id=svState[objInd].svId),
    // will create the scadavis object with the react object as the parent
    if (!(objInd in svObjs) || !document.getElementById(svObjs[objInd].container.id)) {
      const svgraph = new synopticapi.ScadaVis({
        container: svState[objInd].svId,
        iframeparams: `frameborder="0" height="${height}" width="${width}"`,
        svgurl: options.svgUrl,
      } as synopticapi.SvArgs);
      svObjs[objInd] = svgraph;
      svState[objInd].lastOptions = Object.assign(options);
      if (svgraph) {
        svgraph.on('ready', () => {
          svgraph.enableMouse(options.enableMousePan, options.enableMouseWheelZoom);
          svgraph.enableTools(options.showZoomPan, options.showZoomPan);
          svgraph.moveBy(-options.moveByX, -options.moveByY);
          const el = svgraph.getIframe()?.parentElement?.parentElement;
          if (el && el.clientWidth > 0 && el.clientHeight > 0) {
            svgraph.panelContainerResizeObserver = new ResizeObserver((entries) => {
              for (const entry of entries) {
                if (entry.contentRect) {
                  doAdjusts(options, svgraph);
                }
              }
            });
            svgraph.panelContainerResizeObserver.observe(el);
            if (options.autoResize) {
              svgraph.zoomTo(
                options.zoomLevel * (el.clientWidth < el.clientHeight ? el.clientWidth / 250 : el.clientHeight / 250)
              );
            } else {
              svgraph.zoomTo(options.zoomLevel);
            }
          }
          svgraph.updateValues(tagValues);
        });
      }
    }
  }, [options, tagValues, objInd, height, width]);

  return svState[objInd].svReactElem;
};
