/**
 * ============================================================================
 * BOUNTYSTASH CONTACT ENDPOINT — Cloudflare Pages advanced mode
 * ============================================================================
 * `_worker.js` at the root of the deploy directory makes Pages run this for
 * every request; static files are served through the ASSETS binding, so the
 * console itself is byte-for-byte what it was.
 *
 * POST /api/contact takes the no-JavaScript form from /contact/ and
 * /de/kontakt/, validates it, and sends one message through Resend. The domain
 * already signs with Resend's DKIM key, which is why this reuses it instead of
 * a form service.
 *
 * No dependencies, no KV, no database. The only secret is RESEND_API_KEY.
 * ============================================================================
 */

const TO = 'matt@bountystash.com';
const FROM = 'Bountystash Contact <contact@bountystash.com>';
const NEXT = { en: '/contact/thanks/', de: '/de/kontakt/danke/' };
const LIMITS = { name: 80, email: 200, message: 4000, minMessage: 20, body: 64 * 1024 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function page(status, text) {
  return new Response(
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<meta name="robots" content="noindex"><title>Contact</title></head>' +
      '<body style="font:16px ui-monospace,monospace;padding:3rem;max-width:40rem">' +
      '<p>' + text + '</p>' +
      '<p><a href="/contact/">Back to the form</a></p></body></html>',
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

function redirect(to) {
  return new Response(null, { status: 303, headers: { location: to } });
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escape(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[character]);
}

async function submit(request, env) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > LIMITS.body) {
    return page(413, 'That message is too large.');
  }

  let form;
  try {
    form = await request.formData();
  } catch (error) {
    return page(400, 'That form could not be read.');
  }

  // A filled honeypot is a bot. Answer like success so it does not retry, and
  // send nothing.
  if (clean(form.get('website')) !== '') {
    return redirect(NEXT.en);
  }

  const name = clean(form.get('name')).replace(/[\r\n\t]+/g, ' ').slice(0, LIMITS.name);
  const email = clean(form.get('email'));
  const message = clean(form.get('message'));
  const next = NEXT[clean(form.get('lang'))] || NEXT.en;

  if (name === '') {
    return page(400, 'A name is required, 80 characters at most.');
  }
  if (email.length > LIMITS.email || !EMAIL.test(email)) {
    return page(400, 'That email address does not look valid.');
  }
  if (message.length < LIMITS.minMessage || message.length > LIMITS.message) {
    return page(400, 'A message between 20 and 4000 characters is required.');
  }

  const key = env.RESEND_API_KEY;
  if (!key) {
    return page(502, 'The form is not configured yet. Write to <a href="mailto:' + TO + '">' + TO + '</a> instead.');
  }

  let sent;
  try {
    sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + key,
        'content-type': 'application/json',
        'user-agent': 'bountystash-contact/1.0',
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: 'bountystash.com contact — ' + name,
        text: 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message + '\n',
      }),
    });
  } catch (error) {
    // A thrown subrequest used to bubble up as bare "error code: 502" with no
    // hint at the cause; name it and keep the mailto fallback.
    const reason = (error && error.message) || 'network error';
    return page(502, 'Mail could not be sent (' + escape(reason) + '). Write to <a href="mailto:' + TO + '">' + TO + '</a> instead.');
  }

  if (!sent.ok) {
    const detail = escape(((await sent.text().catch(() => '')) || '').slice(0, 200));
    return page(502, 'Resend answered ' + sent.status + '. ' + detail + ' Write to <a href="mailto:' + TO + '">' + TO + '</a> instead.');
  }

  return redirect(next);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
      }
      return submit(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
