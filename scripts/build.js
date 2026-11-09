#!/usr/bin/env node

/**
 * ============================================================================
 * BOUNTYSTASH MODERN BRUTALIST PORTFOLIO BUILDER
 * Compiles data/portfolio.json + src/template.html + src/style.css
 * and data/portfolio.de.json + src/template.de.html
 * into dual single-roundtrip, self-contained dist/index.html & dist/de/index.html
 * adhering strictly to the 14KB Initial TCP Window rule.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'portfolio.json');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'src', 'template.html');
const CSS_FILE = path.join(ROOT_DIR, 'src', 'style.css');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_HTML = path.join(DIST_DIR, 'index.html');
const OUTPUT_CSS = path.join(DIST_DIR, 'style.css');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove comments
    .replace(/\s+/g, ' ')             // collapse whitespace
    .replace(/\s*([:;{}])\s*/g, '$1') // remove space around delimiters
    .replace(/;}/g, '}')              // remove trailing semicolon
    .trim();
}

function minifyHtml(html) {
  // Strip HTML comments (safe)
  let out = html.replace(/<!--[\s\S]*?-->/g, '');
  // Trim every line and drop empty lines (preserves newlines for JS syntax safety)
  out = out.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  return out;
}

function compileLanguage({ lang, dataFile, templateFile, outputFile, minifiedCss }) {
  if (!fs.existsSync(dataFile)) throw new Error(`Missing ${dataFile}`);
  if (!fs.existsSync(templateFile)) throw new Error(`Missing ${templateFile}`);

  const rawData = fs.readFileSync(dataFile, 'utf-8');
  const data = JSON.parse(rawData);
  let template = fs.readFileSync(templateFile, 'utf-8');

  // Substitute template slots
  template = template.replace(/{{META_TITLE}}/g, escapeHtml(`${data.profile.name} // ${data.profile.title}`));
  template = template.replace(/{{META_DESCRIPTION}}/g, escapeHtml(data.profile.bio));
  template = template.replace(/{{STATUS_TEXT}}/g, escapeHtml(data.profile.status.text));
  template = template.replace(/{{LOCATION}}/g, escapeHtml(data.profile.location));
  template = template.replace(/{{PROFILE_NAME}}/g, escapeHtml(data.profile.name));
  template = template.replace(/{{PROFILE_TITLE}}/g, escapeHtml(data.profile.title));
  template = template.replace(/{{PROFILE_SUBTITLE}}/g, escapeHtml(data.profile.subtitle));
  template = template.replace(/{{PROFILE_BIO}}/g, escapeHtml(data.profile.bio));
  template = template.replace(/{{EMAIL}}/g, escapeHtml(data.profile.contacts.email));
  template = template.replace(/{{GITHUB_URL}}/g, escapeHtml(data.profile.contacts.github));
  template = template.replace(/{{LINKEDIN_URL}}/g, escapeHtml(data.profile.contacts.linkedin));
  template = template.replace(/{{WEBSITE_URL}}/g, escapeHtml(data.profile.contacts.website));
  template = template.replace(/{{CURRENT_YEAR}}/g, new Date().getFullYear().toString());

  // Inject inlined minified CSS directly for 0-roundtrip initial paint
  template = template.replace(/{{INLINE_CSS}}/g, minifiedCss);

  // Minify HTML output (strip comments and leading indentation)
  template = minifyHtml(template);

  // Compute gzip size for the colophon stamp
  const tempBuf = Buffer.from(template, 'utf-8');
  const tempGzip = zlib.gzipSync(tempBuf);
  const gzipKbStr = (tempGzip.length / 1024).toFixed(2) + ' KB';
  template = template.replace(/{{GZIP_SIZE}}/g, gzipKbStr);

  // Write HTML
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, template, 'utf-8');

  // Final Size Analysis
  const finalHtmlBuf = Buffer.from(template, 'utf-8');
  const finalGzipBuf = zlib.gzipSync(finalHtmlBuf);
  const uncompressedBytes = finalHtmlBuf.length;
  const gzipBytes = finalGzipBuf.length;
  const targetBytes = 14 * 1024; // 14,336 bytes

  console.log(`\n======================================================`);
  console.log(` 📦 ARTIFACT COMPILED: ${path.relative(ROOT_DIR, outputFile)} [${lang.toUpperCase()}]`);
  console.log(`======================================================`);
  console.log(` • Raw Uncompressed:   ${(uncompressedBytes / 1024).toFixed(2)} KB (${uncompressedBytes} bytes)`);
  console.log(` • Gzip Compressed:     ${(gzipBytes / 1024).toFixed(2)} KB (${gzipBytes} bytes)`);
  console.log(` • 14KB Budget Limit:   14.00 KB (${targetBytes} bytes)`);
  
  if (gzipBytes <= targetBytes) {
    const margin = targetBytes - gzipBytes;
    console.log(` ✅ 14KB FIRST PACKET RULE: PASSED! (${margin} bytes remaining)`);
    console.log(`    The entire website loads in a SINGLE initial TCP roundtrip!`);
  } else {
    console.log(` ⚠️ WARNING: Exceeded 14KB envelope by ${gzipBytes - targetBytes} bytes.`);
  }
  console.log(`======================================================`);
}

/**
 * A page outside the 14 KB console: one template, one output, the same
 * minifier. The cap governs the console itself, not the form that posts to the
 * Pages Function beside it.
 */
function compilePage({ templateFile, outputFile, data }) {
  const raw = fs.readFileSync(templateFile, 'utf-8');
  const html = minifyHtml(raw.replace(/{{EMAIL}}/g, escapeHtml(data.profile.contacts.email)));
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, html, 'utf-8');
  const gzipBytes = zlib.gzipSync(Buffer.from(html, 'utf-8')).length;
  console.log(` • ${path.relative(ROOT_DIR, outputFile)}: ${(gzipBytes / 1024).toFixed(2)} KB gzip`);
}

function build() {
  console.log('\n⚡ [BUILD] Compiling Modern Brutalist Portfolio (Dual Locale EN/DE)...');

  if (!fs.existsSync(CSS_FILE)) throw new Error(`Missing ${CSS_FILE}`);
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const rawCss = fs.readFileSync(CSS_FILE, 'utf-8');
  const minifiedCss = minifyCss(rawCss);
  fs.writeFileSync(OUTPUT_CSS, rawCss, 'utf-8');

  // 1. English Edition (/)
  compileLanguage({
    lang: 'en',
    dataFile: DATA_FILE,
    templateFile: TEMPLATE_FILE,
    outputFile: OUTPUT_HTML,
    minifiedCss
  });

  // 2. German Edition (/de/)
  const DE_DATA = path.join(ROOT_DIR, 'data', 'portfolio.de.json');
  const DE_TEMPLATE = path.join(ROOT_DIR, 'src', 'template.de.html');
  const DE_OUTPUT = path.join(DIST_DIR, 'de', 'index.html');
  compileLanguage({
    lang: 'de',
    dataFile: DE_DATA,
    templateFile: DE_TEMPLATE,
    outputFile: DE_OUTPUT,
    minifiedCss
  });

  // 3. Contact form (EN + DE) and its thank-you pages. The form posts to
  // /api/contact, handled by _worker.js: copied verbatim, because Pages runs a
  // worker at the root of the deploy directory in advanced mode and the deploy
  // artifact has to be the whole thing.
  const enData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const deData = JSON.parse(fs.readFileSync(DE_DATA, 'utf-8'));

  compilePage({
    templateFile: path.join(ROOT_DIR, 'src', 'contact.html'),
    outputFile: path.join(DIST_DIR, 'contact', 'index.html'),
    data: enData
  });
  compilePage({
    templateFile: path.join(ROOT_DIR, 'src', 'contact.de.html'),
    outputFile: path.join(DIST_DIR, 'de', 'kontakt', 'index.html'),
    data: deData
  });
  compilePage({
    templateFile: path.join(ROOT_DIR, 'src', 'thanks.html'),
    outputFile: path.join(DIST_DIR, 'contact', 'thanks', 'index.html'),
    data: enData
  });
  compilePage({
    templateFile: path.join(ROOT_DIR, 'src', 'thanks.de.html'),
    outputFile: path.join(DIST_DIR, 'de', 'kontakt', 'danke', 'index.html'),
    data: deData
  });

  fs.copyFileSync(path.join(ROOT_DIR, 'src', 'contact-worker.js'), path.join(DIST_DIR, '_worker.js'));
  const workerGzip = zlib.gzipSync(fs.readFileSync(path.join(DIST_DIR, '_worker.js'))).length;
  console.log(` • dist/_worker.js: ${(workerGzip / 1024).toFixed(2)} KB gzip (POST /api/contact, rest via env.ASSETS)`);

  // Crawl files and share cards belong to the artifact. Pages answers an exact
  // path from the deployment, so a missing robots.txt or og.png is a 404 the
  // moment the previous site's edge cache expires — and an unfurl with no card.
  for (const card of ['og.png', 'og-de.png']) {
    const from = path.join(ROOT_DIR, 'assets', card);
    if (!fs.existsSync(from)) throw new Error(`Missing ${from}`);
    const to = path.join(DIST_DIR, card);
    fs.rmSync(to, { force: true });
    fs.copyFileSync(from, to);
    fs.chmodSync(to, 0o644);
  }

  const pairs = [
    ['https://bountystash.com/', 'https://bountystash.com/de/'],
    ['https://bountystash.com/contact/', 'https://bountystash.com/de/kontakt/'],
  ];
  const urls = pairs
    .flatMap(([en, de]) =>
      [en, de].map(
        (loc) =>
          `  <url>\n    <loc>${loc}</loc>\n` +
          `    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>\n` +
          `    <xhtml:link rel="alternate" hreflang="de" href="${de}"/>\n  </url>`,
      ),
    )
    .join('\n');
  fs.writeFileSync(
    path.join(DIST_DIR, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
      urls +
      '\n</urlset>\n',
    'utf-8',
  );
  fs.writeFileSync(
    path.join(DIST_DIR, 'robots.txt'),
    'User-agent: *\nAllow: /\n\nSitemap: https://bountystash.com/sitemap.xml\n',
    'utf-8',
  );
  // The portfolio this domain used to serve answered /work/<slug> per locale.
  // The console presents the same work inline, so the retired paths point at the
  // console rather than 404 once the previous site's edge cache expires.
  fs.writeFileSync(
    path.join(DIST_DIR, '_redirects'),
    '# retired Nix-portfolio case-study paths, now sections of the console\n' +
      '/de/work/*  /de/  301\n' +
      '/work/*     /     301\n' +
      '/work       /     301\n',
    'utf-8',
  );
  console.log(` • dist/robots.txt, dist/sitemap.xml, _redirects, og cards: ${pairs.length * 2} URLs`);
}

build();
