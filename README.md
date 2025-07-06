![example workflow](https://github.com/eballo/catalunya-gmap/actions/workflows/build.yml/badge.svg) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=eballo_catalunya-gmap&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=eballo_catalunya-gmap)

# Interactive Map of Catalunya using OpenStreetMaps
Interactive map of Catalunya using OpenStreetMaps library.

<img src="https://github.com/eballo/catalunya-omap/blob/main/screenshot/screenshot-v5.png" alt="screen-shot" align="center" />

## Demo

[Demo](./demo.md)

# Marker cluster Info
https://github.com/Leaflet/Leaflet.markercluster

# Inspiration links
https://leafletjs.com/

# How to use this library

1. Add the following files to your html page

Inside the head tag at the end
``` html
    <!-- needed dependencies -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />

    <link href="https://fonts.googleapis.com/css?family=Droid+Serif" rel="stylesheet">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin=""/>
    <!-- Make sure you put this AFTER Leaflet's CSS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin="">
    </script>
    <link href="css/catalunya-omap.css" rel="stylesheet" type="text/css">
    
```

in your body
``` html

    <div id="container">
    
        <div id="primary-div" class="primary-div_big">
            <div id="map-container">
                <div id="omap"></div>
            </div>
        </div>
    
        <div id="secondary-div">
            <div id="error">
                <h2>No hi ha cap edificaci&oacute; disponible per aquesta comcarca</h2>
            </div>
            <input type="text" id="search-llista" placeholder="cercar..">
            <div id="list">
                <ul id="map-list"></ul>
            </div>
        </div>
        
    </div>
    ...
    <footer>
        <script type="text/javascript" src="assets/js/catalunya-omap/jquery-3.2.1.min.js"></script>
        <script type="text/javascript" src="assets/js/catalunya-omap/bootstrap.min.js"></script>
        <script type="text/javascript" src="assets/js/catalunya-omap/catalunya-omap-path.min.js"></script>
        <script type="text/javascript" src="assets/js/catalunya-omap/catalunya-omap.min.js"></script>
    </footer>
```

Inside the catalunya-omap-main we can find the important code :
``` javascript
    const monument = new MonumentBuilder('gMap');
    const mapManager = await monument.create()
```

## Versions

[Change log](./changelog.md)

## Development

Since version 1.0 uses [webpack](https://webpack.js.org/).

### Installation

#### Configuration

add a .env file and setup the required env variables. Check the `.env.sample` for 
more information, and create the following files: 
.env (local)
.env.production (production)

```
SERVER_HOST='http://localhost:9000/'
DEBUG=true
USER_POSITION=false
USE_MARKER_CLUSTER=true
```

NOTE: it is important that the server host ends with a '/' like in the sample.

Building the theme requires [node.js](http://nodejs.org/download/). We recommend you update to the latest version of npm: `npm install -g npm@latest`.

From the command line:

1. Navigate to the theme directory, then run `npm install`
3. Build `npm run buildLocal`
4. Start `npm run start`
5. (optional) buildWatch `npm run buildWatch` 

Open your browser [localhost:9000](http://localhost:9000/)

### Available node commands

* `test` 	   — run all the tests
* `testWatch`  — run all the tests while watching the changes of the files
* `buildLocal` — Compile (local) and optimize the files in your web directory
* `buildProd`  — Compile (production) and optimize the files in your web directory
* `buildWatch` — Compile (local) and optimize the files in your web directory and watch for changes to update the files
* `start`      — Starts  a web server

