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
        this.ListTextEnabled = false;
        this.visibleBuildings = true;
        this.useMarkerCluster = stringToBoolean(process.env.USE_MARKER_CLUSTER);
        this.arrayCategoriesText = [];
        this.icons = [];
        const _cfg = (typeof catalunyaOmapConfig !== 'undefined') ? catalunyaOmapConfig : {};
        this.serverHost = _cfg.serverHost || process.env.SERVER_HOST;
        this.secondaryDivId = _cfg.secondaryDivId || 'secondaryDiv';
        this.listId = _cfg.listId || 'map-list';
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
        this._setFullscreenControl();
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
            marker.bindPopup(location.content, { closeButton: false });
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

    resetView() {
        this.map.setView([CATALUNYA_POSITION.lat, CATALUNYA_POSITION.lng], 8);
    }

    _createMarkerButton(marker, opts) {
        const ul = document.getElementById(this.listId);
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
            div.innerHTML = `<img id="visibleBuildings" src="${this.serverHost}images/controls/06.png" width="32" height="32" />`;
            div.style.cursor = 'pointer';
            div.onclick = () => {
                this.visibleBuildings = !this.visibleBuildings;
                this._changeVisibility(this.visibleBuildings);
                const number = this.visibleBuildings ? "06" : "05";
                document.getElementById("visibleBuildings").src = `${this.serverHost}images/controls/${number}.png`;
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

    _setFullscreenControl() {
        const control = L.control({ position: 'topleft' });
        control.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-fullscreen');
            const btn = L.DomUtil.create('a', '', div);
            btn.href = '#';
            btn.title = 'Pantalla completa';
            btn.setAttribute('role', 'button');
            btn.innerHTML = this._fullscreenExpandIcon();

            L.DomEvent.on(btn, 'click', (e) => {
                L.DomEvent.preventDefault(e);
                L.DomEvent.stopPropagation(e);
                if (!document.fullscreenElement) {
                    map.getContainer().requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            });

            document.addEventListener('fullscreenchange', () => {
                btn.innerHTML = document.fullscreenElement
                    ? this._fullscreenCompressIcon()
                    : this._fullscreenExpandIcon();
                map.invalidateSize();
            });

            return div;
        };
        control.addTo(this.map);
    }

    _fullscreenExpandIcon() {
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
        </svg>`;
    }

    _fullscreenCompressIcon() {
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
            <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
        </svg>`;
    }

    _setLogoCatalunyaMedieval() {
        const logo = L.control({ position: 'bottomleft' });
        logo.onAdd = () => {
            const div = L.DomUtil.create('div');
            div.innerHTML = `<img src="${this.serverHost}images/logo/logoCM-red-mini.png" />`;
            return div;
        };
        logo.addTo(this.map);
    }

    _setIconTextList() {
        const control = L.control({ position: 'topright' });
        control.onAdd = () => {
            const div = L.DomUtil.create('div');
            div.innerHTML = `<img id="llistat" src="${this.serverHost}images/controls/03.png" width="42" height="42" style="cursor: pointer" />`;
            div.onclick = () => {
                this.ListTextEnabled = !this.ListTextEnabled;
                const number = this.ListTextEnabled ? "04" : "03";
                const llistat = document.getElementById("llistat");
                if (llistat) llistat.src = `${this.serverHost}images/controls/${number}.png`;
                const secondaryDiv = document.getElementById(this.secondaryDivId);
                if (secondaryDiv) secondaryDiv.style.display = this.ListTextEnabled ? '' : 'none';
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
