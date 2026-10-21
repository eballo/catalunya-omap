import MonumentBuilder from './catalunya-omap-monument'
import handleSearchTextList from './catalunya-omap-extra'

async function initMapApplication() {
    try {
        const monument = new MonumentBuilder('omap');
        window.cmOmapManager = monument.mapManager;
        const mapManager = await monument.create();

        if (mapManager.getMarkers().length > 0) {
            const error = document.getElementById('error');
            if (error) {
                error.style.display = 'none';
            }
        }

        window.addEventListener('resize', () => {
            mapManager.resize();
        });

        /**
         * Full Screen event
         * On full screen we remove the list icon
         */
        const toggleListOnFullScreen = () => {
            const isFullScreen = document.fullScreen ||
                document.mozFullScreen ||
                document.webkitIsFullScreen;
            const list = document.getElementById('list');
            if (list) {
                list.style.display = isFullScreen ? 'none' : '';
            }
        };
        ['webkitfullscreenchange', 'mozfullscreenchange', 'fullscreenchange'].forEach((name) => {
            document.addEventListener(name, toggleListOnFullScreen);
        });

    } catch (error) {
        console.error("Failed to load the OpenStreetMaps", error);
    }
}
document.addEventListener('DOMContentLoaded', async () => {
    await initMapApplication()

    // --- Search List -----
    const input = document.querySelector('#search-list');
    if (input) {
        input.addEventListener('blur', handleSearchTextList);
        input.addEventListener('input', handleSearchTextList);
    }
});

export default initMapApplication;