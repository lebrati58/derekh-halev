/* ==========================================================================
   דרך הלב — photos.js : photos privées, « קודם הלב, אחר כך הפנים »
   - Jusqu'à 4 photos (1 = principale), JAMAIS visibles dans les cartes,
     propositions, recherche ou demandes.
   - Partage individuel, volontaire, non réciproque, depuis une conversation
     où les DEUX ont écrit ; révocable à tout moment.
   - Sécurité dans database.rules.json : photos/{uid}/{1..4} et
     photoThumbs/{uid}/{1..4} ne sont lisibles que par leur propriétaire et
     par ceux qu'il a autorisés (photoShares/{owner}/{viewer}.active).
     L'admin ne lit ni les photos ni les partages (photoMeta : nombre seul).
   - Les photos sont recadrées et ré-encodées en JPEG dans le navigateur
     (canvas) : métadonnées EXIF/GPS supprimées, taille limitée.
   Utilise les globales de index.html (db, uid, me, profiles, myChats,
   currentChat…) au moment de l'appel ; chargé avant le script inline.
   ========================================================================== */

const PH = { MAX: 4, W: 1080, H: 1350, TW: 240, TH: 300, MAXLEN: 300000, TMAXLEN: 40000 };
let myThumbs = {};            // slot -> miniature (data URL) de MES photos
let myShares = {};            // viewerUid -> {chatId, no, ts, active}
let partnerShare = null;      // autorisation que le partenaire du chat ouvert m'a donnée
let partnerShareRef = null;
const chatSenders = {};       // chatId -> {uid: true} (qui a écrit, vu dans les messages)
let galleryClose = null;

const phCount = () => [1, 2, 3, 4].filter(k => myThumbs[k]).length;
const phPartner = m => (m.from === uid ? m.to : m.from);
const phPartnerNo = m => (m.from === uid ? m.toNo : m.fromNo);

function photosStart() {
  db.ref("photoThumbs/" + uid).on("value", s => { myThumbs = s.val() || {}; renderMyPhotos(); if (currentChat) photoBar(); }, () => {});
  db.ref("photoShares/" + uid).on("value", s => { myShares = s.val() || {}; renderMyShares(); if (currentChat) photoBar(); }, () => {});
}

/* ---------------- « התמונות שלי » ---------------- */
function renderMyPhotos() {
  const grid = $("#ph-grid");
  if (!grid) return;
  const n = phCount();
  grid.innerHTML = [1, 2, 3, 4].map(k => {
    const label = k === 1 ? t("ph_main") : t("ph_extra", { n: k - 1 });
    if (myThumbs[k]) return `<button type="button" class="ph-slot filled${k === 1 ? " main" : ""}" data-ph-slot="${k}" aria-label="${esc(label)}">
        <span class="ph-img" style="background-image:url('${myThumbs[k]}')"></span>${k === 1 ? '<span class="ph-star">⭐</span>' : ""}<span class="ph-lbl">${esc(label)}</span></button>`;
    if (k === n + 1) return `<button type="button" class="ph-slot add${k === 1 ? " main" : ""}" data-ph-add="${k}" aria-label="${esc(t("ph_add") + " — " + label)}">
        <span class="ph-plus">＋</span><span class="ph-lbl">${esc(label)}</span></button>`;
    return `<div class="ph-slot empty"><span class="ph-lbl">${esc(label)}</span></div>`;
  }).join("");
}

function renderMyShares() {
  const box = $("#ph-shares");
  if (!box) return;
  const list = Object.entries(myShares).sort((a, b) => (b[1].active - a[1].active) || ((b[1].ts || 0) - (a[1].ts || 0)));
  if (!list.length) { box.innerHTML = `<div class="ph-none">${esc(t("ph_shares_none"))}</div>`; return; }
  box.innerHTML = list.map(([v, s]) => {
    const p = profiles[v];
    const info = p ? `${esc(p.age)} · ${esc(p.city)}` : "";
    const date = s.ts ? new Date(s.ts).toLocaleDateString(LANG === "he" ? "he-IL" : LANG) : "";
    return `<div class="ph-share-row${s.active ? "" : " off"}">
      <div class="ph-share-who"><b>${esc(profileName(s.no))}</b>${info ? ` <span class="ph-share-info">${info}</span>` : ""}
        <span class="ph-share-date">${esc(t("ph_since", { date }))}</span></div>
      <span class="ph-chip ${s.active ? "on" : "off"}">${esc(t(s.active ? "ph_active" : "ph_revoked"))}</span>
      ${s.active ? `<button type="button" class="btn ghost small" data-ph-revoke="${esc(v)}">${esc(t("ph_revoke"))}</button>` : ""}
    </div>`;
  }).join("");
}

/* Feuille d'actions (liste de boutons), résout la clé choisie ou null */
function phSheet(title, items) {
  return new Promise(resolve => {
    const wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.innerHTML = `<div class="modal ph-sheet" role="dialog" aria-modal="true">
      ${title ? `<h3>${esc(title)}</h3>` : ""}
      ${items.map(i => `<button type="button" class="btn ${i.danger ? "danger" : "ghost"}" data-k="${i.key}">${esc(i.label)}</button>`).join("")}
      <button type="button" class="btn link" data-k="">${esc(t("cancel"))}</button></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("show"));
    // la sélection de fichier doit partir du geste de l'utilisateur : on appelle onPick AVANT de fermer
    wrap.addEventListener("click", e => {
      const b = e.target.closest("[data-k]");
      if (!b && e.target !== wrap) return;
      const k = b ? b.dataset.k : "";
      const it = items.find(i => i.key === k);
      if (it && it.onPick) it.onPick();
      wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 200);
      resolve(k || null);
    });
  });
}

/* Ouvre le sélecteur de fichier (galerie) ou l'appareil photo — doit être appelé dans un clic */
function phPickFile(camera) {
  return new Promise(resolve => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    if (camera) inp.setAttribute("capture", "user");
    inp.style.display = "none";
    document.body.appendChild(inp);
    inp.addEventListener("change", () => { resolve(inp.files && inp.files[0] || null); inp.remove(); }, { once: true });
    inp.click();
  });
}

async function phAskSource() {
  let picked = null;
  const k = await phSheet("", [
    { key: "g", label: t("ph_from_gallery"), onPick: () => { picked = phPickFile(false); } },
    { key: "c", label: t("ph_camera"), onPick: () => { picked = phPickFile(true); } }
  ]);
  return k && picked ? await picked : null;
}

/* Charge le fichier en image (refuse ce qui n'est pas une image décodable) */
async function phLoadImage(file) {
  if (!file || (file.type && !file.type.startsWith("image/")) || file.size > 30e6) throw new Error("bad_file");
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try { await img.decode(); } catch (e) { URL.revokeObjectURL(url); throw new Error("bad_file"); }
  if (!img.naturalWidth || !img.naturalHeight) throw new Error("bad_file");
  return img;
}

/* Recadrage 4:5 : glisser pour placer, curseur ou pincement pour zoomer.
   Résout {full, thumb} (JPEG ré-encodés, sans EXIF) ou null si annulé. */
function phCrop(img) {
  return new Promise(resolve => {
    const wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.innerHTML = `<div class="modal ph-crop" role="dialog" aria-modal="true">
      <h3>${esc(t("ph_crop_title"))}</h3>
      <div class="ph-frame"><img alt="" draggable="false"></div>
      <input type="range" class="ph-zoom" min="1" max="3" step="0.01" value="1" aria-label="zoom">
      <p class="ph-hint">${esc(t("ph_crop_hint"))}</p>
      <div class="modal-actions"><button class="btn ghost" data-a="cancel">${esc(t("cancel"))}</button><button class="btn gold" data-a="ok">${esc(t("ph_crop_ok"))}</button></div>
    </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("show"));
    const frame = $(".ph-frame", wrap), im = $("img", frame), zoom = $(".ph-zoom", wrap);
    im.src = img.src;
    const fw = () => frame.clientWidth, fh = () => frame.clientHeight;
    const base = () => Math.max(fw() / img.naturalWidth, fh() / img.naturalHeight);
    let z = 1, ox = 0, oy = 0;
    const clamp = () => {
      const s = base() * z, w = img.naturalWidth * s, h = img.naturalHeight * s;
      ox = Math.min(0, Math.max(fw() - w, ox)); oy = Math.min(0, Math.max(fh() - h, oy));
    };
    const draw = () => { clamp(); const s = base() * z; im.style.width = img.naturalWidth * s + "px"; im.style.transform = `translate(${ox}px,${oy}px)`; };
    const center = () => { const s = base() * z; ox = (fw() - img.naturalWidth * s) / 2; oy = (fh() - img.naturalHeight * s) / 2; draw(); };
    const zoomAt = (nz, cx = fw() / 2, cy = fh() / 2) => {
      nz = Math.min(3, Math.max(1, nz));
      const s0 = base() * z, s1 = base() * nz;
      ox = cx - (cx - ox) * s1 / s0; oy = cy - (cy - oy) * s1 / s0; z = nz; zoom.value = z; draw();
    };
    requestAnimationFrame(center);
    zoom.addEventListener("input", () => zoomAt(+zoom.value));
    const pts = new Map(); let pinch0 = 0, z0 = 1;
    frame.addEventListener("pointerdown", e => { frame.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); z0 = z; } });
    frame.addEventListener("pointermove", e => {
      const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 1) { ox += e.clientX - p.x; oy += e.clientY - p.y; draw(); }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2 && pinch0) { const [a, b] = [...pts.values()]; zoomAt(z0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0); }
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
    frame.addEventListener("pointerup", up); frame.addEventListener("pointercancel", up);
    const close = v => { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 200); URL.revokeObjectURL(img.src); resolve(v); };
    wrap.addEventListener("click", e => {
      const a = e.target.getAttribute && e.target.getAttribute("data-a");
      if (a === "cancel") return close(null);
      if (a !== "ok") return;
      const s = base() * z, src = { x: -ox / s, y: -oy / s, w: fw() / s, h: fh() / s };
      close({ full: phEncode(img, src, PH.W, PH.H, PH.MAXLEN), thumb: phEncode(img, src, PH.TW, PH.TH, PH.TMAXLEN) });
    });
  });
}

/* Dessine la zone choisie dans un canvas et ré-encode en JPEG (supprime EXIF/GPS) sous la taille max */
function phEncode(img, src, W, H, maxLen) {
  for (const scale of [1, .8, .6]) {
    const c = document.createElement("canvas");
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, c.width, c.height);
    for (const q of [.85, .75, .65, .55, .45]) {
      const d = c.toDataURL("image/jpeg", q);
      if (d.startsWith("data:image/jpeg;base64,") && d.length <= maxLen) return d;
    }
  }
  throw new Error("too_big");
}

/* Écrit la liste ordonnée [{full, thumb}] dans les emplacements 1..4 (atomique) */
async function phWriteAll(list) {
  const u = {};
  for (let k = 1; k <= PH.MAX; k++) {
    u[`photos/${uid}/${k}`] = list[k - 1] ? list[k - 1].full : null;
    u[`photoThumbs/${uid}/${k}`] = list[k - 1] ? list[k - 1].thumb : null;
  }
  u[`photoMeta/${uid}`] = { n: list.length, ts: TS };
  await db.ref().update(u);
}
async function phLoadMine() {
  const s = await db.ref("photos/" + uid).once("value"), full = s.val() || {};
  return [1, 2, 3, 4].filter(k => full[k] && myThumbs[k]).map(k => ({ full: full[k], thumb: myThumbs[k] }));
}

async function phAddOrReplace(slot, replace) {
  if (!replace && phCount() >= PH.MAX) return toast(t("ph_max"));
  const file = await phAskSource();
  if (!file) return;
  let img;
  try { img = await phLoadImage(file); } catch (e) { track("ph_err_file"); return toast(t("ph_bad_file"), 4000); }
  let out;
  try { out = await phCrop(img); } catch (e) { track("ph_err_encode"); return toast(t("ph_bad_file"), 4000); }
  if (!out) return;
  try {
    if (replace) {
      await db.ref().update({ [`photos/${uid}/${slot}`]: out.full, [`photoThumbs/${uid}/${slot}`]: out.thumb, [`photoMeta/${uid}`]: { n: phCount(), ts: TS } });
    } else {
      const k = phCount() + 1;
      if (k > PH.MAX) return toast(t("ph_max"));
      await db.ref().update({ [`photos/${uid}/${k}`]: out.full, [`photoThumbs/${uid}/${k}`]: out.thumb, [`photoMeta/${uid}`]: { n: k, ts: TS } });
    }
    toast(t(replace ? "ph_replaced" : "ph_added")); track(replace ? "ph_replace" : "ph_add");
  } catch (e) { console.error(e); toast(t("ph_save_fail"), 4500); track("ph_err_save"); }
}

async function phSlotMenu(k) {
  const n = phCount();
  const items = [{ key: "view", label: t("ph_view") }];
  if (k > 1) items.push({ key: "main", label: t("ph_make_main") });
  if (k > 1) items.push({ key: "up", label: t("ph_move_earlier") });
  if (k < n) items.push({ key: "down", label: t("ph_move_later") });
  items.push({ key: "replace", label: t("ph_replace") }, { key: "del", label: t("ph_delete"), danger: true });
  const a = await phSheet(k === 1 ? t("ph_main") : t("ph_extra", { n: k - 1 }), items);
  if (!a) return;
  if (a === "view") return openGallery(uid, k - 1);
  if (a === "replace") return phAddOrReplace(k, true);
  if (a === "del" && !(await showModal({ title: t("ph_del_confirm"), okText: t("ph_delete"), cancelText: t("cancel"), danger: true }))) return;
  try {
    const list = await phLoadMine(), i = k - 1;
    if (a === "del") list.splice(i, 1);
    else if (a === "main") list.unshift(list.splice(i, 1)[0]);
    else if (a === "up") [list[i - 1], list[i]] = [list[i], list[i - 1]];
    else if (a === "down") [list[i + 1], list[i]] = [list[i], list[i + 1]];
    await phWriteAll(list);
    toast(t(a === "del" ? "ph_deleted" : "ph_reordered")); track(a === "del" ? "ph_delete" : "ph_reorder");
  } catch (e) { console.error(e); toast(t("ph_save_fail"), 4500); track("ph_err_save"); }
}

/* ---------------- Galerie plein écran ---------------- */
async function openGallery(owner, start = 0) {
  if (galleryClose) galleryClose();
  const isMine = owner === uid;
  let thumbs;
  try { thumbs = (await db.ref("photoThumbs/" + owner).once("value")).val() || {}; }
  catch (e) { return toast(t("ph_no_access"), 3500); }
  const keys = [1, 2, 3, 4].filter(k => thumbs[k]);
  if (!keys.length) return toast(t("ph_no_access"), 3500);
  const p = profiles[owner];
  const title = isMine ? t("ph_mine") : t("ph_see", { name: profileName(p ? p.no : "") }).replace(/^📷\s*/, "");
  const mark = isMine ? "" : esc(t("ph_watermark", { name: profileName(me && me.no) }));
  const g = document.createElement("div");
  g.className = "ph-gallery";
  g.setAttribute("role", "dialog"); g.setAttribute("aria-modal", "true");
  g.innerHTML = `<div class="ph-g-head"><span class="ph-g-title">${esc(title)}</span><span class="ph-g-count" dir="ltr"></span>
      <button type="button" class="icon-btn ph-g-close" aria-label="${esc(t("ph_close"))}">✕</button></div>
    <div class="ph-g-bars" dir="ltr">${keys.map(() => "<i></i>").join("")}</div>
    <div class="ph-g-track" dir="ltr">${keys.map(k => `<div class="ph-g-slide"><div class="ph-g-img" data-k="${k}" style="background-image:url('${thumbs[k]}')"></div>${mark ? `<div class="ph-g-mark" aria-hidden="true">${Array(12).fill(`<span>${mark}</span>`).join("")}</div>` : ""}</div>`).join("")}</div>
    <button type="button" class="ph-g-nav prev" aria-label="‹">‹</button><button type="button" class="ph-g-nav next" aria-label="›">›</button>`;
  document.body.appendChild(g);
  document.body.classList.add("ph-open");
  const track_ = $(".ph-g-track", g), bars = $$(".ph-g-bars i", g), count = $(".ph-g-count", g);
  const idx = () => Math.round(track_.scrollLeft / track_.clientWidth);
  const mark_ = () => { const i = idx(); bars.forEach((b, j) => b.classList.toggle("on", j === i)); count.textContent = `${i + 1} / ${keys.length}`; };
  const go = i => track_.scrollTo({ left: Math.max(0, Math.min(keys.length - 1, i)) * track_.clientWidth, behavior: "smooth" });
  track_.addEventListener("scroll", () => requestAnimationFrame(mark_));
  $(".prev", g).onclick = () => go(idx() - 1); $(".next", g).onclick = () => go(idx() + 1);
  g.addEventListener("contextmenu", e => e.preventDefault());
  g.addEventListener("dragstart", e => e.preventDefault());
  const onKey = e => { if (e.key === "Escape") close(); else if (e.key === "ArrowRight") go(idx() + 1); else if (e.key === "ArrowLeft") go(idx() - 1); };
  document.addEventListener("keydown", onKey);
  let watch = null;
  const close = () => {
    if (watch) watch.off();
    document.removeEventListener("keydown", onKey);
    document.body.classList.remove("ph-open");
    g.remove(); galleryClose = null;
  };
  galleryClose = close;
  $(".ph-g-close", g).onclick = close;
  requestAnimationFrame(() => { track_.scrollLeft = start * track_.clientWidth; mark_(); });
  // accès retiré pendant la consultation → on ferme et on oublie les images
  if (!isMine) {
    watch = db.ref(`photoShares/${owner}/${uid}/active`);
    watch.on("value", s => { if (s.val() !== true) { close(); toast(t("ph_no_access"), 3500); } }, () => close());
  }
  track(isMine ? "ph_view_mine" : "ph_view");
  // puis les photos en pleine qualité
  try {
    const full = (await db.ref("photos/" + owner).once("value")).val() || {};
    if (!g.isConnected) return;
    $$(".ph-g-img", g).forEach(el => { const f = full[el.dataset.k]; if (f) el.style.backgroundImage = `url('${f}')`; });
  } catch (e) { if (g.isConnected) { close(); toast(t("ph_no_access"), 3500); } }
}

/* ---------------- Dans une conversation ---------------- */
function photosNoteSender(chatId, from) {
  if (!chatId || !from) return;
  const s = chatSenders[chatId] = chatSenders[chatId] || {};
  if (s[from]) return;
  s[from] = true;
  // anciens chats : « j'ai écrit » n'était pas toujours noté → on le rattrape (nécessaire au partage)
  if (from === uid && !store.get("ca_" + chatId)) db.ref(`chatActivity/${chatId}/${uid}`).set(true).then(() => store.set("ca_" + chatId, 1)).catch(() => {});
  if (chatId === currentChat) photoBar();
}

function photosOpenChat(id) {
  photosCloseChat();
  const m = myChats[id];
  if (!m) return;
  partnerShareRef = db.ref(`photoShares/${phPartner(m)}/${uid}`);
  partnerShareRef.on("value", s => { partnerShare = s.val(); photoBar(); }, () => { partnerShare = null; photoBar(); });
}
function photosCloseChat() {
  if (partnerShareRef) { partnerShareRef.off(); partnerShareRef = null; }
  partnerShare = null;
  const bar = $("#photo-bar"); if (bar) bar.innerHTML = "";
}

function photoBar() {
  const bar = $("#photo-bar");
  const id = currentChat, m = id && myChats[id];
  if (!bar) return;
  if (!m) { bar.innerHTML = ""; return; }
  const pu = phPartner(m), name = profileName(phPartnerNo(m));
  const active = m.status === "active";
  const senders = chatSenders[id] || {};
  const mutual = !!(senders[uid] && senders[pu]);
  const mine = myShares[pu] && myShares[pu].active;
  const parts = [];
  if (partnerShare && partnerShare.active) parts.push(`<button type="button" class="btn gold small" data-ph-see="${esc(pu)}">${esc(t("ph_see", { name }))}</button>`);
  if (mine) parts.push(`<span class="ph-on">${esc(t("ph_shared_on"))}</span> <button type="button" class="btn link small" data-ph-revoke="${esc(pu)}">${esc(t("ph_revoke"))}</button>`);
  else if (active && mutual && phCount()) parts.push(`<button type="button" class="btn ghost small" data-ph-share>${esc(t("ph_share_btn"))}</button>`);
  else if (active && mutual) parts.push(`<button type="button" class="btn link small" data-ph-goto>${esc(t("ph_add_first"))}</button>`);
  else if (active) parts.push(`<span class="ph-wait">${esc(t("ph_wait"))}</span>`);
  bar.innerHTML = parts.join(" ");
}

async function shareMyPhotos() {
  const id = currentChat, m = myChats[id];
  if (!m) return;
  const pu = phPartner(m), no = phPartnerNo(m), name = profileName(no);
  const ok = await showModal({ title: t("ph_share_title", { name }), body: esc(t("ph_share_body", { name })), okText: t("ph_share_ok"), cancelText: t("cancel") });
  if (!ok) return;
  try {
    await db.ref(`chatActivity/${id}/${uid}`).set(true).catch(() => {});
    await db.ref(`photoShares/${uid}/${pu}`).set({ chatId: id, no, ts: TS, active: true });
    toast(t("ph_shared")); track("ph_share");
  } catch (e) { console.error(e); toast(t("ph_share_fail"), 5000); track("ph_err_share"); }
}
async function revokeShare(viewer) {
  try {
    await db.ref(`photoShares/${uid}/${viewer}`).update({ active: false, ts: TS });
    toast(t("ph_unshared")); track("ph_unshare");
  } catch (e) { console.error(e); toast(t("send_fail")); }
}

/* Suppression du profil : photos, miniatures, compteur et partages */
function photosWipeMine() {
  return db.ref().update({ [`photos/${uid}`]: null, [`photoThumbs/${uid}`]: null, [`photoMeta/${uid}`]: null, [`photoShares/${uid}`]: null });
}

/* Clics (délégation) */
document.addEventListener("click", e => {
  const add = e.target.closest("[data-ph-add]");
  if (add) return phAddOrReplace(+add.dataset.phAdd, false);
  const slot = e.target.closest("[data-ph-slot]");
  if (slot) return phSlotMenu(+slot.dataset.phSlot);
  const rv = e.target.closest("[data-ph-revoke]");
  if (rv) return revokeShare(rv.dataset.phRevoke);
  const see = e.target.closest("[data-ph-see]");
  if (see) return openGallery(see.dataset.phSee, 0);
  if (e.target.closest("[data-ph-share]")) return shareMyPhotos();
  if (e.target.closest("[data-ph-goto]")) {
    if (typeof closeChat === "function") closeChat();
    const sec = $("#my-photos"); if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
