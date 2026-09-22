#!/usr/bin/env node

/**
 * ============================================================================
 * BOUNTYSTASH MODERN BRUTALIST PORTFOLIO BUILDER
 * Compiles data/portfolio.json + src/template.html + src/style.css
 * into a single-roundtrip, self-contained dist/index.html adhering strictly
 * to the 14KB Initial TCP Window rule.
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

function build() {
  console.log('\n⚡ [BUILD] Compiling Modern Brutalist Portfolio...');

  if (!fs.existsSync(DATA_FILE)) throw new Error(`Missing ${DATA_FILE}`);
  if (!fs.existsSync(TEMPLATE_FILE)) throw new Error(`Missing ${TEMPLATE_FILE}`);
  if (!fs.existsSync(CSS_FILE)) throw new Error(`Missing ${CSS_FILE}`);

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  const data = JSON.parse(rawData);
  const rawCss = fs.readFileSync(CSS_FILE, 'utf-8');
  const minifiedCss = minifyCss(rawCss);
  let template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');

  // 1. Render Metrics Strip
  const metricsHtml = (data.metrics || []).map(m => `
    <div class="metric-cell">
      <div class="metric-val">${escapeHtml(m.value)}</div>
      <div class="metric-lbl">${escapeHtml(m.label)}</div>
    </div>`).join('');

  // 2. Render Projects Cards
  const projectsHtml = (data.projects || []).map(p => {
    const tags = (p.stack || []).map(t => `<span class="badge">#${escapeHtml(t)}</span>`).join(' ');
    const linkBtn = p.link && p.link !== '#' 
      ? `<a href="${escapeHtml(p.link)}" target="_blank" rel="noopener" class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;">Inspect Project →</a>`
      : '';
    return `
      <article class="card">
        <div class="card-header">
          <h3>${escapeHtml(p.title)}</h3>
          <span class="card-period">${escapeHtml(p.period)}</span>
        </div>
        <div class="card-role">${escapeHtml(p.role)}</div>
        <p style="margin-top: 0.5rem;">${escapeHtml(p.description)}</p>
        <div class="card-impact">${escapeHtml(p.impact)}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem;">
          <div class="tag-list" style="margin-top: 0;">${tags}</div>
          ${linkBtn}
        </div>
      </article>`;
  }).join('');

  // 3. Render Skills / Domain Matrix
  const skillsHtml = (data.skills || []).map(s => {
    const badges = (s.items || []).map(i => `<span class="badge">${escapeHtml(i)}</span>`).join(' ');
    return `
      <div class="card">
        <h3 style="font-size: var(--text-base); margin-bottom: 0.5rem;">${escapeHtml(s.category)}</h3>
        <div class="tag-list">${badges}</div>
      </div>`;
  }).join('');

  // 4. Render Education
  const educationHtml = (data.profile.education || []).map(e => `
    <div class="card">
      <div class="card-header">
        <h3 style="font-size: var(--text-base);">${escapeHtml(e.degree)}</h3>
        <span class="card-period">${escapeHtml(e.period)}</span>
      </div>
      <p class="muted" style="margin-top: 0.25rem; font-family: var(--font-mono); font-size: var(--text-xs);">${escapeHtml(e.school)}</p>
    </div>`).join('');

  // 4. Render Philosophy Cards
  const philosophyHtml = (data.philosophy || []).map(phil => `
    <div class="philosophy-card">
      <h3>${escapeHtml(phil.title)}</h3>
      <p style="font-size: var(--text-sm); margin-bottom: 0;">${escapeHtml(phil.body)}</p>
    </div>`).join('');

  // 5. Render Notes Table
  const notesHtml = (data.notes || []).map(n => `
    <tr>
      <td class="muted">${escapeHtml(n.date)}</td>
      <td><strong>${escapeHtml(n.title)}</strong></td>
      <td><span class="badge">${escapeHtml(n.tag)}</span></td>
      <td style="text-align: right;" class="muted">${escapeHtml(n.reading_time)}</td>
    </tr>`).join('');

  // Substitute template slots
  template = template.replace(/{{META_TITLE}}/g, escapeHtml(`${data.profile.name} // ${data.profile.title}`));
  template = template.replace(/{{META_DESCRIPTION}}/g, escapeHtml(data.profile.bio));
  template = template.replace(/{{STATUS_TEXT}}/g, escapeHtml(data.profile.status.text));
  template = template.replace(/{{LOCATION}}/g, escapeHtml(data.profile.location));
  template = template.replace(/{{PROFILE_NAME}}/g, escapeHtml(data.profile.name));
  template = template.replace(/{{PROFILE_TITLE}}/g, escapeHtml(data.profile.title));
  template = template.replace(/{{PROFILE_SUBTITLE}}/g, escapeHtml(data.profile.subtitle));
  template = template.replace(/{{PROFILE_BIO}}/g, escapeHtml(data.profile.bio));
  template = template.replace(/{{WORK_AUTH_LEGAL}}/g, escapeHtml(`${data.profile.work_auth.citizenship} · ${data.profile.work_auth.residency}`));
  template = template.replace(/{{WORK_AUTH_LANG}}/g, escapeHtml(data.profile.work_auth.languages));
  template = template.replace(/{{WORK_AUTH_AVAIL}}/g, escapeHtml(data.profile.work_auth.availability));
  template = template.replace(/{{EMAIL}}/g, escapeHtml(data.profile.contacts.email));
  template = template.replace(/{{GITHUB_URL}}/g, escapeHtml(data.profile.contacts.github));
  template = template.replace(/{{LINKEDIN_URL}}/g, escapeHtml(data.profile.contacts.linkedin));
  template = template.replace(/{{WEBSITE_URL}}/g, escapeHtml(data.profile.contacts.website));
  template = template.replace(/{{CURRENT_YEAR}}/g, new Date().getFullYear().toString());

  template = template.replace(/{{METRICS_HTML}}/g, metricsHtml);
  template = template.replace(/{{PROJECTS_HTML}}/g, projectsHtml);
  template = template.replace(/{{SKILLS_HTML}}/g, skillsHtml);
  template = template.replace(/{{EDUCATION_HTML}}/g, educationHtml);
  template = template.replace(/{{PHILOSOPHY_HTML}}/g, philosophyHtml);
  template = template.replace(/{{NOTES_HTML}}/g, notesHtml);

  // Inject inlined minified CSS directly for 0-roundtrip initial paint
  template = template.replace(/{{INLINE_CSS}}/g, minifiedCss);

  // Compute gzip size for the colophon stamp
  const tempBuf = Buffer.from(template, 'utf-8');
  const tempGzip = zlib.gzipSync(tempBuf);
  const gzipKbStr = (tempGzip.length / 1024).toFixed(2) + ' KB';
  template = template.replace(/{{GZIP_SIZE}}/g, gzipKbStr);

  // Write standalone CSS and combined HTML
  fs.writeFileSync(OUTPUT_CSS, rawCss, 'utf-8');
  fs.writeFileSync(OUTPUT_HTML, template, 'utf-8');

  // Final Size Analysis
  const finalHtmlBuf = Buffer.from(template, 'utf-8');
  const finalGzipBuf = zlib.gzipSync(finalHtmlBuf);
  const uncompressedBytes = finalHtmlBuf.length;
  const gzipBytes = finalGzipBuf.length;
  const targetBytes = 14 * 1024; // 14,336 bytes

  console.log(`\n======================================================`);
  console.log(` 📦 ARTIFACT COMPILED: dist/index.html`);
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
  console.log(`======================================================\n`);
}

build();
