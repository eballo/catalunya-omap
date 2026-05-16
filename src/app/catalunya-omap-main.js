import MonumentBuilder from './catalunya-omap-monument'
import handleSearchTextList from './catalunya-omap-extra'


async function initMapApplication() {
    try {
        const monument = new MonumentBuilder('omap');
        const mapManager = await monument.create();
        window.cmOmapManager = mapManager;

        if (mapManager.getMarkers().length > 0) {
            $("#error").hide();
        }

        $(window).resize(function () {
            mapManager.resize();
        })

        /**
         * Full Screen event
         * On full screen we remove the list icon
         */
        $(document).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange', function () {
            const isFullScreen = document.fullScreen ||
                document.mozFullScreen ||
                document.webkitIsFullScreen;
            if (isFullScreen) {
                $('#list').hide();
            } else {
                $('#list').show();
            }
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