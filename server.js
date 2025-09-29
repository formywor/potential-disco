// server.js
// Small Express server used as a proxy for Gomega AI.
// - /api/search?q=...&count=10&thinking=true  => aggregated snippets (no source names/URLs returned)
// - /api/calc   (POST JSON { query }) => smart math/geometry logic
// - /api/upload (POST multipart/form-data file=photo) => saves file and returns public URL
//
// Run: npm install && node server.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { create, all } = require('mathjs');

const math = create(all);
math.import({
  // avoid risky functions if needed; mathjs is safe for arithmetic
}, { override: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '512kb' }));

// static upload dir
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// multer for uploads (limit file size)
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (png/jpg/gif/webp)'));
  }
});

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR, { index: false, extensions: ['jpg','png','webp','gif'] }));

// Helper: fetch JSON with timeout
async function fetchWithTimeout(url, opts = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Server-side search/proxy: get several snippets (no source info returned to client)
async function fetchAggregated(query, desiredCount = 10, aggressive = false) {
  const pieces = [];

  // 1) Wikipedia summary (REST)
  try {
    const w = await fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, {}, 3000);
    if (w.ok) {
      const j = await w.json();
      if (j && j.extract && j.extract.length > 30) pieces.push(j.extract);
    }
  } catch (e) { /* ignore */ }

  // 2) DuckDuckGo instant
  try {
    const d = await fetchWithTimeout(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, {}, 3000);
    if (d.ok) {
      const j = await d.json();
      const text = j.Abstract || (j.RelatedTopics ? j.RelatedTopics.map(t => t.Text).join('. ') : '');
      if (text && text.length > 30) pieces.push(text);
    }
  } catch (e) { /* ignore */ }

  // 3) Wikipedia search hits (titles -> summary)
  try {
    const sr = await fetchWithTimeout(`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${aggressive ? 8 : 6}&origin=*`, {}, 4000);
    if (sr.ok) {
      const jsr = await sr.json();
      const hits = (jsr.query && jsr.query.search) ? jsr.query.search : [];
      for (let i = 0; i < hits.length && pieces.length < desiredCount; i++) {
        try {
          const title = hits[i].title;
          const s = await fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {}, 3000);
          if (s.ok) {
            const sj = await s.json();
            if (sj && sj.extract && sj.extract.length > 20) pieces.push(sj.extract);
          }
        } catch (e) { /* ignore per-hit */ }
      }
    }
  } catch (e) { /* ignore */ }

  // optional expansion queries if still short
  const expansions = ['history','release date','overview','timeline','founding','specifications','launch date','origin'];
  if (aggressive) {
    for (const ex of expansions) {
      if (pieces.length >= desiredCount) break;
      try {
        const r = await fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query + ' ' + ex)}`, {}, 2500);
        if (r.ok) {
          const j = await r.json();
          if (j && j.extract && j.extract.length > 30) pieces.push(j.extract);
        }
      } catch (e) { /* ignore */ }
    }
  }

  // dedupe short and return up to desiredCount snippets
  const seen = new Set();
  const out = [];
  for (const p of pieces) {
    const key = p.slice(0, 200).replace(/\s+/g, ' ').trim();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
    if (out.length >= desiredCount) break;
  }
  return out;
}

// ------------- Geometry & Math logic -------------
// Parse geometry-like queries and compute using mathjs and common formulas
function tryGeometryCompute(q) {
  if (!q || typeof q !== 'string') return null;
  const s = q.toLowerCase();

  // Patterns: area of circle radius 5
  let m;
  // circle area / circumference
  m = s.match(/area of (?:a |the )?circle(?: with)?(?: radius| r)?[^\d\-]*([-+]?\d*\.?\d+)/i);
  if (m) {
    const r = Number(m[1]);
    if (!Number.isFinite(r)) return null;
    const area = math.pi * r * r;
    return { answer: `${+area.toFixed(6)}`, explanation: `circle area with radius ${r}` };
  }
  m = s.match(/circumference of (?:a |the )?circle(?: with)?(?: radius| r)?[^\d\-]*([-+]?\d*\.?\d+)/i);
  if (m) {
    const r = Number(m[1]); if (!Number.isFinite(r)) return null;
    const c = 2 * math.pi * r;
    return { answer: `${+c.toFixed(6)}`, explanation: `circle circumference with radius ${r}` };
  }

  // area rectangle width X height Y
  m = s.match(/area of (?:a |the )?rectangle(?: with)?(?: width)?[^\d\-]*([-+]?\d*\.?\d+)[^\d\-]+(?:height|h)[^\d\-]*([-+]?\d*\.?\d+)/i);
  if (m) {
    const w = Number(m[1]), h = Number(m[2]); if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
    return { answer: `${+(w*h).toFixed(6)}`, explanation: `rectangle area width ${w} × height ${h}` };
  }
  // area triangle: base and height
  m = s.match(/area of (?:a |the )?triangle(?: with)?(?: base)?[^\d\-]*([-+]?\d*\.?\d+)[^\d\-]+(?:height|h)[^\d\-]*([-+]?\d*\.?\d+)/i);
  if (m) {
    const b = Number(m[1]), h = Number(m[2]); if (!Number.isFinite(b) || !Number.isFinite(h)) return null;
    return { answer: `${+((b*h)/2).toFixed(6)}`, explanation: `triangle area base ${b} × height ${h}` };
  }

  // Pythagorean: given a and b find c or similar
  m = s.match(/pythagor(?:ean|e) (?:find )?c(?: given)? a[^\d\-]*([-+]?\d*\.?\d+)[^\d\-]*b[^\d\-]*([-+]?\d*\.?\d+)/i);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]); if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const c = math.sqrt(a*a + b*b);
    return { answer: `${+c.toFixed(6)}`, explanation: `hypotenuse from legs ${a} and ${b}` };
  }
  // simpler: "given a=3 b=4 find c"
  m = s.match(/given\s+a[=\s]*([-+]?\d*\.?\d+)[,;\s]*b[=\s]*([-+]?\d*\.?\d+)/i);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]); if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const c = math.sqrt(a*a + b*b);
    return { answer: `${+c.toFixed(6)}`, explanation: `hypotenuse from legs ${a} and ${b}` };
  }

  // volume sphere radius r
  m = s.match(/volume of (?:a |the )?sphere(?: with)?(?: radius)?[^\d\-]*([-+]?\d*\.?\d+)/i);
  if (m) {
    const r = Number(m[1]); if (!Number.isFinite(r)) return null;
    const vol = (4/3) * math.pi * r*r*r;
    return { answer: `${+vol.toFixed(6)}`, explanation: `sphere volume radius ${r}` };
  }
  // volume cylinder radius r height h
  m = s.match(/volume of (?:a |the )?cylind(?:er|rical)[^\d\-]*radius[^\d\-]*([-+]?\d*\.?\d+)[^\d\-]+height[^\d\-]*([-+]?\d*\.?\d+)/i);
  if (m) {
    const r = Number(m[1]), h = Number(m[2]); if (!Number.isFinite(r) || !Number.isFinite(h)) return null;
    const vol = math.pi * r*r * h;
    return { answer: `${+vol.toFixed(6)}`, explanation: `cylinder volume radius ${r} × height ${h}` };
  }

  // general numeric expression: use mathjs evaluate safely (only numeric allowed)
  // but ensure it contains at least one digit
  if (/[0-9]/.test(s)) {
    try {
      // block suspicious characters
      if (!/^[0-9+\-*/().,\s%^]+$/.test(s.replace(/percent/gi,'%').replace(/,/g, ''))) return null;
      // convert textual percent/replace commas
      const normalized = s.replace(/percent/gi, '*0.01').replace(/,/g, '');
      const val = math.evaluate(normalized);
      if (typeof val === 'number' && isFinite(val)) return { answer: `${+val.toFixed(12).replace(/\.?0+$/,'')}`, explanation: 'evaluated numeric expression' };
    } catch (e) {
      return null;
    }
  }

  return null;
}

// ---------- endpoints ----------

// search proxy
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  const desired = Math.min(10, parseInt(req.query.count || '10', 10));
  const thinking = req.query.thinking === 'true' || req.query.thinking === '1';
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    const agg = await fetchAggregated(q, desired, thinking);
    // Return anonymized array of text snippets (no urls or source names)
    return res.json({ snippets: agg });
  } catch (err) {
    console.error('search error', err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// calculation endpoint (math & geometry)
app.post('/api/calc', (req, res) => {
  const q = (req.body && req.body.query) ? String(req.body.query) : '';
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    const geom = tryGeometryCompute(q);
    if (geom) {
      return res.json({ result: geom.answer, explanation: geom.explanation, method: 'geometry' });
    }
    // fallback: evaluate numeric expression via mathjs
    // sanitize: allow only numbers and operators
    const numRes = tryGeometryCompute(q); // already tried
    if (numRes) return res.json({ result: numRes.answer, explanation: numRes.explanation, method: 'numeric' });

    // fallback generic math evaluate if contains numbers
    const containsDigit = /[0-9]/.test(q);
    if (containsDigit) {
      try {
        // remove letters and other text; attempt to extract expression
        // find substring that contains digits and math chars
        const match = q.match(/[-+*/().0-9,\s%^]+/);
        if (match) {
          const expr = match[0].replace(/,/g, '');
          const val = math.evaluate(expr);
          if (typeof val === 'number' && isFinite(val)) {
            return res.json({ result: `${+val.toFixed(12).replace(/\.?0+$/,'')}`, explanation: 'evaluated expression' });
          }
        }
      } catch (e) { /* ignore */ }
    }
    return res.json({ result: null, explanation: 'Not a calculable expression' });
  } catch (err) {
    console.error('calc error', err);
    return res.status(500).json({ error: 'Calculation failed' });
  }
});

// upload photo
app.post('/api/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // rename to preserve extension (multer gives random name)
    const ext = path.extname(req.file.originalname).toLowerCase() || '';
    const newName = `${req.file.filename}${ext}`;
    const newPath = path.join(UPLOAD_DIR, newName);
    fs.renameSync(req.file.path, newPath);
    const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${newName}`;
    return res.json({ url: publicUrl });
  } catch (err) {
    console.error('upload error', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// root
app.get('/', (req, res) => res.send('Gomega AI proxy running'));

// start
const PORT = process.env.PORT || 5173;
app.listen(PORT, () => console.log(`Gomega proxy listening on port ${PORT}`));