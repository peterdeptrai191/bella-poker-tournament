# Skin shop performance

Shop slots retain the original full-quality animated SVG renderer. Artwork is created only when its card enters a 160px margin around the shop's scroll viewport. Observing the card rather than its descendants works with content-visibility and stable placeholder dimensions.

Off-screen artwork pauses and resumes on return. Hidden-page and covered-background throttling remains enabled, while the selected preview retains its full effects when visible.

The grid is preserved across selection, wallet changes and repeated opens when the shared modal still contains it. Text, ownership and selection update in place; only an ownership change that replaces an event silhouette regenerates that card's artwork. Observers disconnect when the shop closes.

`test/skin-grid.test.js` covers deferred hydration, reuse, targeted ownership refresh, observer cleanup and the no-IntersectionObserver fallback. Existing UI tests cover asset paths, animation registry cleanup and dark card readability.
