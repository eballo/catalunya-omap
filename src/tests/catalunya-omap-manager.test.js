/**
 * @jest-environment jsdom
 */
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import MapManager from "../app/catalunya-omap-manager";

jest.mock('leaflet.markercluster', () => ({}));

jest.mock('../app/catalunya-omap-extra', () => ({
    stringToBoolean: jest.fn(v => v === 'true'),
}));

jest.mock('../app/catalunya-omap-styles', () => ({
    CATALUNYA_POSITION: { lat: 41.44, lng: 1.82 },
}));

jest.mock('leaflet', () => {
    function makeControl() {
        var ctrl = { onAdd: null, _lastDiv: null };
        ctrl.addTo = jest.fn().mockImplementation(function (map) {
            if (ctrl.onAdd) ctrl._lastDiv = ctrl.onAdd(map || {});
            return ctrl;
        });
        return ctrl;
    }
    return {
        map:                jest.fn(),
        tileLayer:          jest.fn().mockReturnValue({ addTo: jest.fn() }),
        markerClusterGroup: jest.fn(),
        marker:             jest.fn().mockImplementation(function (latlng) {
            return {
                getLatLng: jest.fn().mockReturnValue(latlng),
                bindPopup: jest.fn(),
                openPopup: jest.fn(),
                addTo:     jest.fn(),
                setIcon:   jest.fn(),
                category:  null,
                visible:   null,
            };
        }),
        icon:    jest.fn().mockImplementation(function (o) { return { url: o.iconUrl }; }),
        control: jest.fn().mockImplementation(makeControl),
        DomUtil: {
            create: jest.fn().mockImplementation(function (tag, cls) {
                var attrs = {};
                return {
                    tagName: tag || 'div',
                    className: cls || '',
                    addEventListener: jest.fn(),
                    setAttribute: jest.fn().mockImplementation(function (k, v) { attrs[k] = v; }),
                    getAttribute: jest.fn().mockImplementation(function (k) { return attrs[k]; }),
                    appendChild: jest.fn(),
                    innerHTML: '',
                    href: '',
                    title: '',
                    src: '',
                    style: {},
                    onclick: null,
                };
            }),
        },
        DomEvent: {
            on:              jest.fn().mockImplementation(function (el, evt, fn) { el.addEventListener(evt, fn); }),
            preventDefault:  jest.fn(),
            stopPropagation: jest.fn(),
        },
    };
});

process.env.USE_MARKER_CLUSTER = 'true';
process.env.SERVER_HOST        = 'http://localhost/';
process.env.DEBUG              = 'false';

// ---------------------------------------------------------------------------

var mockMap, mockClusterer;

beforeEach(function () {
    const L = require('leaflet');
    jest.clearAllMocks();

    mockMap = {
        setView:        jest.fn().mockReturnThis(),
        addLayer:       jest.fn(),
        removeLayer:    jest.fn(),
        invalidateSize: jest.fn(),
        getContainer:   jest.fn().mockReturnValue({ requestFullscreen: jest.fn() }),
    };
    mockClusterer = {
        addLayer:    jest.fn(),
        removeLayer: jest.fn(),
        clearLayers: jest.fn(),
        hasLayer:    jest.fn().mockReturnValue(false),
    };

    L.map.mockReturnValue(mockMap);
    L.markerClusterGroup.mockReturnValue(mockClusterer);
    L.marker.mockImplementation(function (latlng) {
        return {
            getLatLng: jest.fn().mockReturnValue(latlng),
            bindPopup: jest.fn(),
            openPopup: jest.fn(),
            addTo:     jest.fn(),
            setIcon:   jest.fn(),
            category:  null,
            visible:   null,
        };
    });
});

function buildManager(html) {
    document.body.innerHTML = html || '<div id="omap"></div><ul id="map-list"></ul>';
    return new MapManager('omap');
}

// ---------------------------------------------------------------------------

describe('MapManager - constructor', () => {
    it('sets default properties', () => {
        const mm = buildManager();
        expect(mm.mapId).toBe('omap');
        expect(mm.markers).toEqual([]);
        expect(mm.clusterer).toBeNull();
        expect(mm.listId).toBe('map-list');
    });

    it('reads config from catalunyaOmapConfig when present', () => {
        global.catalunyaOmapConfig = { listId: 'custom', serverHost: 'http://x/', secondaryDivId: 'sd' };
        const mm = buildManager();
        expect(mm.listId).toBe('custom');
        expect(mm.serverHost).toBe('http://x/');
        expect(mm.secondaryDivId).toBe('sd');
        delete global.catalunyaOmapConfig;
    });
});

describe('MapManager - initMap()', () => {
    it('creates the map and returns it', async () => {
        const mm = buildManager();
        const result = await mm.initMap();
        expect(result).toBe(mockMap);
        expect(mm.map).toBe(mockMap);
    });

    it('creates clusterer when USE_MARKER_CLUSTER is true', async () => {
        const mm = buildManager();
        await mm.initMap();
        expect(mm.clusterer).toBe(mockClusterer);
    });

    it('does not create clusterer when USE_MARKER_CLUSTER is false', async () => {
        process.env.USE_MARKER_CLUSTER = 'false';
        const mm = buildManager();
        await mm.initMap();
        expect(mm.clusterer).toBeNull();
        process.env.USE_MARKER_CLUSTER = 'true';
    });
});

describe('MapManager - createMarker()', () => {
    it('adds marker to clusterer when cluster is enabled', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41.3, lng: 2.1, title: 'T', icon: 'i.png', category: 'castell', visible: true });
        expect(mockClusterer.addLayer).toHaveBeenCalledWith(marker);
    });

    it('calls marker.addTo(map) when cluster is disabled', async () => {
        process.env.USE_MARKER_CLUSTER = 'false';
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41.3, lng: 2.1, title: 'T', category: 'castell', visible: true });
        expect(marker.addTo).toHaveBeenCalledWith(mockMap);
        process.env.USE_MARKER_CLUSTER = 'true';
    });

    it('creates marker without icon when icon is absent', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41, lng: 2, title: 'T', category: 'castell', visible: true });
        expect(marker).toBeDefined();
    });
});

describe('MapManager - addMarker()', () => {
    it('pushes marker into the markers array', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm.addMarker({ lat: 41, lng: 2, title: 'T', icon: 'i.png', category: 'castell', categoryName: 'C', visible: true, content: '<p>x</p>' });
        expect(mm.markers).toHaveLength(1);
    });
});

describe('MapManager - getMarkers()', () => {
    it('returns the markers array', async () => {
        const mm = buildManager();
        await mm.initMap();
        expect(mm.getMarkers()).toEqual([]);
        mm.addMarker({ lat: 41, lng: 2, title: 'A', icon: 'i.png', category: 'castell', categoryName: 'C', visible: true });
        expect(mm.getMarkers()).toHaveLength(1);
    });
});

describe('MapManager - addContentToMarker()', () => {
    it('binds popup when content is present', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41, lng: 2, title: 'T' });
        mm.addContentToMarker({ content: '<b>hi</b>' }, marker);
        expect(marker.bindPopup).toHaveBeenCalledWith('<b>hi</b>', { closeButton: false });
    });

    it('does not bind popup when content is absent', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41, lng: 2, title: 'T' });
        mm.addContentToMarker({}, marker);
        expect(marker.bindPopup).not.toHaveBeenCalled();
    });
});

describe('MapManager - resize()', () => {
    it('calls invalidateSize', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm.resize();
        expect(mockMap.invalidateSize).toHaveBeenCalled();
    });

    it('recenters when no markers', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm.markers = [];
        mm.resize();
        expect(mockMap.setView).toHaveBeenCalledWith([41.44, 1.82], 8);
    });

    it('does not recenter when markers exist', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm.markers = [{}];
        mockMap.setView.mockClear();
        mm.resize();
        expect(mockMap.setView).not.toHaveBeenCalled();
    });
});

describe('MapManager - resetView()', () => {
    it('recenters to Catalunya', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm.resetView();
        expect(mockMap.setView).toHaveBeenCalledWith([41.44, 1.82], 8);
    });
});

describe('MapManager - _exist()', () => {
    it('returns true when item exists', () => {
        const mm = buildManager();
        mm.arrayCategoriesText = ['castell', 'ermita'];
        expect(mm._exist('castell')).toBe(true);
    });

    it('returns false when item is absent', () => {
        const mm = buildManager();
        mm.arrayCategoriesText = ['castell'];
        expect(mm._exist('catedral')).toBe(false);
    });
});

describe('MapManager - _createMarkerButton()', () => {
    it('appends category header and item', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41, lng: 2, category: 'castell', visible: true });
        mm._createMarkerButton(marker, { title: 'Vic', category: 'castell', categoryName: 'Castells', icon: 'i.png', icon2: 'i2.png' });
        const ul = document.getElementById('map-list');
        expect(ul.querySelectorAll('li').length).toBe(2);
        expect(ul.innerHTML).toContain('Vic');
    });

    it('does not add duplicate category header', async () => {
        const mm = buildManager();
        await mm.initMap();
        const opts = { title: 'T', category: 'castell', categoryName: 'Castells', icon: 'i.png', icon2: 'i2.png' };
        mm._createMarkerButton(mm.createMarker({ lat: 41, lng: 2, category: 'castell', visible: true }), opts);
        mm._createMarkerButton(mm.createMarker({ lat: 41, lng: 2, category: 'castell', visible: true }), { ...opts, title: 'T2' });
        expect(document.querySelectorAll('li.header').length).toBe(1);
    });

    it('click on list item calls setView and openPopup', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41, lng: 2, category: 'castell', visible: true });
        mm._createMarkerButton(marker, { title: 'T', category: 'castell', categoryName: 'C', icon: 'i.png', icon2: 'i2.png' });
        document.querySelector('li.castell:not(.header)').click();
        expect(mockMap.setView).toHaveBeenCalled();
        expect(marker.openPopup).toHaveBeenCalled();
    });

    it('mouseover sets icon2', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41, lng: 2, category: 'castell', visible: true });
        mm._createMarkerButton(marker, { title: 'T', category: 'castell', categoryName: 'C', icon: 'i.png', icon2: 'i2.png' });
        document.querySelector('li.castell:not(.header)').dispatchEvent(new MouseEvent('mouseover'));
        expect(marker.setIcon).toHaveBeenCalled();
    });

    it('mouseover does nothing when icon2 is absent', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41, lng: 2, category: 'castell', visible: true });
        mm._createMarkerButton(marker, { title: 'T', category: 'castell', categoryName: 'C', icon: 'i.png' });
        document.querySelector('li.castell:not(.header)').dispatchEvent(new MouseEvent('mouseover'));
        expect(marker.setIcon).not.toHaveBeenCalled();
    });

    it('mouseout restores icon', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41, lng: 2, category: 'castell', visible: true });
        mm._createMarkerButton(marker, { title: 'T', category: 'castell', categoryName: 'C', icon: 'i.png', icon2: 'i2.png' });
        document.querySelector('li.castell:not(.header)').dispatchEvent(new MouseEvent('mouseout'));
        expect(marker.setIcon).toHaveBeenCalled();
    });

    it('mouseout does nothing when icon is absent', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = mm.createMarker({ lat: 41, lng: 2, category: 'castell', visible: true });
        mm._createMarkerButton(marker, { title: 'T', category: 'castell', categoryName: 'C' });
        document.querySelector('li.castell:not(.header)').dispatchEvent(new MouseEvent('mouseout'));
        expect(marker.setIcon).not.toHaveBeenCalled();
    });
});

describe('MapManager - _setLogoCatalunyaMedieval()', () => {
    it('onAdd creates div with logo', async () => {
        const mm = buildManager();
        await mm.initMap();
        const L = require('leaflet');
        const ctrl = L.control.mock.results.find(r => r.value._lastDiv && r.value._lastDiv.innerHTML.includes('logoCM'));
        expect(ctrl).toBeDefined();
        expect(ctrl.value._lastDiv.innerHTML).toContain('logoCM-red-mini.png');
    });
});

describe('MapManager - _setRemoveAllIcons()', () => {
    it('onclick toggles visibleBuildings and updates image src', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm._changeVisibility = jest.fn();
        // Add real img so onclick handler can update it
        const img = document.createElement('img');
        img.id = 'visibleBuildings';
        document.body.appendChild(img);
        const L = require('leaflet');
        // 4th L.control call (index 3) is _setRemoveAllIcons
        const div = L.control.mock.results[3].value._lastDiv;
        expect(mm.visibleBuildings).toBe(true);
        div.onclick(); // true → false (number = "05")
        expect(mm.visibleBuildings).toBe(false);
        expect(mm._changeVisibility).toHaveBeenCalledWith(false);
        div.onclick(); // false → true (number = "06") — covers both ternary branches
        expect(mm.visibleBuildings).toBe(true);
        expect(mm._changeVisibility).toHaveBeenCalledWith(true);
    });
});

describe('MapManager - addIcon() and _createIcon()', () => {
    it('addIcon pushes to icons array', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm.addIcon({ category: 'castell', icon: 'i.png', title: 'C', visible: true });
        expect(mm.icons).toHaveLength(1);
    });

    it('icon onclick toggles visible and opacity', async () => {
        const mm = buildManager();
        mm._setVisible = jest.fn();
        await mm.initMap();
        const edifici = { category: 'castell', icon: 'i.png', title: 'C', visible: true };
        mm.addIcon(edifici);
        // Add real img so onclick handler can update opacity
        const img = document.createElement('img');
        img.id = 'img-castell';
        document.body.appendChild(img);
        const L = require('leaflet');
        // 5th L.control call (index 4) is _createIcon (after initMap's 4 controls)
        const div = L.control.mock.results[4].value._lastDiv;
        div.onclick();
        expect(edifici.visible).toBe(false);
        expect(mm._setVisible).toHaveBeenCalledWith('castell', false);
        expect(img.style.opacity).toBe('0.5');
        div.onclick();
        expect(edifici.visible).toBe(true);
        expect(img.style.opacity).toBe('1');
    });
});

describe('MapManager - _changeVisibility()', () => {
    it('sets all icons visible=false and calls _setVisible', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm._setVisible = jest.fn();
        mm.icons = [{ category: 'castell', visible: true }, { category: 'ermita', visible: true }];
        mm._changeVisibility(false);
        expect(mm.icons.every(i => i.visible === false)).toBe(true);
        expect(mm._setVisible).toHaveBeenCalledTimes(2);
        expect(mm._setVisible).toHaveBeenCalledWith('castell', false);
        expect(mm._setVisible).toHaveBeenCalledWith('ermita', false);
    });

    it('sets all icons visible=true', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm._setVisible = jest.fn();
        mm.icons = [{ category: 'castell', visible: false }];
        mm._changeVisibility(true);
        expect(mm.icons[0].visible).toBe(true);
    });
});

describe('MapManager - _setIconTextList()', () => {
    it('onclick toggles secondaryDiv and calls resize', async () => {
        buildManager('<div id="omap"></div><ul id="map-list"></ul><div id="secondaryDiv" style="display:none"></div><img id="llistat" />');
        const mm = new MapManager('omap');
        mm.resize = jest.fn();
        await mm.initMap();
        const L = require('leaflet');
        // 3rd L.control call (index 2) is _setIconTextList
        const div = L.control.mock.results[2].value._lastDiv;
        div.onclick();
        expect(mm.ListTextEnabled).toBe(true);
        expect(document.getElementById('secondaryDiv').style.display).toBe('');
        expect(mm.resize).toHaveBeenCalled();
        div.onclick();
        expect(mm.ListTextEnabled).toBe(false);
        expect(document.getElementById('secondaryDiv').style.display).toBe('none');
    });

    it('onclick works without secondaryDiv in DOM', async () => {
        buildManager('<div id="omap"></div><ul id="map-list"></ul>');
        const mm = new MapManager('omap');
        mm.resize = jest.fn();
        await mm.initMap();
        const L = require('leaflet');
        const div = L.control.mock.results[2].value._lastDiv;
        div.onclick();
        expect(mm.ListTextEnabled).toBe(true);
        expect(mm.resize).toHaveBeenCalled();
    });
});

describe('MapManager - _fullscreenExpandIcon() / _fullscreenCompressIcon()', () => {
    it('_fullscreenExpandIcon returns an SVG string', () => {
        expect(buildManager()._fullscreenExpandIcon()).toContain('<svg');
    });

    it('_fullscreenCompressIcon returns an SVG string', () => {
        expect(buildManager()._fullscreenCompressIcon()).toContain('<svg');
    });
});

describe('MapManager - _setFullscreenControl()', () => {
    it('btn click requests fullscreen when not already fullscreen', async () => {
        const mm = buildManager();
        await mm.initMap();
        const L = require('leaflet');
        // fullscreen btn is the 3rd DomUtil.create call (index 2, after logo div and fullscreen container div)
        const btn = L.DomUtil.create.mock.results[2].value;
        const clickHandler = btn.addEventListener.mock.calls.find(c => c[0] === 'click')?.[1];
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
        clickHandler({ preventDefault: jest.fn(), stopPropagation: jest.fn() });
        expect(mockMap.getContainer().requestFullscreen).toHaveBeenCalled();
    });

    it('btn click exits fullscreen when already fullscreen', async () => {
        const mm = buildManager();
        await mm.initMap();
        document.exitFullscreen = jest.fn();
        const L = require('leaflet');
        const btn = L.DomUtil.create.mock.results[2].value;
        const clickHandler = btn.addEventListener.mock.calls.find(c => c[0] === 'click')?.[1];
        Object.defineProperty(document, 'fullscreenElement', { value: document.body, configurable: true });
        clickHandler({ preventDefault: jest.fn(), stopPropagation: jest.fn() });
        expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('fullscreenchange invalidates map size when entering fullscreen', async () => {
        const mm = buildManager();
        await mm.initMap();
        Object.defineProperty(document, 'fullscreenElement', { value: document.body, configurable: true });
        document.dispatchEvent(new Event('fullscreenchange'));
        expect(mockMap.invalidateSize).toHaveBeenCalled();
    });

    it('fullscreenchange shows expand icon when exiting fullscreen', async () => {
        const mm = buildManager();
        await mm.initMap();
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
        document.dispatchEvent(new Event('fullscreenchange'));
        expect(mockMap.invalidateSize).toHaveBeenCalled();
    });
});

describe('MapManager - _setVisible()', () => {
    it('adds marker to clusterer when making visible (cluster enabled)', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = { category: 'castell', visible: false };
        mm.markers = [marker];
        mockClusterer.hasLayer.mockReturnValue(false);
        mm._setVisible('castell', true);
        expect(mockClusterer.addLayer).toHaveBeenCalledWith(marker);
    });

    it('removes marker from clusterer when hiding (cluster enabled)', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = { category: 'castell', visible: true };
        mm.markers = [marker];
        mockClusterer.hasLayer.mockReturnValue(true);
        mm._setVisible('castell', false);
        expect(mockClusterer.removeLayer).toHaveBeenCalledWith(marker);
    });

    it('adds marker to map when making visible (cluster disabled)', async () => {
        process.env.USE_MARKER_CLUSTER = 'false';
        const mm = buildManager();
        await mm.initMap();
        const marker = { category: 'castell', addTo: jest.fn() };
        mm.markers = [marker];
        mm._setVisible('castell', true);
        expect(marker.addTo).toHaveBeenCalledWith(mockMap);
        process.env.USE_MARKER_CLUSTER = 'true';
    });

    it('removes marker from map when hiding (cluster disabled)', async () => {
        process.env.USE_MARKER_CLUSTER = 'false';
        const mm = buildManager();
        await mm.initMap();
        const marker = { category: 'castell' };
        mm.markers = [marker];
        mm._setVisible('castell', false);
        expect(mockMap.removeLayer).toHaveBeenCalledWith(marker);
        process.env.USE_MARKER_CLUSTER = 'true';
    });

    it('skips markers of different category', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm.markers = [{ category: 'ermita' }];
        mm._setVisible('castell', false);
        expect(mockClusterer.removeLayer).not.toHaveBeenCalled();
    });
});

describe('MapManager - addAllMarkersToCluster()', () => {
    it('clears and re-adds all markers when clusterer exists', async () => {
        const mm = buildManager();
        await mm.initMap();
        const marker = {};
        mm.markers = [marker];
        mm.addAllMarkersToCluster();
        expect(mockClusterer.clearLayers).toHaveBeenCalled();
        expect(mockClusterer.addLayer).toHaveBeenCalledWith(marker);
    });

    it('creates new clusterer when clusterer is null', async () => {
        const mm = buildManager();
        await mm.initMap();
        mm.clusterer = null;
        mm.markers = [{}];
        mm.addAllMarkersToCluster();
        expect(mm.clusterer).toBeDefined();
        expect(mockMap.addLayer).toHaveBeenCalled();
    });
});
