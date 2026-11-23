/* Vercel entry point: every page and every /api/ call goes through server.js.
   Environment variables (Vercel › Project › Settings › Environment Variables):
     ADMIN_PASSWORD  password of the admin (/admin)
     GH_TOKEN        GitHub fine-grained token, "Contents: Read and write" on the repository below
     GH_REPO         owner/name of this site's repository (e.g. banga-collab/association-aljiwar)
   What the admin saves is committed to GitHub (lib/vfs.js). */
"use strict";
const path = require("path");
const vfs = require("../lib/vfs");
vfs.install(path.join(__dirname, ".."));
let handle = null;

module.exports = async (req, res) => {
  const html = (code, msg) => { res.statusCode = code; res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Association Al Jiwar</title><body style="font:16px/1.6 system-ui;background:#fffaf3;color:#17324a;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px"><main style="max-width:560px"><h1 style="font-size:22px">Association Al Jiwar</h1><p>' + msg + "</p></main></body>"); };
  if (!vfs.enabled) {   // no GitHub token yet: the site works from the deployment, the admin can log in but not save
    if (req.method === "POST" && (req.url.startsWith("/api/content") || req.url.startsWith("/api/upload"))) { res.statusCode = 503; res.setHeader("Content-Type", "application/json; charset=utf-8"); return res.end(JSON.stringify({ error: "Enregistrement impossible : ajoutez GH_TOKEN et GH_REPO dans Vercel (Settings › Environment Variables), puis redéployez." })); }
    if (!handle) handle = require("../server.js");
    return handle(req, res);
  }
  try { await vfs.refresh(!handle); } catch (e) {
    console.error("[vfs] refresh", e.message);
    if (!handle) return html(503, e.status === 401 || e.status === 403 || e.status === 404
      ? "La clé GitHub (GH_TOKEN) n'a pas accès au dépôt " + vfs.repo + ". Donnez-lui « Contents : Read and write » sur ce dépôt."
      : "Connexion à GitHub impossible pour le moment. Réessayez dans une minute.");
  }
  if (!handle) handle = require("../server.js");
  const writes = req.method !== "GET" && req.method !== "HEAD";
  if (!writes) return handle(req, res);
  // hold the answer of a save until GitHub has the commit, so an error can still be reported
  const orig = { writeHead: res.writeHead.bind(res), end: res.end.bind(res) };
  let head = null;
  res.writeHead = (...a) => { head = a; return res; };
  res.end = (body) => {
    const label = "Admin : " + req.url.split("?")[0].replace("/api/", "");
    vfs.flush(label).then(() => {
      if (head) orig.writeHead(...head); orig.end(body);
    }, e => {
      console.error("[vfs] flush", e.message);
      orig.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      orig.end(JSON.stringify({ error: "Enregistrement sur GitHub impossible : " + e.message }));
    });
    return res;
  };
  return handle(req, res);
};
