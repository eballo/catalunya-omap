/**
 * @jest-environment jsdom
 */

// What the page does around the map once it is up: hide the «no markers» message, keep the
// map sized to the window and hide the list while the browser is full screen. It used to be
// done with a global jQuery `$` the host page had to provide; it must now work without one.

import { beforeEach, describe, expect, jest, test } from "@jest/globals";

const mockMapManager = {
    getMarkers: jest.fn(() => [{}]),
    resize: jest.fn(),
};

jest.mock('../app/catalunya-omap-monument', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        mapManager: mockMapManager,
        create: jest.fn(() => Promise.resolve(mockMapManager)),
    })),
}));

jest.mock('../app/catalunya-omap-extra', () => ({
    __esModule: true,
    default: jest.fn(),
}));

import initMapApplication from '../app/catalunya-omap-main';

describe('the page around the map', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="error">No markers</div><div id="list">list</div>';
        mockMapManager.getMarkers.mockReturnValue([{}]);
        mockMapManager.resize.mockClear();
    });

    test('works with no jQuery on the page', () => {
        expect(window.$).toBeUndefined();
        expect(window.jQuery).toBeUndefined();
    });

    test('hides the error message when there are markers', async () => {
        await initMapApplication();
        expect(document.getElementById('error').style.display).toBe('none');
    });

    test('keeps the error message when there are no markers', async () => {
        mockMapManager.getMarkers.mockReturnValue([]);
        await initMapApplication();
        expect(document.getElementById('error').style.display).not.toBe('none');
    });

    test('resizes the map when the window is resized', async () => {
        await initMapApplication();
        window.dispatchEvent(new Event('resize'));
        expect(mockMapManager.resize).toHaveBeenCalled();
    });

    test('hides the list in full screen and shows it again after', async () => {
        await initMapApplication();
        const list = document.getElementById('list');

        Object.defineProperty(document, 'fullScreen', { value: true, configurable: true });
        document.dispatchEvent(new Event('fullscreenchange'));
        expect(list.style.display).toBe('none');

        Object.defineProperty(document, 'fullScreen', { value: false, configurable: true });
        document.dispatchEvent(new Event('fullscreenchange'));
        expect(list.style.display).not.toBe('none');
    });
});
