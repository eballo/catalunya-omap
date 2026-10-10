
export function stringToBoolean(value) {
    // Accepts a real boolean too, not just a string: config coming from
    // window.catalunyaOmapConfig (JS object literals emitted by PHP, e.g.
    // `userPosition: true`) is already a boolean, while config coming from
    // process.env (dotenv-webpack) is always a string — this function is
    // called with either.
    if (typeof value === "boolean") return value;
    if (!value) return false;
    return value.toLowerCase() !== "false";
}

export default function handleSearchTextList(event) {
    const filter = removeAccents(event.target.value).toUpperCase();
    const ul = document.getElementById("map-list");
    if (!ul) return;
    const li = ul.getElementsByTagName('li');

    // Loop through all list items, and hide those who don't match the search query.
    // A building's other names (altresNoms) match too, and are shown under its
    // title only when they are what matched: they say why a title that doesn't
    // contain the query is in the list.
    for (let i = 0; i < li.length; i++) {
        const names = li[i].querySelector('.catmed-maps-list-other-names');
        const text = li[i].textContent;
        const title = names ? text.slice(0, text.length - names.textContent.length) : text;
        if (title === '') {
            li[i].style.display = "";
            continue;
        }
        const inTitle = removeAccents(title).toUpperCase().indexOf(filter) > -1;
        const inNames = !inTitle && names !== null && filter !== ''
            && removeAccents(names.textContent).toUpperCase().indexOf(filter) > -1;
        li[i].style.display = inTitle || inNames ? "" : "none";
        if (names) names.hidden = !inNames;
    }
}

export function filterByField(markers, field, value) {
    if (!value) return markers;
    const target = removeAccents(value).trim().toUpperCase();
    return markers.filter(m => removeAccents(m[field] || '').trim().toUpperCase() === target);
}

export function filterByComarca(markers, comarca) {
    return filterByField(markers, 'comarca', comarca);
}

export function filterByMunicipi(markers, municipi) {
    return filterByField(markers, 'municipi', municipi);
}

// Mirrors WordPress's sanitize_title(): strip accents, drop apostrophes
// (no hyphen inserted — "Pla d'Urgell" -> "pla-durgell"), lowercase, replace
// any other run of non-alphanumeric characters with a single hyphen. Verified
// against all 43 real comarca slugs.
export function slugify(value) {
    return removeAccents(value || '')
        .replace(/['’]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function removeAccents(p) {
    let value = p.replace("(", "");
    value = value.replace(")","");
    value = value.replace("*",""); //Fix capella sense nom

    let c = 'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÖÔÚÙÛÜÇ';
    let s = 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC';
    let n = '';
    // indexOf(), not search(): search() reads the character as a regular
    // expression, so a second "(" threw and "." turned into "a" — and the
    // other names (altresNoms) are full of both: "Palau d'Aitona - (Patrimoni.Gencat)".
    for (let i = 0; i < value.length; i++) {
        const at = c.indexOf(value[i]);
        n += at >= 0 ? s[at] : value[i];
    }
    return n;
}

/**
 * fetch() the map JSON, sending the host's nonce as X-CM-Nonce when set, so
 * the URL itself stays stable (cacheable, and no new crawler 403 per rotation).
 */
export function fetchMapData(url, nonce) {
    return nonce ? fetch(url, { headers: { 'X-CM-Nonce': nonce } }) : fetch(url);
}
