// Reading files people bring: CSV and JSON movie lists, and Letterboxd data exports (the ZIP itself,
// or the CSVs inside it). Everything is read in the browser; nothing is uploaded.
import { validRating, validDate } from "../compat/validate.js";
import { normalized } from "../tmdb/client.js";

// Minimal CSV parser (RFC 4180: quoted fields, doubled quotes, newlines in quotes).
export function parseCSV(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}
// Rows as objects, starting at the first line that looks like a header (Letterboxd list exports have a preamble).
export function csvObjects(text, must = ["name", "year"]) {
  const rows = parseCSV(text);
  const at = rows.findIndex((r) => {
    const h = r.map((x) => x.trim().toLowerCase());
    return must.every((m) => h.includes(m) || (m === "name" && h.includes("title")));
  });
  if (at < 0) return null;
  const head = rows[at].map((x) => x.trim().toLowerCase());
  return rows.slice(at + 1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// Reads the Letterboxd CSVs inside a ZIP with the browser's own decompressor.
export async function unzip(file) {
  const buf = new Uint8Array(await file.arrayBuffer()),
    view = new DataView(buf.buffer);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw Error("That ZIP file could not be read.");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const out = {};
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true),
      size = view.getUint32(p + 20, true),
      nameLen = view.getUint16(p + 28, true),
      extraLen = view.getUint16(p + 30, true),
      commentLen = view.getUint16(p + 32, true),
      local = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    const base = name.split("/").pop().toLowerCase();
    if (!/^(ratings|diary|watched|reviews)\.csv$/.test(base) || name.includes("deleted/")) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = buf.subarray(start, start + size);
    let bytes;
    if (method === 0) bytes = data;
    else if (method === 8) {
      if (typeof DecompressionStream === "undefined") throw Error("This browser can't open ZIP files. Choose the CSV files instead.");
      bytes = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    } else continue;
    out[base] = new TextDecoder().decode(bytes);
  }
  return out;
}

// Title/year matching against the list. Handles long Letterboxd titles like
// "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb".
export function letterboxdMatcher(films) {
  const byKey = new Map();
  for (const f of films) byKey.set(normalized(f.t) + "|" + f.y, f);
  return (name, year) => {
    const k = normalized(name),
      y = Number(year);
    if (!k || !y) return null;
    let f = byKey.get(k + "|" + y);
    if (f) return f;
    // Same film listed a year apart (festival vs. release year).
    for (const dy of [-1, 1]) if ((f = byKey.get(k + "|" + (y + dy)))) return f;
    // One title is the start of the other ("Dr. Strangelove" / "Dr. Strangelove or: …").
    const cands = films.filter((x) => Math.abs(x.y - y) <= 1 && normalized(x.t).length >= 6 && (k.startsWith(normalized(x.t)) || normalized(x.t).startsWith(k)));
    return cands.length === 1 ? cands[0] : null;
  };
}

export async function readLetterboxd(files, films) {
  const texts = {};
  for (const file of files) {
    if (file.size > 30_000_000) throw Error(file.name + " is too large.");
    if (/\.zip$/i.test(file.name) || file.type === "application/zip") Object.assign(texts, await unzip(file));
    else texts[file.name.toLowerCase().split("/").pop()] = await file.text();
  }
  const match = letterboxdMatcher(films);
  const found = new Map(), // id -> {rating, date}
    unmatched = new Map();
  const take = (rows, kind) => {
    for (const r of rows || []) {
      const name = r.name || r.title,
        year = r.year;
      if (!name) continue;
      const f = match(name, year);
      if (!f) {
        if (kind !== "watched") unmatched.set(name + " (" + year + ")", true);
        continue;
      }
      const e = found.get(f.id) || { rating: null, date: null };
      const rating = r.rating ? Number(r.rating) : null;
      if (rating && validRating(rating)) e.rating = rating; // ratings.csv is read last, so it wins
      const d = r["watched date"] || (kind === "diary" ? r.date : "");
      if (d && validDate(d) && (!e.date || d > e.date)) e.date = d; // most recent diary entry
      found.set(f.id, e);
    }
  };
  const get = (n) => (texts[n] ? csvObjects(texts[n]) : null);
  const diary = get("diary.csv"),
    reviewsCsv = get("reviews.csv"),
    watched = get("watched.csv"),
    ratings = get("ratings.csv");
  const other = Object.entries(texts).filter(([n]) => !/^(ratings|diary|watched|reviews)\.csv$/.test(n));
  for (const [, t] of other) {
    const rows = csvObjects(t);
    if (rows && rows[0] && ("rating" in rows[0] || "watched date" in rows[0])) take(rows, "diary");
  }
  if (!diary && !ratings && !reviewsCsv && !watched && !other.length) throw Error("No Letterboxd files found. Choose the export ZIP, or ratings.csv and diary.csv.");
  take(watched, "watched");
  take(diary, "diary");
  take(reviewsCsv, "diary");
  take(ratings, "ratings");
  return { found, unmatched: [...unmatched.keys()] };
}

// What an import would change, grouped the way the preview offers it.
export function letterboxdPlan({ found }, p) {
  const watchedHere = [],
    notYet = [];
  for (const [id, e] of found) (p.seen.has(id) ? watchedHere : notYet).push([id, e]);
  const rating = (id) => p.reviews[id]?.rating;
  return {
    found,
    watchedHere,
    notYet,
    missingRating: watchedHere.filter(([id, e]) => e.rating && !rating(id)),
    differentRating: watchedHere.filter(([id, e]) => e.rating && rating(id) && rating(id) !== e.rating),
    missingDate: watchedHere.filter(([id, e]) => e.date && !p.dates[id]),
    differentDate: watchedHere.filter(([id, e]) => e.date && p.dates[id] && p.dates[id] !== e.date),
    prefill: notYet.filter(([, e]) => e.rating),
  };
}

// A movie list from a CSV or JSON file.
export function listRowsFromText(text, fileName) {
  const trimmed = text.trim();
  if (/\.json$/i.test(fileName) || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const obj = JSON.parse(trimmed);
    const films = Array.isArray(obj) ? obj : obj.films;
    return {
      name: obj.name,
      subtitle: obj.subtitle,
      palette: obj.palette,
      series: obj.series,
      shelves: obj.shelves && typeof obj.shelves === "object" ? obj.shelves : null,
      films,
    };
  }
  const rows = csvObjects(text, ["year"]);
  if (!rows) throw Error("The CSV needs a header row with title and year columns.");
  // Letterboxd list exports carry the list name in their preamble.
  const pre = parseCSV(text);
  const metaAt = pre.findIndex((r) => r.map((x) => x.toLowerCase()).includes("name") && r.map((x) => x.toLowerCase()).includes("url"));
  const lbName = metaAt >= 0 && pre[metaAt + 1] ? pre[metaAt + 1][pre[metaAt].map((x) => x.toLowerCase()).indexOf("name")] : "";
  return { name: lbName || fileName.replace(/\.[^.]+$/, ""), films: rows.map((r) => ({ ...r, title: r.title || r.name || r.film })) };
}
