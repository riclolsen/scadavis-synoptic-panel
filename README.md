## Powerful SCADA-like synoptic graphics panel for Grafana

This panel plugin allows unleashing the power of SCADA-like graphics in Grafana.

The SCADAvis.io online service provides an incredibly powerful SVG Editor that can be used to create free-form graphics animated with Grafana data.

Learn how to obtain and use the SCADAvis.io editor [here](https://scadavis.io).

In the SVG file variables, should be marked with tags that match metrics or aliases in Grafana data queries.

## Screenshots

![Power](https://raw.githubusercontent.com/riclolsen/displayfiles/master/scadavis-power.png?raw=true)
![Options](https://raw.githubusercontent.com/riclolsen/displayfiles/master/scadavis-options.png?raw=true)
![Speedometer](https://raw.githubusercontent.com/riclolsen/displayfiles/master/scadavis-speedometer.png?raw=true)
![Donuts](https://raw.githubusercontent.com/riclolsen/displayfiles/master/scadavis-donuts-radar.png?raw=true)

## Installation

Use the new grafana-cli tool to install scadavis-synoptic-panel from the commandline:

```
grafana-cli plugins install scadavis-synoptic-panel
```

The plugin will be installed into your grafana plugins directory; the default is /var/lib/grafana/plugins if you installed the grafana package.

More instructions on the cli tool can be found [here](http://docs.grafana.org/v3.0/plugins/installation/).

You need the lastest grafana build for Grafana 3.0 to enable plugin support. You can get it here : http://grafana.org/download/builds.html

## Alternative installation method

It is also possible to clone this repo directly into your plugins directory.

Afterwards restart grafana-server and the plugin should be automatically detected and used.

```
git clone https://github.com/riclolsen/scadavis-synoptic-panel.git
sudo service grafana-server restart
```


## Clone into a directory of your choice

If the plugin is cloned to a directory that is not the default plugins directory then you need to edit your grafana.ini config file (Default location is at /etc/grafana/grafana.ini) and add this:

```ini
[plugin.scadavissynoptic]
path = /home/your/clone/dir/scadavis-synoptic-panel
```

Note that if you clone it into the grafana plugins directory you do not need to add the above config option. That is only
if you want to place the plugin in a directory outside the standard plugins directory. Be aware that grafana-server
needs read access to the directory.

# Changelog

## 1.0.1

* Revised version. Watermark removed.

## 1.0.0

* Initial version.



