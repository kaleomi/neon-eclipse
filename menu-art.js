// Local vector illustrations: no image/font CDN and no extra renderer or game-state dependency.
export function menuIcon(name) {
  const paths = {
    play: '<path d="m9 5 11 7-11 7Z"/>',
    resume: '<path d="M5 12a7 7 0 1 0 2-5M5 4v5h5"/><path d="M12 8v4l3 2"/>',
    levels: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    settings: '<path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6M16 9v6M10 15v6"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
    enter: '<path d="M20 5v10H4m5-5-5 5 5 5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.arrow) + '</svg>';
}
export const eclipseMark = '<svg viewBox="0 0 48 48" aria-hidden="true" fill="none"><circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="1.4"/><path d="M26 6a18 18 0 0 0 0 36A21 21 0 0 1 26 6" fill="currentColor"/><path d="m3 30 42-12" stroke="currentColor"/><circle cx="39" cy="10" r="2" fill="currentColor"/></svg>';

let serial = 0;
export function chapterArtwork(map) {
  const id = 'menu-scene-' + (++serial);
  const scenes = {
    reactor: '<path d="M0 280h640M0 230h640M200 340l70-135m170 135-70-135M75 340l150-135m340 135L415 205" opacity=".2"/><path d="M210 140h50v145h-50zM380 140h50v145h-50z"/><path d="M175 155h90m110 0h90M175 250h90m110 0h90"/><ellipse cx="320" cy="104" rx="55" ry="18"/><path d="M265 104v139m110-139v139"/><ellipse cx="320" cy="243" rx="55" ry="18"/><ellipse cx="320" cy="145" rx="74" ry="22"/><ellipse cx="320" cy="194" rx="74" ry="22"/><path d="M301 92h38v163h-38z" class="scene-light"/><path d="M90 210h78v65H90zm382 0h78v65h-78zM85 155h68v26H85zm402 0h68v26h-68z"/><path d="M98 225h35m348 0h35" class="scene-light"/>',
    station: '<path d="M75 275V135Q75 30 320 30t245 105v140M125 275V145q0-74 195-74t195 74v130M160 279V155q0-50 160-50t160 50v124" opacity=".5"/><path d="M0 305h640M180 340l72-91m210 91-72-91M0 245h195m250 0h195"/><path d="m216 245 15-105q4-24 89-24t89 24l15 105Z"/><path d="M240 145h160v63H240z" fill="currentColor" fill-opacity=".1"/><path d="M256 230h26m76 0h26" class="scene-light"/><path d="M95 99h71m308 0h71M95 151h45m360 0h45" class="scene-light"/>',
    roof: '<path d="M0 278h640M120 278v-42h45v42m19 0v-76h48v76m201 0v-62h42v62m21 0v-99h39v99" opacity=".35"/><path d="M89 257h461v40H89zM144 256l38-75 40 75m-57-43h36M330 253l34-104 46 104m-62-54h45"/><path d="M113 101q4 76 105 75l-55-56Z" fill="currentColor" fill-opacity=".08"/><path d="m161 120 21 61m-55-59 66 39M304 78q-2 83 101 87l-47-66Z"/><path d="m358 98 7 52m-38-48 57 42"/><circle cx="463" cy="95" r="40" opacity=".3"/><path d="M442 94h44m-22-21v44M74 240h51m367 0h36" class="scene-light"/>',
    tower: '<path d="M0 286h640M70 286v-66h65v66m384 0v-112h50v112" opacity=".25"/><path d="m232 274 15-197 73-30 75 30 14 197Z" fill="currentColor" fill-opacity=".05"/><path d="m247 77 73 28 75-28M320 105v169M236 211l84 31 83-31M241 154l79 32 80-32M227 275h186v19H227z"/><path d="M271 100v32m19-26v33m62-33v33m19-39v32M265 172v29m26-19v29m62-29v29m24-39v29" class="scene-light"/><path d="M320 47V10M296 36h48M188 218h-36v62m287-62h49v62M150 145h41m256 0h41"/>',
    train: '<path d="M0 290h640M0 312h640M50 328l46-34m86 34 46-34m86 34 46-34m86 34 46-34" opacity=".45"/><path d="M-22 151h450l93 52v58H-22z" fill="currentColor" fill-opacity=".06"/><path d="M32 165h93v46H32zm121 0h93v46h-93zm121 0h93v46h-93zm125 0h26l62 41h-88zM0 237h495M137 153v108m124-108v108m122-108v108"/><circle cx="65" cy="272" r="16"/><circle cx="200" cy="272" r="16"/><circle cx="410" cy="272" r="16"/><path d="M489 222h19M40 127h265m72-25h180M4 77h174m344 156h118M370 311h200" class="scene-light"/><path d="M531 86h91m-168 46h145" opacity=".3"/>',
    orbital: '<path d="M0 300h640M60 300v-50h520v50" opacity=".3"/><path d="M320 0v250" class="scene-light"/><path d="M320 10v240" opacity=".3" stroke-width="9"/><ellipse cx="320" cy="236" rx="170" ry="22"/><ellipse cx="320" cy="176" rx="120" ry="16"/><ellipse cx="320" cy="176" rx="120" ry="16" transform="translate(0 -60)" opacity=".5"/><path d="M150 236v-60m340 60v-60M200 176v-60m240 60v-60"/><path d="M285 300V236h70v64" fill="currentColor" fill-opacity=".08"/><path d="M40 60l30 30M570 60l30 30M80 120h40M520 120h40" class="scene-light"/><circle cx="110" cy="270" r="18" opacity=".5"/><circle cx="530" cy="270" r="18" opacity=".5"/><path d="M96 270h28M516 270h28" class="scene-light"/>',
    harbor: '<path d="M0 286q35-8 70 0t70 0t70 0t70 0t70 0t70 0t70 0t70 0t70 0M0 316q35-8 70 0t70 0t70 0t70 0t70 0t70 0t70 0t70 0t70 0" opacity=".3"/><path d="M328 250V54h28v196m-28-180-123 50m151-64 168 64H199V98h325v22M493 119v65m-10 0h20v17h-20zM298 250h89"/><path d="M37 210h185v45H37zm43-45h140v45H80zM259 241h310l-28 39H290ZM408 188h89v53h-89zM430 161h30v27h-30z" fill="currentColor" fill-opacity=".07"/><path d="M55 220v26m24-26v26m24-26v26m24-26v26m24-26v26m24-26v26M104 176v24m26-24v24m26-24v24m26-24v24M426 205h17m14 0h17" class="scene-light"/>'
  };
  return '<svg class="chapter-art" viewBox="0 0 640 340" aria-hidden="true"><defs><radialGradient id="' + id + '"><stop stop-color="currentColor" stop-opacity=".15"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs><ellipse cx="320" cy="190" rx="280" ry="170" fill="url(#' + id + ')"/><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (scenes[map] || scenes.reactor) + '</g></svg>';
}
