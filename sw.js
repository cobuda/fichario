// Guarda os arquivos do aplicativo para ele abrir mesmo sem internet.
// Ao publicar uma nova versão, troque o número abaixo para os celulares baixarem a atualização.
const VERSAO = "fichario-v1";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icone-192.png",
  "./icone-512.png",
  "./icone-mascara-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fontes: usa a cópia guardada e atualiza quando houver internet.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(VERSAO).then(async (c) => {
        const guardada = await c.match(req);
        const rede = fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => guardada);
        return guardada || rede;
      })
    );
    return;
  }

  // Outros sites (leitura do Gemini, Liga Pokémon): sempre pela internet.
  if (url.origin !== self.location.origin) return;

  // Arquivos do aplicativo: tenta a internet primeiro para pegar atualizações; sem conexão, usa a cópia.
  e.respondWith(
    fetch(req)
      .then((r) => { if (r.ok) caches.open(VERSAO).then((c) => c.put(req, r.clone())); return r; })
      .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
  );
});
