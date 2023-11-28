import { PanelPlugin } from '@grafana/data';
import { ScadavisPanel } from './ScadavisPanel';
import { ScadavisPanelOptions } from './types';
import { UploadSVG } from './SvgFilePicker';

export const plugin = new PanelPlugin<ScadavisPanelOptions>(ScadavisPanel).setPanelOptions(builder => {
  return builder
    .addTextInput({
      path: 'svgUrl',
      name: 'SVG URL',
      description: 'Enter SVG URL',
      defaultValue: 'https://raw.githubusercontent.com/riclolsen/displayfiles/master/helloworld.svg',
    })
    .addCustomEditor({
      id: 'svgFileId',
      path: 'svgUrl',
      name: 'Upload local SVG file',
      editor: UploadSVG,
      defaultValue: 'https://raw.githubusercontent.com/riclolsen/displayfiles/master/helloworld.svg',
    })
    .addSliderInput({
      path: 'zoomLevel',
      name: 'SVG zoom level',
      description: 'Enter value <1 to shrink SVG view or >1 to grow it',
      defaultValue: 1,
      settings: {
        min: 0.1,
        max: 3,
        step: 0.1,
      },
    })
    .addSliderInput({
      path: 'moveByX',
      name: 'Horizontal offset',
      description: 'Enter value <0 to move left or >0 to move right',
      defaultValue: 0,
      settings: {
        min: -1000,
        max: 1000,
        step: 1,
      },
    })
    .addSliderInput({
      path: 'moveByY',
      name: 'Vertical offset',
      description: 'Enter value <0 to move up or >0 to move down',
      defaultValue: 0,
      settings: {
        min: -1000,
        max: 1000,
        step: 1,
      },
    })
    .addBooleanSwitch({
      path: 'autoResize',
      name: 'Auto resize',
      description: 'Bind SVG view size to panel size',
      defaultValue: false,
    })
    .addBooleanSwitch({
      path: 'showZoomPan',
      name: 'Show zoom/pan tool',
      description: 'Toolbar over SVG top-left corner with zoom/pan buttons',
      defaultValue: false,
    })
    .addBooleanSwitch({
      path: 'enableMousePan',
      name: 'Enable mouse pan',
      description: 'Pan the SVG view with mouse drag',
      defaultValue: false,
    })
    .addBooleanSwitch({
      path: 'enableMouseWheelZoom',
      name: 'Enable mouse wheel zoom',
      description: 'Zoom the SVG view with mouse wheel roll',
      defaultValue: false,
    });
});
