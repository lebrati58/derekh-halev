/* Service worker minimal de דרך הלב : rend le site installable (« 📲 התקנה » sur Android).
   AUCUN cache : tout vient du réseau, comme avant. Seul ajout : sans connexion, une page claire
   au lieu de l'erreur du navigateur. Pas enregistré sur iPhone (voir index.html). */
const OFFLINE = `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>דרך הלב</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#1f1238;color:#f6eedd;font-family:system-ui,sans-serif;text-align:center;padding:24px">
<div><div style="font-size:3rem">💗</div><h2 style="color:#f3d88a">אין חיבור לאינטרנט</h2><p>No internet connection · Pas de connexion internet</p>
<button onclick="location.reload()" style="margin-top:10px;padding:12px 26px;border:0;border-radius:999px;background:#d4a94a;color:#2a1640;font-size:1rem;font-weight:700">נסו שוב · Retry · Réessayer</button></div></body></html>`;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.mode !== "navigate") return;   // le reste (scripts, Firebase…) n'est pas touché
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
