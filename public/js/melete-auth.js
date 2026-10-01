window.MeleteAuth = (function () {
  let currentUser = null;
  let googleClientId = '';
  let readyResolve;
  const ready = new Promise(resolve => { readyResolve = resolve; });

  async function request(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    let body = {};
    try { body = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(body.error || 'Request failed');
    return body;
  }

  function safeRedirect(value, fallback = '/practice.html') {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
    const allowed = ['/index.html','/interviews.html','/how-it-works.html','/resources.html','/about.html','/faq.html','/onboarding.html','/practice.html','/session.html','/report.html','/admin.html'];
    return allowed.includes(value.split('?')[0]) ? value : fallback;
  }

  function getUser() { return currentUser; }

  function setUser(user) {
    currentUser = user || null;
    window.dispatchEvent(new CustomEvent('melete:auth-change', { detail: { user: currentUser } }));
    syncHeader();
  }

  async function fetchUser() {
    try { const data = await request('/api/auth/me'); setUser(data.user); }
    catch (_) { setUser(null); }
    return currentUser;
  }

  async function signOut() {
    try { await request('/api/auth/logout', { method: 'POST' }); } catch (_) {}
    setUser(null);
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
    window.location.assign('/index.html');
  }

  function loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve();
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) { existing.addEventListener('load', resolve, { once: true }); existing.addEventListener('error', reject, { once: true }); return; }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true;
      script.addEventListener('load', resolve, { once: true }); script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function handleGoogleCredentialResponse(response) {
    if (!response?.credential) return;
    try {
      const data = await request('/api/auth/google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      setUser(data.user);
      window.dispatchEvent(new CustomEvent('melete:google-authed', { detail: data.user }));
    } catch (error) {
      alert(error.message || 'Google sign-in could not be completed.');
    }
  }

  function renderGoogleButtons() {
    if (!window.google?.accounts?.id || !googleClientId) return;
    document.querySelectorAll('.melete-google-btn-target').forEach(target => {
      target.replaceChildren();
      window.google.accounts.id.renderButton(target, {
        theme: 'outline', size: 'large', type: 'standard', shape: 'rectangular',
        text: 'continue_with', logo_alignment: 'left', width: Number(target.dataset.width || 340)
      });
      const fallback = target.parentElement?.querySelector('.melete-custom-google-btn');
      if (fallback) fallback.hidden = true;
    });
  }

  async function initGoogle() {
    const config = await request('/api/auth/config');
    googleClientId = config.googleClientId;
    await loadGoogleScript();
    window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCredentialResponse, auto_select: false, cancel_on_tap_outside: true });
    renderGoogleButtons();
  }

  function triggerGoogleSignIn() {
    if (window.google?.accounts?.id) window.google.accounts.id.prompt();
  }

  function requireAuth(onSuccess) {
    ready.then(user => {
      if (user) { if (typeof onSuccess === 'function') onSuccess(user); return; }
      const redirect = safeRedirect(window.location.pathname + window.location.search);
      window.location.assign(`/login.html?redirect=${encodeURIComponent(redirect)}`);
    });
  }

  function syncHeader() {
    const user = currentUser;
    const first = user?.name?.split(' ')[0] || 'Candidate';
    document.querySelectorAll('#user-display-name, #user-display-name-mobile').forEach(el => { el.textContent = first; });
    document.querySelectorAll('#header-auth-login').forEach(el => { el.classList.toggle('hidden', Boolean(user)); });
    document.querySelectorAll('#header-user-badge, #user-badge').forEach(el => {
      el.classList.toggle('hidden', !user); el.classList.toggle('flex', Boolean(user));
      el.onclick = user ? signOut : null;
    });
    document.querySelectorAll('.drawer-login-link, .footer-login-link').forEach(el => {
      el.textContent = user ? `Sign out (${first})` : 'Log in';
      el.onclick = user ? event => { event.preventDefault(); signOut(); } : null;
    });
  }

  async function init() {
    await fetchUser();
    try { await initGoogle(); } catch (error) { console.warn('Google sign-in is unavailable:', error.message); }
    readyResolve(currentUser);
    syncHeader();
  }

  window.addEventListener('DOMContentLoaded', init, { once: true });
  return { ready, request, safeRedirect, getUser, setUser, fetchUser, signOut, requireAuth, triggerGoogleSignIn, handleGoogleCredentialResponse, syncHeader };
})();
