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
 *
 * BACKEND MODE: when BOUNTYSTASH_API is set, /api/contact, /api/status and
 * /api/work are proxied to cmd/console-api, which stores the message before it
 * mails it. The local Resend path below stays as the fallback, so the form keeps
 * working if that service is unreachable.
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

function backend(env) {
  return String((env && env.BOUNTYSTASH_API) || '')
    .trim()
    .replace(/\/+$/, '');
}

// Returns null when the backend cannot be reached or is not configured, so the
// caller can decide between an error page and the local path.
async function proxy(request, api, path) {
  try {
    const upstream = await fetch(api + path, {
      method: request.method,
      headers: {
        'content-type': request.headers.get('content-type') || 'application/x-www-form-urlencoded',
        'user-agent': request.headers.get('user-agent') || 'bountystash-console-worker/1.0',
        'x-forwarded-for': request.headers.get('cf-connecting-ip') || '',
      },
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });

    const headers = new Headers();
    for (const name of ['content-type', 'location', 'cache-control']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const { pathname, search } = new URL(request.url);
    const api = backend(env);

    // /work/<slug> is a real page again (one directory per slug, built from the
    // same data as the home cards), so nothing is redirected here any more.
    if (pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
      }
      if (api) {
        const proxied = await proxy(request, api, pathname);
        // A 5xx means the backend did not store the message, so fall through to
        // the local path rather than telling the visitor to write an email.
        if (proxied && proxied.status < 500) {
          return proxied;
        }
      }
      return submit(request, env);
    }

    if (pathname === '/api/status' || pathname === '/api/work') {
      if (!api) {
        return new Response('Not Found', { status: 404 });
      }
      const proxied = await proxy(request, api, pathname + search);
      return proxied || new Response('Bad Gateway', { status: 502 });
    }

    return env.ASSETS.fetch(request);
  },
};
