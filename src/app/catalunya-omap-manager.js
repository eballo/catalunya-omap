import L from 'leaflet';
import 'leaflet.markercluster';
import { CATALUNYA_POSITION } from "./catalunya-omap-styles";
import { stringToBoolean, fetchMapData } from "./catalunya-omap-extra";

// Same breakpoint as the Catalunya Medieval theme's phone layout.
const PHONE_QUERY = '(max-width: 600px)';

// The map of a page about one building (selectMarker() was called). On a
// phone its CSS folds the category buttons behind a «Capes» button, and the
// «Capes» button toggles the second class.
const ENTRY_MAP_CLASS = 'cm-omap--entry';
const LAYERS_OPEN_CLASS = 'cm-omap--layers-open';
// Any map whose host asked for foldLayers: the category buttons are folded
// behind «Capes» whatever the screen, and the host's own legend toggles the
// four groups (setGroupVisible()).
const FOLDED_CLASS = 'cm-omap--folded';
// Fired on document after a group is switched, so a legend outside the map
// can show which groups are on.
export const GROUPS_CHANGED_EVENT = 'cm-omap:groups-changed';

// «Localitza'm»: never zoomed out of a closer view, and a fix a minute old is
// good enough to centre a map.
const LOCATE_ZOOM = 13;
const LOCATE_OPTIONS = { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 };
const LOCATE_MESSAGE_MS = 5000;

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
        // Opt-in: the host page decides, because its Permissions-Policy has to
        // allow geolocation there too or the browser refuses without asking.
        this.locateButton = _cfg.locateButton === true;
        this.foldLayers = _cfg.foldLayers === true;
        // Opt-in: a visible way into the search that lives in the side list.
        this.searchButton = _cfg.searchButton === true;
        this._pendingFit = null;
        this.comarcaBoundariesLayer = null;
    }

    async initMap() {
        const element = document.getElementById(this.mapId);
        this.map = L.map(element).setView([CATALUNYA_POSITION.lat, CATALUNYA_POSITION.lng], 8);
        // OSM's tile usage policy requires crediting its contributors.
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">col·laboradors d\'OpenStreetMap</a> · &copy; Catalunya Medieval'
        }).addTo(this.map);
        this._setPaperOverlay();

        if (this.useMarkerCluster) {
            this.clusterer = L.markerClusterGroup({ showCoverageOnHover: false });
            this.map.addLayer(this.clusterer);
        }

        this._setLogoCatalunyaMedieval();
        this._setFullscreenControl();
        this._setIconTextList();
        this._setRemoveAllIcons();
        this._setLayersControl();
        this._foldLayersIfAsked();
        this._setCompassRose();
        if (this.locateButton) {
            this._setLocateControl();
        }
        if (this.searchButton) {
            this._setSearchControl();
        }
        return this.map;
    }

    // Parchment texture, vignette and frame over the tiles but under the
    // comarques, markers and popups. It needs a pane of its own: a CSS overlay
    // on the container can only go above or below the whole map, and the
    // multiply blend has to sit in the same stacking context as the tiles.
    // The pane moves with the map, so the sheet is pinned back to the
    // viewport on every move.
    _setPaperOverlay() {
        const pane = this.map.createPane('paper');
        const sheet = L.DomUtil.create('div', 'cm-omap-paper', pane);
        const fit = () => {
            const size = this.map.getSize();
            L.DomUtil.setPosition(sheet, this.map.containerPointToLayerPoint([0, 0]));
            sheet.style.width = `${size.x}px`;
            sheet.style.height = `${size.y}px`;
        };
        this.map.on('move zoomend viewreset resize', fit);
        fit();
    }

    // Bottom left, stacked above the logo: the right edge belongs to the
    // category icons, which wrap into as many columns as they need.
    _setCompassRose() {
        const control = L.control({ position: 'bottomleft' });
        control.onAdd = () => {
            const div = L.DomUtil.create('div', 'cm-omap-compass');
            div.setAttribute('aria-hidden', 'true');
            div.innerHTML = this._compassRoseSvg();
            return div;
        };
        control.addTo(this.map);
    }

    // Eight-point rose: the cardinal points long, the diagonals short, each
    // point split into a dark and a light half like an engraved chart.
    _compassRoseSvg() {
        const point = (angle, length, width) => `<g transform="rotate(${angle})">
            <polygon class="cm-omap-compass-dark" points="0,-${length} -${width},-${width} 0,0"/>
            <polygon class="cm-omap-compass-light" points="0,-${length} ${width},-${width} 0,0"/>
        </g>`;
        const diagonals = [45, 135, 225, 315].map(a => point(a, 24, 4)).join('');
        const cardinals = [0, 90, 180, 270].map(a => point(a, 42, 6)).join('');
        return `<svg viewBox="-50 -60 100 110" width="64" height="70">
            <circle class="cm-omap-compass-ring" r="30"/>
            <circle class="cm-omap-compass-ring cm-omap-compass-ring-inner" r="27"/>
            ${diagonals}${cardinals}
            <circle class="cm-omap-compass-light" r="2.5"/>
            <text class="cm-omap-compass-north" y="-47" text-anchor="middle">N</text>
        </svg>`;
    }

    addMarker(location) {
        const marker = this.createMarker(location);
        marker.edificiId = location.edificiId;
        this.markers.push(marker);
        this.addContentToMarker(location, marker);
        this._createMarkerButton(marker, location);
        return marker;
    }

    getMarkers() {
        return this.markers;
    }

    getMarkerById(id) {
        return this.markers.find(marker => marker.edificiId === id);
    }

    fitToMarkers(padding = 0.1) {
        if (this.markers.length === 0) return;
        this._pendingFit = () => {
            const bounds = L.featureGroup(this.markers).getBounds();
            this.map.fitBounds(bounds.pad(padding));
        };
        this._pendingFit();
    }

    // Re-centre on the markers of the categories currently switched on; with
    // none visible there is nothing to frame, so the view is left alone.
    fitToVisibleMarkers(padding = 0.1) {
        const visible = this.markers.filter(m => this.icons.some(i => i.category === m.category && i.visible));
        if (visible.length === 0) return;
        this.map.fitBounds(L.featureGroup(visible).getBounds().pad(padding));
    }

    selectMarker(marker, zoom = 16) {
        if (!marker) return;
        this._pinMarker(marker);
        const container = this.map.getContainer && this.map.getContainer();
        if (container && container.classList && !container.classList.contains(ENTRY_MAP_CLASS)) {
            container.classList.add(ENTRY_MAP_CLASS);
            // The class changes the container's size on a phone; without this
            // Leaflet centres on the building using the old size.
            this.map.invalidateSize();
        }
        // On a phone the popup would cover most of a small map, so the
        // building is shown in its hover colour instead and the popup opens
        // on tap. Without a hover icon there is nothing to highlight with, so
        // the popup opens after all.
        const highlighted = this._isPhone() && this._highlightMarker(marker);
        // `zoom` is a floor, not a target: never zoom back out of a level the
        // view is already at (e.g. after the visitor zoomed in).
        const focus = () => {
            const current = Number(this.map.getZoom && this.map.getZoom()) || 0;
            this.map.setView(marker.getLatLng(), Math.max(zoom, current));
            if (!highlighted) marker.openPopup();
        };
        this._pendingFit = focus;
        focus();
        // Re-assert the final view/popup once any layout or animation has
        // settled (same retry pattern as resizeMap() in page.js).
        setTimeout(focus, 400);
    }

    _isPhone() {
        return typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;
    }

    // Keeps the marker in its hover icon; the mouseout handlers leave it alone.
    _highlightMarker(marker) {
        if (!marker.hoverIconUrl) return false;
        marker._highlighted = true;
        marker.setIcon(L.icon({ iconUrl: marker.hoverIconUrl, iconSize: [32, 32] }));
        return true;
    }

    // The selected building is the one the page is about, so it leaves the
    // cluster group and sits straight on the map. Inside the group it was
    // hidden whenever a neighbour was close enough to share a cluster -- no
    // icon and no popup at the zoom it was centred on, until the visitor
    // zoomed out and in -- and the group's own zoomToShowLayer() choreography
    // raced with the view changes made here.
    _pinMarker(marker) {
        if (marker._pinned) return;
        if (this.useMarkerCluster && this.clusterer && this.clusterer.hasLayer(marker)) {
            this.clusterer.removeLayer(marker);
        }
        marker._pinned = true;
        marker.addTo(this.map);
    }

    async loadComarcaBoundaries(url, activeComarcaSlug, nonce) {
        const response = await fetchMapData(url, nonce);
        const geojson = await response.json();
        // Matched by slug (plain ASCII, e.g. "alt-emporda"), not by name — the
        // GeoJSON's `nom` and marker/DB comarca names come from independent
        // sources with their own accent/apostrophe encoding quirks, which a
        // name match has to work around; slugs sidestep that entirely.
        const target = activeComarcaSlug ? activeComarcaSlug.trim().toLowerCase() : '';

        if (this.comarcaBoundariesLayer) {
            this.map.removeLayer(this.comarcaBoundariesLayer);
        }

        const matches = (feature) => target && (feature.properties.slug || '').trim().toLowerCase() === target;

        this.comarcaBoundariesLayer = L.geoJSON(geojson, {
            // No active comarca: show every outline. Once one is active, show
            // only its boundary rather than highlighting it among all 43.
            filter: (feature) => !target || matches(feature),
            style: (feature) => matches(feature)
                ? { color: '#a42016', weight: 2.5, opacity: 0.9, fillColor: '#a42016', fillOpacity: 0.06 }
                : { color: '#5c4128', weight: 1.2, opacity: 0.6, dashArray: '5 4', fillOpacity: 0 }
        }).addTo(this.map);

        return this.comarcaBoundariesLayer;
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
        marker.hoverIconUrl = location.icon2;

        if (location.icon2) {
            marker.on('mouseover', () => marker.setIcon(L.icon({ iconUrl: location.icon2, iconSize: [32, 32] })));
            marker.on('mouseout', () => {
                if (location.icon && !marker._highlighted) marker.setIcon(L.icon({ iconUrl: location.icon, iconSize: [32, 32] }));
            });
        }

        if (this.useMarkerCluster && this.clusterer) {
            this.clusterer.addLayer(marker);
        } else {
            marker.addTo(this.map);
        }

        return marker;
    }

    resize() {
        const size = this.map.getSize();
        const wasHidden = size.x === 0 || size.y === 0;
        this.map.invalidateSize();
        if (this.markers.length === 0) {
            this.map.setView([CATALUNYA_POSITION.lat, CATALUNYA_POSITION.lng], 8);
        } else if (wasHidden && this._pendingFit) {
            this._pendingFit();
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
        if (opts.altresNoms) {
            // Searched alongside the title; handleSearchTextList() shows it
            // only when it is what matched.
            const names = document.createElement("span");
            names.className = "catmed-maps-list-other-names";
            names.textContent = opts.altresNoms;
            names.hidden = true;
            li.appendChild(names);
        }
        ul.appendChild(li);

        li.addEventListener("click", () => {
            this.map.setView(marker.getLatLng(), 15);
            marker.openPopup();
        });

        li.addEventListener("mouseover", () => {
            if (opts.icon2) marker.setIcon(L.icon({ iconUrl: opts.icon2, iconSize: [32, 32] }));
        });

        li.addEventListener("mouseout", () => {
            if (opts.icon && !marker._highlighted) marker.setIcon(L.icon({ iconUrl: opts.icon, iconSize: [32, 32] }));
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
                this.fitToVisibleMarkers();
                this._announceGroups();
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
                this._setCategoryVisible(edifici, !edifici.visible);
                this.fitToVisibleMarkers();
                this._announceGroups();
            };
            return div;
        };
        control.addTo(this.map);
    }

    // One category on or off: its markers and its button.
    _setCategoryVisible(edifici, visible) {
        edifici.visible = visible;
        this._setVisible(edifici.category, visible);
        const img = document.getElementById(`img-${edifici.category}`);
        if (img) img.style.opacity = visible ? '1' : '0.5';
    }

    // A group is one of the four kinds of building (militar, civil, religios,
    // altres). It is on while any of its categories is.
    isGroupVisible(type) {
        return this.icons.some(i => i.type === type && i.visible);
    }

    setGroupVisible(type, visible) {
        this.icons.filter(i => i.type === type).forEach(i => this._setCategoryVisible(i, visible));
        this.fitToVisibleMarkers();
        this._announceGroups();
    }

    _announceGroups() {
        const types = [...new Set(this.icons.map(i => i.type).filter(Boolean))];
        const groups = Object.fromEntries(types.map(t => [t, this.isGroupVisible(t)]));
        document.dispatchEvent(new CustomEvent(GROUPS_CHANGED_EVENT, { detail: { groups } }));
    }

    _foldLayersIfAsked() {
        if (!this.foldLayers) return;
        const container = this.map.getContainer && this.map.getContainer();
        if (container && container.classList) container.classList.add(FOLDED_CLASS);
    }

    addIcon(edifici) {
        this._createIcon(edifici);
        this.icons.push(edifici);
    }

    _changeVisibility(visibility) {
        this.icons.forEach(edifici => this._setCategoryVisible(edifici, visibility));
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

    // Centres the map on the visitor. It only asks for the position when the
    // button is pressed, never on load, and the position stays in the browser:
    // nothing is sent anywhere. A refusal or a failure is said next to the
    // button instead of being swallowed.
    _setLocateControl() {
        const control = L.control({ position: 'topleft' });
        control.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control cm-omap-locate');
            const btn = L.DomUtil.create('a', '', div);
            btn.href = '#';
            btn.title = "Localitza'm";
            btn.setAttribute('role', 'button');
            btn.setAttribute('aria-label', "Localitza'm");
            btn.innerHTML = this._locateIcon();
            const message = L.DomUtil.create('span', 'cm-omap-locate-message', div);
            message.setAttribute('role', 'status');
            message.hidden = true;

            L.DomEvent.on(btn, 'click', (e) => {
                L.DomEvent.preventDefault(e);
                L.DomEvent.stopPropagation(e);
                this._locate(btn, message, map);
            });

            return div;
        };
        control.addTo(this.map);
    }

    _locate(btn, message, map) {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            this._showLocateMessage(message, "El teu navegador no pot donar la ubicació.");
            return;
        }
        btn.className = 'cm-omap-locate--busy';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                btn.className = '';
                message.hidden = true;
                this._showPosition(position.coords.latitude, position.coords.longitude, map);
            },
            (err) => {
                btn.className = '';
                this._showLocateMessage(message, this._locateErrorMessage(err));
            },
            LOCATE_OPTIONS
        );
    }

    // The dot replaces the previous one when the button is pressed again.
    _showPosition(lat, lng, map) {
        if (this._positionMarker) {
            map.removeLayer(this._positionMarker);
        }
        this._positionMarker = L.circleMarker([lat, lng], {
            radius: 8, color: '#ffffff', weight: 3, fillColor: '#2a6fdb', fillOpacity: 1
        }).addTo(map);
        const current = Number(map.getZoom && map.getZoom()) || 0;
        map.setView([lat, lng], Math.max(LOCATE_ZOOM, current));
    }

    _showLocateMessage(message, text) {
        message.textContent = text;
        message.hidden = false;
        clearTimeout(this._locateMessageTimer);
        this._locateMessageTimer = setTimeout(() => { message.hidden = true; }, LOCATE_MESSAGE_MS);
    }

    _locateErrorMessage(err) {
        switch (err && err.code) {
            case 1: // PERMISSION_DENIED
                return "Has denegat l'accés a la ubicació. Pots canviar-ho als permisos del navegador.";
            case 3: // TIMEOUT
                return "No hem pogut obtenir la ubicació a temps. Torna-ho a provar.";
            default:
                return "No hem pogut obtenir la teva ubicació.";
        }
    }

    _locateIcon() {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="8"/>
            <line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/>
            <line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>
        </svg>`;
    }

    // One button that opens and closes the category buttons. Only shown on the
    // map of a single building on a phone (catalunya-omap.css): twelve buttons
    // beside a 320 px map left room for little else.
    _setLayersControl() {
        const control = L.control({ position: 'topright' });
        control.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control cm-omap-layers');
            const btn = L.DomUtil.create('a', '', div);
            btn.href = '#';
            btn.title = 'Capes';
            btn.setAttribute('role', 'button');
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = this._layersIcon();

            L.DomEvent.on(btn, 'click', (e) => {
                L.DomEvent.preventDefault(e);
                L.DomEvent.stopPropagation(e);
                const open = map.getContainer().classList.toggle(LAYERS_OPEN_CLASS);
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });

            return div;
        };
        control.addTo(this.map);
    }

    _layersIcon() {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
        </svg>`;
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
            div.onclick = () => this._setListOpen(!this.ListTextEnabled);
            return div;
        };
        control.addTo(this.map);
    }

    // The side list with its search box, shown or hidden.
    _setListOpen(open) {
        this.ListTextEnabled = open;
        const number = open ? "04" : "03";
        const llistat = document.getElementById("llistat");
        if (llistat) llistat.src = `${this.serverHost}images/controls/${number}.png`;
        const secondaryDiv = document.getElementById(this.secondaryDivId);
        if (secondaryDiv) secondaryDiv.style.display = open ? '' : 'none';
        // The magnifier says whether the list is open, whoever opened it.
        if (this._searchButtonEl) this._searchButtonEl.setAttribute('aria-expanded', open ? 'true' : 'false');
        this.resize();
    }

    // A magnifier under the other buttons that opens the side list and puts
    // the cursor in its search box, and closes the list when pressed again:
    // the search was always there, but behind an unlabelled icon.
    _setSearchControl() {
        const control = L.control({ position: 'topleft' });
        control.onAdd = () => {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control cm-omap-search');
            const btn = L.DomUtil.create('a', '', div);
            btn.href = '#';
            btn.title = 'Cercar una edificació';
            btn.setAttribute('role', 'button');
            btn.setAttribute('aria-label', 'Cercar una edificació');
            btn.setAttribute('aria-expanded', this.ListTextEnabled ? 'true' : 'false');
            btn.innerHTML = this._searchIcon();
            this._searchButtonEl = btn;

            L.DomEvent.on(btn, 'click', (e) => {
                L.DomEvent.preventDefault(e);
                L.DomEvent.stopPropagation(e);
                this._toggleSearch();
            });

            return div;
        };
        control.addTo(this.map);
    }

    _toggleSearch() {
        if (this.ListTextEnabled) {
            this._setListOpen(false);
            return;
        }
        this._setListOpen(true);
        const secondaryDiv = document.getElementById(this.secondaryDivId);
        const input = secondaryDiv && secondaryDiv.querySelector('input[type="search"]');
        if (input) input.focus();
    }

    _searchIcon() {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>`;
    }

    _setVisible(category, visible) {
        this.markers.forEach(marker => {
            if (marker.category === category) {
                if (marker._pinned) {
                    if (visible) marker.addTo(this.map); else this.map.removeLayer(marker);
                    return;
                }
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

    /**
     * Adds (or moves) a distinctly-styled marker for the visitor's own GPS
     * position — separate from addMarker()/createMarker() because it isn't a
     * building and shouldn't join the cluster group or the #map-list sidebar.
     * Calling it again replaces the previous marker/circle instead of
     * stacking them, so repeated geolocation fixes don't leave stale dots.
     */
    setUserLocationMarker(lat, lng, { accuracy } = {}) {
        if (this._userLocationMarker) {
            this.map.removeLayer(this._userLocationMarker);
            this._userLocationMarker = null;
        }
        if (this._userLocationAccuracyCircle) {
            this.map.removeLayer(this._userLocationAccuracyCircle);
            this._userLocationAccuracyCircle = null;
        }

        if (accuracy) {
            this._userLocationAccuracyCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#4285f4',
                weight: 1,
                fillColor: '#4285f4',
                fillOpacity: 0.08
            }).addTo(this.map);
        }

        this._userLocationMarker = L.circleMarker([lat, lng], {
            radius: 8,
            color: '#ffffff',
            weight: 2,
            fillColor: '#1a73e8',
            fillOpacity: 1
        }).addTo(this.map);
        this._userLocationMarker.bindPopup('Ets aquí');

        return this._userLocationMarker;
    }

    /**
     * Adds (or moves) a circle showing the chosen search radius around the
     * visitor's position — distinct from setUserLocationMarker()'s own
     * accuracy circle (GPS precision, typically tens of metres) since this
     * one reflects a value the visitor picked (e.g. "5 km"), not a device
     * reading. Calling it again replaces the previous circle. Returns the
     * circle so the caller can fit the map to its bounds (centres on the
     * visitor while keeping the whole radius in view).
     */
    setSearchRadiusCircle(lat, lng, radiusMeters) {
        if (this._searchRadiusCircle) {
            this.map.removeLayer(this._searchRadiusCircle);
            this._searchRadiusCircle = null;
        }

        this._searchRadiusCircle = L.circle([lat, lng], {
            radius: radiusMeters,
            color: '#a42016',
            weight: 1.5,
            dashArray: '4 4',
            fillColor: '#a42016',
            fillOpacity: 0.04
        }).addTo(this.map);

        return this._searchRadiusCircle;
    }

    /**
     * Inverse of addMarker()/addAllMarkersToCluster(): removes every current
     * marker from the map/clusterer and empties the #map-list sidebar, so a
     * new search (e.g. a different radius) doesn't accumulate markers/items
     * on top of the previous one.
     */
    clearMarkers() {
        if (this.useMarkerCluster && this.clusterer) {
            this.clusterer.clearLayers();
        } else {
            this.markers.forEach(marker => this.map.removeLayer(marker));
        }
        this.markers.filter(marker => marker._pinned).forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        this.arrayCategoriesText = [];

        const ul = document.getElementById(this.listId);
        if (ul) ul.innerHTML = '';
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
