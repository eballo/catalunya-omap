// Maidenhead (QTH) locator of a point, six characters: field, square and
// subsquare, the way radio amateurs say where they are (41.714775 N,
// 72.727260 W is FN31pr). The same calculation as the theme's
// cm_maidenhead_locator(), so the map and the building page always agree.
// Returns '' when either coordinate is missing or out of range.
export function maidenheadLocator(lat, lng) {
    if (lat === null || lng === null || lat === '' || lng === '' ||
        !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return '';
    }
    let la = Number(lat);
    let lo = Number(lng);
    if (la < -90 || la > 90 || lo < -180 || lo > 180) {
        return '';
    }

    // 90 N and 180 E sit on the edge of the last cell: keep them inside the grid.
    la = Math.min(la, 89.999999) + 90;
    lo = Math.min(lo, 179.999999) + 180;

    const fieldLng = Math.floor(lo / 20);
    const fieldLat = Math.floor(la / 10);
    lo %= 20;
    la %= 10;

    const squareLng = Math.floor(lo / 2);
    const squareLat = Math.floor(la);
    lo -= squareLng * 2;
    la -= squareLat;

    const subLng = Math.floor(lo * 12);
    const subLat = Math.floor(la * 24);

    return String.fromCharCode(65 + fieldLng) + String.fromCharCode(65 + fieldLat) +
        squareLng + squareLat +
        String.fromCharCode(97 + subLng) + String.fromCharCode(97 + subLat);
}
