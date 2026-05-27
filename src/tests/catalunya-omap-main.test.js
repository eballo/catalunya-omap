/**
 * @jest-environment jsdom
 */

// Import everything AFTER setting up mocks
import { beforeEach, describe, expect, test, jest } from "@jest/globals";

// Prepare global.L for leaflet.markercluster
import L from 'leaflet';
global.L = L;

// Mock leaflet.markercluster
jest.mock('leaflet.markercluster', () => {
    global.L.markerClusterGroup = jest.fn(() => ({
        addLayer: jest.fn(),
        removeLayer: jest.fn(),
        hasLayer: jest.fn().mockReturnValue(false)
    }));
});

// Mock leaflet AFTER jest is available
jest.mock('leaflet', () => {
    const jest = require('jest-mock');

    const mockMap = {
        setView: jest.fn().mockReturnThis(),
        addLayer: jest.fn(),
        removeLayer: jest.fn(),
        invalidateSize: jest.fn(),
        setZoom: jest.fn(),
        on: jest.fn()
    };

    const mockMarker = {
        addTo: jest.fn(),
        bindPopup: jest.fn(),
        setIcon: jest.fn(),
        openPopup: jest.fn(),
        getLatLng: jest.fn(() => ({ lat: 41.3851, lng: 2.1734 }))
    };

    const mockControl = {
        onAdd: jest.fn(),
        addTo: jest.fn()
    };

    const mockDomUtil = {
        create: jest.fn(() => ({
            style: {},
            innerHTML: '',
            appendChild: jest.fn(),
            addEventListener: jest.fn(),
            setAttribute: jest.fn()
        }))
    };

    const L = {
        map: jest.fn(() => mockMap),
        marker: jest.fn(() => mockMarker),
        icon: jest.fn(() => ({})),
        tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
        control: jest.fn(() => mockControl),
        DomUtil: mockDomUtil,
        markerClusterGroup: jest.fn(() => ({
            addLayer: jest.fn(),
            removeLayer: jest.fn(),
            hasLayer: jest.fn().mockReturnValue(false)
        }))
    };

    global.L = L;
    return L;
});

// Mock your own utils
jest.mock('../app/catalunya-omap-extra', () => ({
    stringToBoolean: jest.fn(() => true)
}));

// Now import the module under test
import MapManager from '../app/catalunya-omap-manager';

describe('MapManager (Leaflet)', () => {
    let mapManager;

    beforeEach(() => {
        document.body.innerHTML = `
      <div id="map-id"></div>
      <ul id="map-list"></ul>
      <div id="primary-div"></div>
      <div id="secondary-div"></div>
    `;
        mapManager = new MapManager('mapId');
    });

    test('should initialize map', async () => {
        const map = await mapManager.initMap();
        expect(map).toBeDefined();
        expect(mapManager.map).toBeDefined();
    });

    test('should add marker to map and internal list', async () => {
        await mapManager.initMap();
        const location = { lat: 41.3851, lng: 2.1734, title: 'Test', icon: 'icon.png' };
        mapManager._createMarkerButton = jest.fn();
        mapManager.addMarker(location);
        expect(mapManager.markers.length).toBe(1);
    });

    test('should return all markers', async () => {
        await mapManager.initMap();
        const location = { lat: 41.3851, lng: 2.1734, title: 'Test', icon: 'icon.png' };
        mapManager.addMarker(location);
        const markers = mapManager.getMarkers();
        expect(markers.length).toBe(1);
    });

    test('should bind popup to marker', async () => {
        await mapManager.initMap();
        const location = { lat: 41.3851, lng: 2.1734, content: 'Popup content' };
        const marker = mapManager.createMarker(location);
        mapManager.addContentToMarker(location, marker);
        expect(marker.bindPopup).toHaveBeenCalledWith('Popup content', { closeButton: false });
    });

    test('should handle visibility of category markers', async () => {
        await mapManager.initMap();
        const marker = mapManager.createMarker({ lat: 0, lng: 0 });
        marker.category = 'test';
        mapManager.markers = [marker];
        mapManager.clusterer = {
            hasLayer: jest.fn().mockReturnValue(false),
            addLayer: jest.fn(),
            removeLayer: jest.fn()
        };
        mapManager._setVisible('test', true);
        expect(mapManager.clusterer.addLayer).toHaveBeenCalled();
    });
});
