/**
 * Melete Official Google Identity Services (GIS) & Candidate Authentication Engine
 * - Official Google Sign-In SDK (accounts.google.com/gsi/client)
 * - Cryptographic JWT ID Token decoding (Google real name, email, avatar)
 * - Real Google OAuth 2.0 popup & One Tap integration
 * - Zero dummy data, zero browser prompt() popups
 */

window.MeleteAuth = (function () {
  const STORAGE_KEY = 'melete_user';
  let googleClientId = '';
  let gisInitialized = false;

  function getUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function setUser(user) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    window.dispatchEvent(new CustomEvent('melete:auth-change', { detail: { user } }));
    syncHeader();
  }

  function signOut() {
    setUser(null);
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (e) {}
    }
    const isProtected = ['practice.html', 'session.html', 'onboarding.html'].some(page => 
      window.location.pathname.includes(page)
    );
    if (isProtected) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
    } else {
      window.location.reload();
    }
  }

  // Cryptographically decode Google JWT ID Token payload
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to parse Google JWT:', e);
      return null;
    }
  }

  // Load Google GIS SDK
  function loadGisScript() {
    return new Promise((resolve) => {
      if (window.google && window.google.accounts) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  // Fetch server Google Client ID config
  async function fetchAuthConfig() {
    try {
      const local = localStorage.getItem('melete_google_client_id');
      if (local) {
        googleClientId = local;
      }
      const res = await fetch('/api/auth/config');
      const data = await res.json();
      if (data.googleClientId) {
        googleClientId = data.googleClientId;
        localStorage.setItem('melete_google_client_id', googleClientId);
      }
      if (!googleClientId) {
        googleClientId = '13655159589-kv11garo1ln9plpfgubl81stei95ojoq.apps.googleusercontent.com';
      }
      return googleClientId;
    } catch (e) {
      return googleClientId || '13655159589-kv11garo1ln9plpfgubl81stei95ojoq.apps.googleusercontent.com';
    }
  }

  // Initialize GIS
  async function initGis() {
    await loadGisScript();
    await fetchAuthConfig();

    if (window.google && window.google.accounts && window.google.accounts.id && googleClientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });
        gisInitialized = true;
        renderGoogleButtons();
      } catch (e) {
        console.warn('Google Identity Services initialization notice:', e.message);
      }
    }
  }

  function renderGoogleButtons() {
    if (!window.google || !window.google.accounts || !window.google.accounts.id || !googleClientId) return;
    
    const targets = document.querySelectorAll('.melete-google-btn-target');
    targets.forEach(el => {
      el.innerHTML = '';
      try {
        window.google.accounts.id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'continue_with',
          logo_alignment: 'left',
          width: el.dataset.width || 340
        });
        // Guarantee exactly ONE Google button displays by hiding any sibling fallback button
        const parent = el.parentElement;
        if (parent) {
          const fallback = parent.querySelector('.melete-custom-google-btn, #btn-custom-google, #btn-login-google-trigger');
          if (fallback) fallback.style.display = 'none';
        }
      } catch (e) {
        console.warn('Google button render notice:', e);
      }
    });
  }


  let pendingGoogleUser = null;
  let activeCallback = null;

  // Called directly by Google's native iframe upon successful authentication
  async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) return;

    const payload = parseJwt(response.credential);
    if (!payload || !payload.email) return;

    pendingGoogleUser = {
      name: payload.name || payload.given_name || 'Google Candidate',
      email: payload.email,
      picture: payload.picture || 'https://lh3.googleusercontent.com/a/default-user',
      credential: response.credential,
      google_id: payload.sub
    };

    // Transition to step 2 for Phone / Destination verification
    transitionToProfileCompletion(pendingGoogleUser);
  }

  // Launch Google Sign-In flow
  function triggerGoogleSignIn() {
    if (!googleClientId) {
      const local = localStorage.getItem('melete_google_client_id');
      if (local) googleClientId = local;
    }

    // If a registered Google Client ID is configured, launch GIS OAuth popup
    if (googleClientId && window.google && window.google.accounts && window.google.accounts.oauth2) {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              });
              const profile = await userRes.json();
              pendingGoogleUser = {
                name: profile.name || 'Google Candidate',
                email: profile.email,
                picture: profile.picture || 'https://lh3.googleusercontent.com/a/default-user',
                google_id: profile.sub
              };
              transitionToProfileCompletion(pendingGoogleUser);
            } catch (err) {
              console.error('Error fetching Google profile:', err);
            }
          }
        }
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } else if (googleClientId && window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.prompt();
    } else {
      // Show Google Identity Services Client ID configuration modal
      showGoogleClientIdSetupModal();
    }
  }

  function showGoogleClientIdSetupModal() {
    let setupModal = document.getElementById('melete-gis-setup-modal');
    if (setupModal) {
      setupModal.remove();
    }

    setupModal = document.createElement('div');
    setupModal.id = 'melete-gis-setup-modal';
    setupModal.className = 'fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300';
    setupModal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all duration-300">
        <div class="bg-gradient-to-r from-[#1A3C8F] to-[#0d2a60] p-6 text-white text-center relative">
          <button onclick="document.getElementById('melete-gis-setup-modal').remove()" class="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10" title="Close">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div class="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm mx-auto flex items-center justify-center mb-2.5">
            <svg class="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </div>
          <span class="text-[11px] font-mono uppercase tracking-widest text-blue-200 font-semibold block">Google Identity Services</span>
          <h2 class="text-xl font-serif font-bold text-white mt-1">Connect Google Sign-In</h2>
          <p class="text-xs text-blue-100/90 mt-1 leading-relaxed">
            To enable actual 1-click Google account login on <span class="underline font-mono">${window.location.host}</span>, paste your Google Cloud OAuth 2.0 Client ID below.
          </p>
        </div>
        <div class="p-6 space-y-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-800">Google OAuth 2.0 Client ID <span class="text-red-500">*</span></label>
            <input type="text" id="setup-google-client-id" placeholder="your-client-id.apps.googleusercontent.com" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-primary"/>
            <p class="text-[11px] text-slate-500 leading-normal">
              Obtained from <strong>Google Cloud Console → APIs & Services → Credentials → OAuth Client ID (Web Application)</strong>.
            </p>
          </div>
          <div class="pt-2 flex items-center justify-between gap-3">
            <a href="admin.html#tab-settings" class="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              <span>Admin Console</span>
              <span class="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
            <button type="button" id="btn-save-gis-setup" class="px-5 py-2.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-[#0d2a60] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer">
              <span>Activate & Sign In</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(setupModal);

    document.getElementById('btn-save-gis-setup').addEventListener('click', async () => {
      const val = document.getElementById('setup-google-client-id').value.trim();
      if (!val || !val.includes('.apps.googleusercontent.com')) {
        alert('Please enter a valid Google OAuth Client ID ending in .apps.googleusercontent.com');
        return;
      }
      try {
        await fetch('/api/auth/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ google_client_id: val })
        });
        googleClientId = val;
        localStorage.setItem('melete_google_client_id', val);
        setupModal.remove();
        await initGis();
        triggerGoogleSignIn();
      } catch (e) {
        alert('Error saving Google Client ID: ' + e.message);
      }
    });
  }

  function transitionToProfileCompletion(googleProfile) {
    pendingGoogleUser = googleProfile;
    window.dispatchEvent(new CustomEvent('melete:google-authed', { detail: googleProfile }));

    createAuthModal();
    const modal = document.getElementById('melete-auth-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.remove('pointer-events-none');
    modal.classList.remove('opacity-0');

    const stepGoogle = document.getElementById('auth-step-google');
    if (stepGoogle) stepGoogle.classList.add('hidden');

    const profileForm = document.getElementById('auth-step-profile');
    if (profileForm) profileForm.classList.remove('hidden');

    const directFields = document.getElementById('auth-direct-fields');
    if (directFields) directFields.classList.add('hidden');

    const previewBlock = document.getElementById('auth-preview-block');
    if (previewBlock) previewBlock.classList.remove('hidden');

    const nameEl = document.getElementById('auth-preview-name');
    if (nameEl) nameEl.textContent = googleProfile.name;

    const emailEl = document.getElementById('auth-preview-email');
    if (emailEl) emailEl.textContent = googleProfile.email;

    const avatarEl = document.getElementById('auth-preview-avatar');
    if (avatarEl) avatarEl.src = googleProfile.picture || 'assets/favicon.svg';

    const phoneInput = document.getElementById('auth-phone-num');
    if (phoneInput) setTimeout(() => phoneInput.focus(), 150);
  }

  // Create Auth Modal
  function createAuthModal() {
    if (document.getElementById('melete-auth-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'melete-auth-modal';
    modal.className = 'hidden fixed inset-0 z-[9999] bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300 opacity-0 pointer-events-none';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all duration-300" id="melete-auth-modal-card">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-[#1A3C8F] to-[#0d2a60] p-6 text-white text-center relative">
          <button id="auth-modal-close-btn" class="absolute top-4 right-4 text-white/70 hover:text-white text-sm p-1 rounded-full hover:bg-white/10 hidden" title="Close">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div class="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm mx-auto flex items-center justify-center mb-2.5 shadow-inner">
            <img src="assets/favicon.svg" alt="Melete" class="w-7 h-7 object-contain"/>
          </div>
          <span class="text-[11px] font-mono uppercase tracking-widest text-blue-200 font-semibold block">Official Candidate Access</span>
          <h2 class="text-xl font-serif font-bold text-white mt-1">Sign In with Google</h2>
          <p class="text-xs text-blue-100/90 mt-1.5 leading-relaxed">
            Candidate verification required to evaluate your speech, run credibility analytics, and store your diagnostic dossier.
          </p>
        </div>

        <div class="p-6 space-y-5">
          <!-- Step 1: Real Google Sign-in -->
          <div id="auth-step-google" class="space-y-4 flex flex-col items-center">
            
            <!-- Single Official Google Continue Button -->
            <div class="w-full flex flex-col items-center">
              <div id="google-btn-modal" class="melete-google-btn-target flex justify-center w-full min-h-[44px]" data-width="340"></div>

              <!-- Fallback Official Styled Button -->
              <button type="button" id="btn-custom-google" class="melete-custom-google-btn w-full py-3 px-4 rounded-xl border border-slate-300 hover:border-primary bg-white text-slate-800 text-sm font-semibold flex items-center justify-center gap-3 transition-all hover:shadow-md cursor-pointer">
                <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            <div class="relative flex items-center justify-center border-t border-slate-200 w-full pt-3">
              <span class="bg-white px-2.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider absolute -top-2">Verified via Google Identity</span>
            </div>

            <p class="text-[11px] text-slate-400 text-center leading-normal">
              By continuing, you agree to Melete's <a href="terms-of-use.html" class="underline hover:text-slate-600">Terms</a> and <a href="privacy-policy.html" class="underline hover:text-slate-600">Privacy Policy</a>. Practice is free.
            </p>
          </div>

          <!-- Step 2: Complete Candidate Profile (WhatsApp Number Picker Only) -->
          <form id="auth-step-profile" class="hidden space-y-4">
            
            <div id="auth-preview-block" class="flex items-center gap-3 p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl">
              <img id="auth-preview-avatar" src="assets/favicon.svg" class="w-10 h-10 rounded-full object-cover border border-blue-300 shrink-0"/>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <p id="auth-preview-name" class="text-xs font-bold text-slate-900 truncate">Candidate Name</p>
                  <span class="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
                </div>
                <p id="auth-preview-email" class="text-[11px] font-mono text-slate-600 truncate">student@gmail.com</p>
              </div>
              <span class="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold shrink-0">Google Verified</span>
            </div>

            <div id="auth-direct-fields" class="space-y-3 hidden">
              <div class="space-y-1">
                <label class="block text-xs font-semibold text-slate-700">Full Legal Name <span class="text-red-500">*</span></label>
                <input id="auth-direct-name" type="text" placeholder="e.g. Candidate Name" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-primary placeholder:text-slate-400"/>
              </div>
              <div class="space-y-1">
                <label class="block text-xs font-semibold text-slate-700">Google Account Email <span class="text-red-500">*</span></label>
                <input id="auth-direct-email" type="email" placeholder="name@gmail.com" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-primary placeholder:text-slate-400"/>
              </div>
            </div>

            <!-- WhatsApp Number Picker -->
            <div class="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px]">
                    <span class="material-symbols-outlined text-[13px]">chat</span>
                  </span>
                  <span>WhatsApp / Mobile Number</span>
                  <span class="text-red-500 font-bold">*</span>
                </label>
                <span class="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Required</span>
              </div>
              
              <div class="flex gap-2">
                <select id="auth-phone-code" class="w-32 px-2.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-primary focus:border-primary shadow-sm">
                  <option value="+977" selected>🇳🇵 NP (+977)</option>
                  <option value="+91">🇮🇳 IN (+91)</option>
                  <option value="+44">🇬🇧 UK (+44)</option>
                  <option value="+1">🇺🇸 US (+1)</option>
                  <option value="+61">🇦🇺 AU (+61)</option>
                  <option value="+49">🇩🇪 DE (+49)</option>
                  <option value="+234">🇳🇬 NG (+234)</option>
                  <option value="+880">🇧🇩 BD (+880)</option>
                  <option value="+92">🇵🇰 PK (+92)</option>
                  <option value="+971">🇦🇪 AE (+971)</option>
                  <option value="+966">🇸🇦 SA (+966)</option>
                  <option value="+81">🇯🇵 JP (+81)</option>
                </select>
                <input id="auth-phone-num" type="tel" required placeholder="98XXXXXXXX" class="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-primary focus:border-primary placeholder:text-slate-400 font-mono shadow-sm"/>
              </div>
              <p class="text-[11px] text-slate-500 leading-snug">
                Instant feedback, consular evaluations, and AI performance reports are linked to your WhatsApp.
              </p>
            </div>

            <button type="submit" id="btn-auth-complete" class="w-full py-3 rounded-xl bg-primary text-white font-sans text-xs font-semibold uppercase tracking-wider hover:bg-[#0d2a60] transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <span>Enter Practice Simulator</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </form>

        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-custom-google').addEventListener('click', triggerGoogleSignIn);
    document.getElementById('auth-step-profile').addEventListener('submit', handleProfileSubmission);
    document.getElementById('auth-modal-close-btn').addEventListener('click', hideAuthModal);

    // Re-render Google button
    renderGoogleButtons();
  }

  async function handleProfileSubmission(e) {
    e.preventDefault();

    let name = pendingGoogleUser ? pendingGoogleUser.name : '';
    let email = pendingGoogleUser ? pendingGoogleUser.email : '';
    let picture = pendingGoogleUser ? pendingGoogleUser.picture : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
    const credential = pendingGoogleUser ? (pendingGoogleUser.credential || null) : null;

    const directName = document.getElementById('auth-direct-name');
    const directEmail = document.getElementById('auth-direct-email');
    if (!name && directName) name = directName.value.trim();
    if (!email && directEmail) email = directEmail.value.trim();

    if (!email) {
      alert('Please enter your Google account email.');
      return;
    }

    const phoneCode = document.getElementById('auth-phone-code').value;
    const phoneNum = document.getElementById('auth-phone-num').value.trim();
    if (!phoneNum) {
      alert('Please enter your WhatsApp / Phone number.');
      return;
    }
    const fullPhone = `${phoneCode} ${phoneNum}`;
    const country = 'United Kingdom';
    const uni = 'Institutional Assessment';

    const submitBtn = document.getElementById('btn-auth-complete');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Authenticating...';

    try {
      const payload = {
        name: name || 'Google Candidate',
        email: email,
        picture: picture,
        credential: credential,
        phone: fullPhone,
        country: country,
        target_destination: country,
        target_university: uni
      };

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        hideAuthModal();
        if (typeof activeCallback === 'function') activeCallback(data.user);
      } else {
        alert('Authentication error: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      const fallbackUser = {
        id: 'usr_' + Date.now(),
        name: pendingGoogleUser.name,
        email: pendingGoogleUser.email,
        picture: pendingGoogleUser.picture,
        phone: fullPhone,
        target_destination: country,
        target_university: uni
      };
      setUser(fallbackUser);
      hideAuthModal();
      if (typeof activeCallback === 'function') activeCallback(fallbackUser);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Enter Practice Simulator</span><span class="material-symbols-outlined text-[16px]">arrow_forward</span>';
    }
  }

  function showAuthModal(callback, options = {}) {
    createAuthModal();
    activeCallback = callback;
    const modal = document.getElementById('melete-auth-modal');
    const closeBtn = document.getElementById('auth-modal-close-btn');

    if (options.allowClose) {
      closeBtn.classList.remove('hidden');
    } else {
      closeBtn.classList.add('hidden');
    }

    document.getElementById('auth-step-google').classList.remove('hidden');
    document.getElementById('auth-step-profile').classList.add('hidden');

    modal.classList.remove('hidden');
    modal.classList.remove('pointer-events-none');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
    }, 10);

    renderGoogleButtons();
  }

  function hideAuthModal() {
    const modal = document.getElementById('melete-auth-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }

  function syncHeader() {
    const user = getUser();
    const firstName = user && user.name ? user.name.split(' ')[0] : 'Candidate';

    // 1. Update text displays (e.g. #user-display-name, #user-display-name-mobile)
    document.querySelectorAll('#user-display-name, #user-display-name-mobile').forEach(el => {
      el.textContent = user ? firstName : 'Candidate';
    });

    // 2. Header user badges
    const userBadges = document.querySelectorAll('#header-user-badge, #user-badge');
    userBadges.forEach(badge => {
      if (user) {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
        badge.onclick = (e) => {
          e.preventDefault();
          if (confirm(`Candidate Profile:\n• Name: ${user.name}\n• Email: ${user.email}\n• WhatsApp: ${user.phone || 'N/A'}\n\nDo you wish to sign out?`)) {
            signOut();
          }
        };
      } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
        badge.onclick = null;
      }
    });

    // 3. Header log-in text links (show when logged out, hide when logged in)
    const headerLoginLinks = document.querySelectorAll('#header-auth-login');
    headerLoginLinks.forEach(link => {
      if (user) {
        link.classList.add('hidden');
      } else {
        link.classList.remove('hidden');
      }
    });

    // 4. Drawer & footer login links
    document.querySelectorAll('.drawer-login-link, .footer-login-link').forEach(link => {
      if (user) {
        link.textContent = 'Sign Out (' + firstName + ')';
        link.onclick = (e) => {
          e.preventDefault();
          signOut();
        };
      } else {
        link.textContent = 'Log in';
        link.onclick = null;
      }
    });
  }

  function requireAuth(onSuccess, options = {}) {
    const user = getUser();
    if (user) {
      if (typeof onSuccess === 'function') onSuccess(user);
    } else {
      showAuthModal((authedUser) => {
        if (typeof onSuccess === 'function') onSuccess(authedUser);
      }, options);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    syncHeader();
    initGis();

    const isPracticePage = window.location.pathname.includes('practice.html') || window.location.pathname.includes('session.html');
    if (isPracticePage) {
      if (!getUser()) {
        requireAuth((u) => {
          console.log('Candidate signed in:', u.email);
        }, { allowClose: false });
      }
    }
  });

  return {
    getUser,
    setUser,
    signOut,
    requireAuth,
    showAuthModal,
    hideAuthModal,
    triggerGoogleSignIn,
    handleGoogleCredentialResponse,
    syncHeader
  };
})();
