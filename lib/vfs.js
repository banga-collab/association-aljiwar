/* Association Al Jiwar — "GitHub as a disk" for Vercel (adapted from the Atlas Art Minerals site).
   Vercel functions cannot keep files. When GH_TOKEN and GH_REPO are set, the files written by the admin
   (data/content.json, data/content.backup.json, assets/uploads/*) are read from and committed to the GitHub repository.
   - refresh(): before each request, load the latest data/*.json from GitHub (cheap: ETag on the branch ref);
   - flush(label): commit everything written during the request in ONE commit;
   - uploaded photos are served from raw.githubusercontent.com until the next deployment bundles them. */
"use strict";
const fs = require("fs"), path = require("path"), { Readable } = require("stream");

const TOKEN = process.env.GH_TOKEN || "";
const REPO = process.env.GH_REPO || "";            // "owner/name"
const BRANCH = process.env.GH_BRANCH || "main";
const API = "https://api.github.com", RAW = "https://raw.githubusercontent.com";
const enabled = !!(TOKEN && REPO);
const WRITABLE = /^(data\/[\w.-]+\.json|assets\/uploads\/[\w.-]+)$/;
const WRITABLE_DIRS = /^(data|assets\/uploads)$/;
const TEXT = /\.json$/i;
let ROOT = "";
const S = { head: "", etag: "", checked: 0, tree: new Map(), text: new Map(), raw: new Map(), pending: new Map() };

async function gh(method, url, body, extra) {
  const r = await fetch(API + url, { method, headers: Object.assign({ Authorization: "Bearer " + TOKEN, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "aljiwar-admin" }, body ? { "Content-Type": "application/json" } : {}, extra || {}), body: body ? JSON.stringify(body) : undefined });
  if (r.status === 304) return { status: 304 };
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { /* not json */ }
  if (!r.ok) { const e = new Error("GitHub " + r.status + " " + ((j && j.message) || txt.slice(0, 120))); e.status = r.status; throw e; }
  return { status: r.status, json: j, etag: r.headers.get("etag") || "" };
}

async function refresh(force) {
  if (!enabled || (!force && Date.now() - S.checked < 2000)) return;
  const ref = await gh("GET", "/repos/" + REPO + "/git/ref/heads/" + BRANCH, null, S.etag && !force ? { "If-None-Match": S.etag } : {});
  S.checked = Date.now();
  if (ref.status === 304) return;
  S.etag = ref.etag;
  const head = ref.json.object.sha; if (head === S.head && !force) return;
  const commit = await gh("GET", "/repos/" + REPO + "/git/commits/" + head);
  const tree = await gh("GET", "/repos/" + REPO + "/git/trees/" + commit.json.tree.sha + "?recursive=1");
  const next = new Map(); tree.json.tree.forEach(e => { if (e.type === "blob" && WRITABLE.test(e.path)) next.set(e.path, { sha: e.sha, size: e.size }); });
  for (const [p, v] of next) if (TEXT.test(p) && (!S.tree.get(p) || S.tree.get(p).sha !== v.sha || !S.text.has(p))) {
    const b = await gh("GET", "/repos/" + REPO + "/git/blobs/" + v.sha); S.text.set(p, Buffer.from(b.json.content, "base64"));
  }
  for (const p of [...S.text.keys()]) if (!next.has(p)) S.text.delete(p);
  S.tree = next; S.head = head;
}

let flushing = Promise.resolve();
function flush(label) {
  if (!enabled || !S.pending.size) return flushing;
  flushing = flushing.catch(() => {}).then(async () => {
    for (let attempt = 0; attempt < 4 && S.pending.size; attempt++) {
      const changes = [...S.pending.entries()];
      const photos = changes.some(([p]) => p.startsWith("assets/uploads/"));
      const list = [];
      for (const [p, buf] of changes) {
        if (buf === null) { if (S.tree.has(p)) list.push({ path: p, mode: "100644", type: "blob", sha: null }); continue; }
        const b = await gh("POST", "/repos/" + REPO + "/git/blobs", { content: buf.toString("base64"), encoding: "base64" });
        list.push({ path: p, mode: "100644", type: "blob", sha: b.json.sha });
      }
      if (!list.length) { S.pending.clear(); return; }
      const base = await gh("GET", "/repos/" + REPO + "/git/commits/" + S.head);
      const tree = await gh("POST", "/repos/" + REPO + "/git/trees", { base_tree: base.json.tree.sha, tree: list });
      // text changes are served fresh by the function: no redeploy needed. A new photo redeploys so it becomes a static file.
      const commit = await gh("POST", "/repos/" + REPO + "/git/commits", { message: (label || "Modification depuis l'admin") + (photos ? "" : " [skip-deploy]"), tree: tree.json.sha, parents: [S.head] });
      try { await gh("PATCH", "/repos/" + REPO + "/git/refs/heads/" + BRANCH, { sha: commit.json.sha, force: false }); }
      catch (e) { if (e.status !== 422 && e.status !== 409) throw e; const mine = new Map(S.pending); await refresh(true); S.pending = mine; continue; }
      changes.forEach(([p, buf]) => {
        if (S.pending.get(p) === buf) S.pending.delete(p);
        if (buf === null) { S.tree.delete(p); S.text.delete(p); S.raw.delete(p); }
        else { S.tree.set(p, { sha: "local", size: buf.length }); if (TEXT.test(p)) S.text.set(p, buf); else { S.raw.set(p, buf); if (S.raw.size > 30) S.raw.delete(S.raw.keys().next().value); } }
      });
      S.head = commit.json.sha; S.etag = ""; S.checked = Date.now();
      return;
    }
    if (S.pending.size) { S.pending.clear(); throw new Error("conflit répété avec GitHub, réessayez."); }
  });
  return flushing;
}

/* ---- patch fs for the writable paths only ---- */
function relOf(p) { if (typeof p !== "string") return null; const abs = path.resolve(p); if (!abs.startsWith(ROOT + path.sep)) return null; const r = abs.slice(ROOT.length + 1).split(path.sep).join("/"); return WRITABLE.test(r) || WRITABLE_DIRS.test(r) ? r : null; }
function lookup(rel) {
  if (S.pending.has(rel)) { const b = S.pending.get(rel); return b === null ? { gone: true } : { buf: b }; }
  if (S.text.has(rel)) return { buf: S.text.get(rel) };
  if (S.raw.has(rel)) return { buf: S.raw.get(rel) };
  if (S.tree.has(rel)) return { remote: S.tree.get(rel) };
  return null;
}
const enoent = p => Object.assign(new Error("ENOENT: no such file or directory, '" + p + "'"), { code: "ENOENT" });
const stat = (size, dir) => { const t = new Date(); return { size, isFile: () => !dir, isDirectory: () => !!dir, mtime: t, mtimeMs: +t }; };
const real = {};
function install(root) {
  if (!enabled || real.readFileSync) return;
  ROOT = path.resolve(root);
  ["readFileSync", "writeFileSync", "existsSync", "statSync", "copyFileSync", "mkdirSync", "createReadStream"].forEach(k => { real[k] = fs[k]; });
  fs.readFileSync = function (p, opt) {
    const rel = relOf(p); if (!rel) return real.readFileSync.apply(fs, arguments);
    const f = lookup(rel);
    if (!f || f.gone || f.remote) { if (!f && real.existsSync(p)) return real.readFileSync.apply(fs, arguments); throw enoent(p); }
    const enc = typeof opt === "string" ? opt : opt && opt.encoding;
    return enc ? f.buf.toString(enc) : Buffer.from(f.buf);
  };
  fs.writeFileSync = function (p, data) {
    const rel = relOf(p); if (!rel) return real.writeFileSync.apply(fs, arguments);
    const buf = Buffer.isBuffer(data) ? Buffer.from(data) : Buffer.from(String(data), "utf8");
    const cur = lookup(rel); if (cur && cur.buf && cur.buf.equals(buf)) return;
    S.pending.set(rel, buf);
  };
  fs.copyFileSync = function (a, b) { if (!relOf(a) && !relOf(b)) return real.copyFileSync.apply(fs, arguments); fs.writeFileSync(b, fs.readFileSync(a)); };
  fs.mkdirSync = function (p) { if (relOf(p)) return undefined; return real.mkdirSync.apply(fs, arguments); };
  fs.existsSync = function (p) { const rel = relOf(p); if (!rel) return real.existsSync.apply(fs, arguments); if (WRITABLE_DIRS.test(rel)) return true; const f = lookup(rel); return !!f && !f.gone; };
  fs.statSync = function (p) {
    const rel = relOf(p); if (!rel) return real.statSync.apply(fs, arguments);
    if (WRITABLE_DIRS.test(rel)) return stat(0, true);
    const f = lookup(rel); if (!f || f.gone) { if (!f && real.existsSync(p)) return real.statSync.apply(fs, arguments); throw enoent(p); }
    return stat(f.buf ? f.buf.length : f.remote.size || 0, false);
  };
  fs.createReadStream = function (p) {
    const rel = relOf(p); if (!rel) return real.createReadStream.apply(fs, arguments);
    const f = lookup(rel);
    if (f && f.buf) return Readable.from([Buffer.from(f.buf)]);
    if (real.existsSync(p)) return real.createReadStream.apply(fs, arguments);
    if (f && f.remote) {   // just uploaded, not in this deployment yet
      const url = RAW + "/" + REPO + "/" + S.head + "/" + rel;
      return Readable.from((async function* () { const r = await fetch(url, { headers: { Authorization: "Bearer " + TOKEN } }); if (!r.ok) throw enoent(p); yield Buffer.from(await r.arrayBuffer()); })());
    }
    const s = new Readable({ read() {} }); process.nextTick(() => s.destroy(enoent(p))); return s;
  };
}
module.exports = { enabled, install, refresh, flush, repo: REPO };
