import L from 'leaflet';
import 'leaflet.markercluster';
import { CATALUNYA_POSITION } from "./catalunya-omap-styles";
import { stringToBoolean } from "./catalunya-omap-extra";

export default class MapManager {

    constructor(mapId) {
        this.debug = stringToBoolean(process.env.DEBUG);
        this.mapId = mapId;
        this.map = null;
        this.markers = [];
        this.clusterer = null;
        this.ListTextEnabled = true;
        this.visibleBuildings = true;
        this.useMarkerCluster = stringToBoolean(process.env.USE_MARKER_CLUSTER);
        this.arrayCategoriesText = [];
        this.icons = [];
        this.serverHost = process.env.SERVER_HOST;
    }

    async initMap() {
        const element = document.getElementById(this.mapId);
        this.map = L.map(element).setView([CATALUNYA_POSITION.lat, CATALUNYA_POSITION.lng], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; Catalunya Medieval'
        }).addTo(this.map);

        if (this.useMarkerCluster) {
            this.clusterer = L.markerClusterGroup({ showCoverageOnHover: false });
            this.map.addLayer(this.clusterer);
        }

        this._setLogoCatalunyaMedieval();
        this._setIconTextList();
        this._setRemoveAllIcons();
        return this.map;
    }

    addMarker(location) {
        const marker = this.createMarker(location);
        this.markers.push(marker);
        this.addContentToMarker(location, marker);
        this._createMarkerButton(marker, location);
    }

    getMarkers() {
        return this.markers;
    }

    addContentToMarker(location, marker) {
        if (location.content) {
            marker.bindPopup(location.content);
        }
    }

    createMarker(location) {
        const icon = location.icon ? L.icon({ iconUrl: location.icon, iconSize: [32, 32] }) : undefined;
        const marker = L.marker([location.lat, location.lng], {
            title: location.title,
            icon: icon
        });
        marker.category = location.category;
        marker.visible = location.visible;

        if (this.useMarkerCluster && this.clusterer) {
            this.clusterer.addLayer(marker);
        } else {
            marker.addTo(this.map);
        }

        return marker;
    }

    resize() {
        this.map.invalidateSize();
        if (this.markers.length === 0) {
            this.map.setView([CATALUNYA_POSITION.lat, CATALUNYA_POSITION.lng], 8);
        }
    }

    _createMarkerButton(marker, opts) {
        const ul = document.getElementById("map-list");
        if (!this._exist(opts.category)) {
            this.arrayCategoriesText.push(opts.category);
            const liCategory = document.createElement("li");
            liCategory.innerHTML = opts.categoryName;
            liCategory.setAttribute("class", opts.category + " header");
            ul.appendChild(liCategory);
        }

        const li = document.createElement("li");
        li.innerHTML = opts.title;
        li.setAttribute("class", opts.category);
        ul.appendChild(li);

        li.addEventListener("click", () => {
            this.map.setView(marker.getLatLng(), 15);
            marker.openPopup();
        });

        li.addEventListener("mouseover", () => {
            if (opts.icon2) marker.setIcon(L.icon({ iconUrl: opts.icon2, iconSize: [32, 32] }));
        });

        li.addEventListener("mouseout", () => {
            if (opts.icon) marker.setIcon(L.icon({ iconUrl: opts.icon, iconSize: [32, 32] }));
        });
    }

    _exist(item) {
        return this.arrayCategoriesText.includes(item);
    }

    _setRemoveAllIcons() {
        const control = L.control({ position: 'topright' });
        control.onAdd = () => {
            const div = L.DomUtil.create('div');
            div.innerHTML = `<img id="visibleBuildings" src="${this.serverHost}images/catalunya-gmap/gmap/06.png" width="32" height="32" />`;
            div.style.cursor = 'pointer';
            div.onclick = () => {
                this.visibleBuildings = !this.visibleBuildings;
                this._changeVisibility(this.visibleBuildings);
                const number = this.visibleBuildings ? "06" : "05";
                document.getElementById("visibleBuildings").src = `${this.serverHost}images/catalunya-gmap/gmap/${number}.png`;
            };
            return div;
        };
        control.addTo(this.map);
    }

    _createIcon(edifici) {
        const control = L.control({ position: 'topright' });
        control.onAdd = () => {
            const div = L.DomUtil.create('div');
            div.innerHTML = `<img id="img-${edifici.category}" src="${edifici.icon}" alt="${edifici.title}" style="cursor: pointer" />`;
            div.onclick = () => {
                edifici.visible = !edifici.visible;
                this._setVisible(edifici.category, edifici.visible);
                document.getElementById(`img-${edifici.category}`).style.opacity = edifici.visible ? '1' : '0.5';
            };
            return div;
        };
        control.addTo(this.map);
    }

    addIcon(edifici) {
        this._createIcon(edifici);
        this.icons.push(edifici);
    }

    _changeVisibility(visibility) {
        this.icons.forEach(edifici => {
            edifici.visible = visibility;
            this._setVisible(edifici.category, visibility);
        });
    }

    _setLogoCatalunyaMedieval() {
        const logo = L.control({ position: 'bottomleft' });
        logo.onAdd = () => {
            const div = L.DomUtil.create('div');
            div.innerHTML = `<img src="${this.serverHost}images/catalunya-gmap/logo/logoCM-red-mini.png" />`;
            return div;
        };
        logo.addTo(this.map);
    }

    _setIconTextList() {
        const control = L.control({ position: 'topright' });
        control.onAdd = () => {
            const div = L.DomUtil.create('div');
            div.innerHTML = `<img id="llistat" src="${this.serverHost}images/catalunya-gmap/gmap/03.png" width="42" height="42" style="cursor: pointer" />`;
            div.onclick = () => {
                document.getElementById("primary-div").classList.toggle("primary-div");
                document.getElementById("secondary-div").classList.toggle();
                this.ListTextEnabled = !this.ListTextEnabled;
                const number = this.ListTextEnabled ? "04" : "03";
                document.getElementById("list").src = `${this.serverHost}images/catalunya-gmap/gmap/${number}.png`;
                this.resize();
            };
            return div;
        };
        control.addTo(this.map);
    }

    _setVisible(category, visible) {
        this.markers.forEach(marker => {
            if (marker.category === category) {
                if (visible) {
                    if (this.useMarkerCluster && this.clusterer && !this.clusterer.hasLayer(marker)) {
                        this.clusterer.addLayer(marker);
                    } else {
                        marker.addTo(this.map);
                    }
                } else {
                    if (this.useMarkerCluster && this.clusterer && this.clusterer.hasLayer(marker)) {
                        this.clusterer.removeLayer(marker);
                    } else {
                        this.map.removeLayer(marker);
                    }
                }
            }
        });
    }

    addAllMarkersToCluster() {
        if (!this.clusterer) {
            this.clusterer = L.markerClusterGroup();
            this.map.addLayer(this.clusterer);
        } else {
            this.clusterer.clearLayers();
        }

        this.markers.forEach(marker => {
            this.clusterer.addLayer(marker);
        });
    }

}
