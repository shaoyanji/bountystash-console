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

function fill(template, key, value) {
  return template.split(`{{${key}}}`).join(value);
}

/**
 * The home page's sections are the corpus, rendered. Nothing here is prose of
 * its own: a copy in the template is a copy that drifts, which is how the page
 * came to claim C1 German while the CV said B2.
 */
function homeSections(data, lang, slugs) {
  const email = data.profile.contacts.email;
  const prefix = lang === 'de' ? '/de/work/' : '/work/';

  const button = (link) => {
    const href = link.href.split('$EMAIL').join(email);
    const external = /^https?:/.test(href);
    const attrs = external ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${escapeHtml(href)}"${attrs} class="btn btn-primary" style="padding: 0.4rem 0.85rem;">${escapeHtml(link.label)} &rarr;</a>`;
  };

  const card = (project, slug) => {
    const tags = project.stack.map((s) => `<span class="badge">#${escapeHtml(s)}</span>`).join('\n                  ');
    const links = (project.links || []).map(button);
    const actions = links.length
      ? `<div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">\n                  ${links.join('\n                  ')}\n                </div>`
      : '';
    return `<article class="card">
              <div class="card-header">
                <h3><a href="${prefix}${slug}/" style="color: inherit; text-decoration: none;">${escapeHtml(project.title)}</a></h3>
                <span class="badge">${escapeHtml(project.badge || '')}</span>
              </div>
              <div class="card-role">${escapeHtml(project.role)} \u00b7 ${escapeHtml(project.period)}</div>
              <p style="margin-top: 0.5rem;">${escapeHtml(project.description)}</p>
              <div class="card-impact">
                ${(project.highlights || []).map((h) => `\u2022 ${escapeHtml(h)}`).join('<br>\n                ')}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem;">
                <div class="tag-list" style="margin-top: 0;">
                  ${tags}
                </div>
                ${actions}
              </div>
            </article>`;
  };

  const sector = (n) =>
    data.projects
      .map((project, i) => ({project, slug: slugs[i]}))
      .filter(({project}) => (project.sector || 1) === n)
      .map(({project, slug}) => card(project, slug))
      .join('\n            ');

  const metrics = data.metrics
    .map((m) => `<div class="telemetry-item">${escapeHtml(m.label)}: <strong>${escapeHtml(m.value)}</strong></div>`)
    .join('\n            ');

  const skills = data.skills
    .map(
      (s) => `<div class="card" style="padding: 0.75rem;">
                <h4 style="font-size: var(--text-sm); margin-bottom: 0.35rem;">${escapeHtml(s.category)}</h4>
                <p class="muted" style="font-family: var(--font-mono); font-size: var(--text-xs); margin: 0;">${escapeHtml(s.items.join(' \u00b7 '))}</p>
              </div>`,
    )
    .join('\n              ');

  const education = data.profile.education
    .map(
      (e) => `<div class="card">
                <div class="card-header">
                  <h3 style="font-size: var(--text-base);">${escapeHtml(e.degree)}</h3>
                  <span class="card-period">${escapeHtml(e.period)}</span>
                </div>
                <p class="muted" style="font-family: var(--font-mono); font-size: var(--text-xs); margin-top: 0.25rem;">${escapeHtml(e.school)}</p>
                <a href="${escapeHtml(e.url)}" target="_blank" rel="noopener" class="btn" style="margin-top: 0.5rem; padding: 0.3rem 0.6rem;">${escapeHtml(e.urlLabel)} &rarr;</a>
              </div>`,
    )
    .join('\n            ');

  const principles = data.philosophy
    .map(
      (p) => `<div class="card" style="padding: 0.75rem;">
                <h4 style="font-size: var(--text-sm); margin-bottom: 0.25rem;">${escapeHtml(p.title)}</h4>
                <p style="font-size: var(--text-xs); color: var(--text-muted); margin: 0;">${escapeHtml(p.body)}</p>
              </div>`,
    )
    .join('\n            ');

  return {
    METRICS: metrics,
    SECTOR1: sector(1),
    SECTOR2: sector(2),
    SECTOR3: sector(3),
    SKILLS: skills,
    EDUCATION: education,
    PRINCIPLES: principles,
    CITIZENSHIP: data.profile.work_auth.citizenship,
    RESIDENCY: data.profile.work_auth.residency,
    AVAILABILITY: data.profile.work_auth.availability,
  };
}

function compileLanguage({ lang, dataFile, templateFile, outputFile, minifiedCss, slugs }) {
  if (!fs.existsSync(dataFile)) throw new Error(`Missing ${dataFile}`);
  if (!fs.existsSync(templateFile)) throw new Error(`Missing ${templateFile}`);

  const rawData = fs.readFileSync(dataFile, 'utf-8');
  const data = JSON.parse(rawData);
  let template = fs.readFileSync(templateFile, 'utf-8');

  // Substitute template slots. Text goes through escapeHtml; the rendered
  // sections are markup already and are inserted as they are.
  const slots = {
    META_TITLE: `${data.profile.name} // ${data.profile.title}`,
    META_DESCRIPTION: data.profile.bio,
    STATUS_TEXT: data.profile.status.text,
    LANGUAGES: data.profile.work_auth.languages,
    LOCATION: data.profile.location,
    PROFILE_NAME: data.profile.name,
    PROFILE_TITLE: data.profile.title,
    PROFILE_SUBTITLE: data.profile.subtitle,
    PROFILE_BIO: data.profile.bio,
    EMAIL: data.profile.contacts.email,
    GITHUB_URL: data.profile.contacts.github,
    LINKEDIN_URL: data.profile.contacts.linkedin,
    WEBSITE_URL: data.profile.contacts.website,
    CURRENT_YEAR: new Date().getFullYear().toString(),
  };
  for (const [key, value] of Object.entries(slots)) template = fill(template, key, escapeHtml(String(value)));
  for (const [key, value] of Object.entries(homeSections(data, lang, slugs))) template = fill(template, key, value);

  // Inject inlined minified CSS directly for 0-roundtrip initial paint
  template = fill(template, 'INLINE_CSS', minifiedCss);

  // Minify HTML output (strip comments and leading indentation)
  template = minifyHtml(template);

  // Compute gzip size for the colophon stamp
  const tempBuf = Buffer.from(template, 'utf-8');
  const tempGzip = zlib.gzipSync(tempBuf);
  const gzipKbStr = (tempGzip.length / 1024).toFixed(2) + ' KB';
  template = fill(template, 'GZIP_SIZE', gzipKbStr);

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

  const DE_DATA = path.join(ROOT_DIR, 'data', 'portfolio.de.json');
  const enData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const deData = JSON.parse(fs.readFileSync(DE_DATA, 'utf-8'));

  // Slugs come from the English titles for both locales, which is the rule the
  // corpus uses and the URL a reader may already have bookmarked.
  const sub = {' ': '-', '/': '-', '&': 'and', "'": '', ',': '', '.': '', '(': '', ')': '', ':': '', '—': '-'};
  const slug = (title) =>
    Array.from(String(title).toLowerCase())
      .map((c) => sub[c] ?? c)
      .join('');
  const slugs = enData.projects.map((p) => slug(p.title));

  // 1. English Edition (/)
  compileLanguage({
    lang: 'en',
    dataFile: DATA_FILE,
    templateFile: TEMPLATE_FILE,
    outputFile: OUTPUT_HTML,
    minifiedCss,
    slugs,
  });

  // 2. German Edition (/de/)
  const DE_TEMPLATE = path.join(ROOT_DIR, 'src', 'template.de.html');
  const DE_OUTPUT = path.join(DIST_DIR, 'de', 'index.html');
  compileLanguage({
    lang: 'de',
    dataFile: DE_DATA,
    templateFile: DE_TEMPLATE,
    outputFile: DE_OUTPUT,
    minifiedCss,
    slugs,
  });

  // 3. Contact form (EN + DE) and its thank-you pages. The form posts to
  // /api/contact, handled by _worker.js: copied verbatim, because Pages runs a
  // worker at the root of the deploy directory in advanced mode and the deploy
  // artifact has to be the whole thing.
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

  // Case-study pages: one template per locale, one directory per slug. The slug
  // rule is the corpus's (lib/bountystash/shared.nix), so /work/<slug> is the URL
  // the retired portfolio answered and the one its inbound links still name.
  const pageJs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'page-script.js'), 'utf-8');
  const num = (n) => String(n).padStart(2, '0');

  const labels = {
    en: {kind: 'Case study', impact: 'Impact', stack: 'Stack', back: '← Selected work', href: '/work/'},
    de: {kind: 'Fallstudie', impact: 'Wirkung', stack: 'Technik', back: '← Ausgewählte Arbeiten', href: '/de/work/'},
  };

  const workPairs = [];
  for (const lang of ['en', 'de']) {
    const data = lang === 'de' ? deData : enData;
    const l = labels[lang];
    const dir = lang === 'de' ? path.join(DIST_DIR, 'de', 'work') : path.join(DIST_DIR, 'work');
    const prefix = l.href;
    const total = num(data.projects.length);

    const detail = fs.readFileSync(path.join(ROOT_DIR, 'src', lang === 'de' ? 'work.de.html' : 'work.html'), 'utf-8');
    const indexTpl = fs.readFileSync(
      path.join(ROOT_DIR, 'src', lang === 'de' ? 'work-index.de.html' : 'work-index.html'),
      'utf-8',
    );

    data.projects.forEach((p, i) => {
      const s = slugs[i];
      const stack = p.stack.map((x) => `            <span class="badge">#${escapeHtml(x)}</span>`).join('\n');
      const link =
        p.link && p.link !== '#'
          ? `<a class="btn btn-primary" href="${escapeHtml(p.link)}" target="_blank" rel="noopener">Repository &rarr;</a>`
          : '';
      const repl = {
        SLUG: s,
        TITLE: escapeHtml(p.title),
        DESCRIPTION: escapeHtml(p.description),
        ROLE: escapeHtml(p.role),
        PERIOD: escapeHtml(p.period),
        IMPACT: escapeHtml(p.impact),
        IMPACT_LABEL: l.impact,
        STACK_LABEL: l.stack,
        STACK: stack,
        LINK: link,
        KIND: l.kind,
        BACK_HREF: prefix,
        BACK_LABEL: l.back,
        PAGE_JS: pageJs,
        INDEX: num(i + 1),
        TOTAL: total,
      };
      let html = detail;
      for (const [key, value] of Object.entries(repl)) html = html.split(`{{${key}}}`).join(value);
      fs.mkdirSync(path.join(dir, s), {recursive: true});
      fs.writeFileSync(path.join(dir, s, 'index.html'), minifyHtml(html), 'utf-8');
      // Both locales render the same slug, so the pair is recorded once.
      if (lang === 'en') workPairs.push([`https://bountystash.com/work/${s}/`, `https://bountystash.com/de/work/${s}/`]);
    });

    const cards = data.projects
      .map(
        (p, i) => `        <article class="card">
          <div class="card-header">
            <h3><a href="${prefix}${slugs[i]}/">${escapeHtml(p.title)}</a></h3>
            <span class="badge">${num(i + 1)}</span>
          </div>
          <div class="card-role">${escapeHtml(p.role)} · ${escapeHtml(p.period)}</div>
          <p>${escapeHtml(p.description)}</p>
          <div class="card-impact">${escapeHtml(p.impact)}</div>
        </article>`,
      )
      .join('\n');

    const indexRepl = {
      TOTAL: total,
      CARDS: cards,
      PAGE_JS: pageJs,
      BACK_HREF: lang === 'de' ? '/de/' : '/',
      BACK_LABEL: lang === 'de' ? '← Startseite' : '← Home',
    };
    let indexHtml = indexTpl;
    for (const [key, value] of Object.entries(indexRepl)) indexHtml = indexHtml.split(`{{${key}}}`).join(value);
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, 'index.html'), minifyHtml(indexHtml), 'utf-8');
  }

  const pairs = [
    ['https://bountystash.com/', 'https://bountystash.com/de/'],
    ['https://bountystash.com/contact/', 'https://bountystash.com/de/kontakt/'],
    ['https://bountystash.com/work/', 'https://bountystash.com/de/work/'],
    ...workPairs,
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
  // Real pages now answer the retired paths, so no redirect rule remains: the
  // worker serves env.ASSETS and the directory index is the case study.
  fs.rmSync(path.join(DIST_DIR, '_redirects'), {force: true});
  console.log(
    ` • dist/robots.txt, dist/sitemap.xml, og cards: ${pairs.length * 2} URLs, ` +
      `${pairs.length - 3} case studies per locale`,
  );
}

build();
