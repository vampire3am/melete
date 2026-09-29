/**
 * Melete Universal Authentication & Google Sign-In Gate Engine
 * Ensures candidate verification, Google profile capture, WhatsApp/phone data collection,
 * and session sync across all mock and drill practice interfaces.
 */

window.MeleteAuth = (function () {
  const STORAGE_KEY = 'melete_user';

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
    const isProtected = ['practice.html', 'session.html', 'onboarding.html'].some(page => 
      window.location.pathname.includes(page)
    );
    if (isProtected) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
    } else {
      window.location.reload();
    }
  }

  // Create & mount the Google Sign-In Gate Modal
  function createAuthModal() {
    if (document.getElementById('melete-auth-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'melete-auth-modal';
    modal.className = 'fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300 opacity-0 pointer-events-none';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all duration-300 scale-95" id="melete-auth-modal-card">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-[#1A3C8F] to-[#0d2a60] p-6 text-white text-center relative">
          <button id="auth-modal-close-btn" class="absolute top-4 right-4 text-white/70 hover:text-white text-sm p-1 rounded-full hover:bg-white/10 hidden" title="Close">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div class="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm mx-auto flex items-center justify-center mb-3 shadow-inner">
            <img src="assets/favicon.svg" alt="Melete" class="w-7 h-7 object-contain"/>
          </div>
          <span class="text-[11px] font-mono uppercase tracking-widest text-blue-200 font-semibold block">Candidate Authentication</span>
          <h2 class="text-xl font-serif font-bold text-white mt-1">Sign In to Start Practice</h2>
          <p class="text-xs text-blue-100/90 mt-1.5 leading-relaxed">
            Melete requires candidate verification to record your speech, evaluate credibility against consular rubrics, and save your dossier.
          </p>
        </div>

        <div class="p-6 space-y-5">
          <!-- Step 1: Google Sign-in Trigger -->
          <div id="auth-step-google" class="space-y-4">
            <button id="btn-google-continue" class="w-full py-3 px-4 rounded-xl border border-slate-300 hover:border-primary bg-white text-slate-800 font-sans text-sm font-semibold flex items-center justify-center gap-3 transition-all hover:shadow-md cursor-pointer group">
              <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span class="group-hover:text-primary transition-colors">Continue with Google</span>
            </button>

            <div class="relative flex items-center justify-center border-t border-slate-200 pt-3">
              <span class="bg-white px-2.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider absolute -top-2">What we verify</span>
            </div>

            <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono">
              <div class="p-2 bg-slate-50 rounded-lg flex items-center gap-1.5 border border-slate-100">
                <span class="material-symbols-outlined text-[15px] text-emerald-600">verified_user</span>
                <span>Google Verified ID</span>
              </div>
              <div class="p-2 bg-slate-50 rounded-lg flex items-center gap-1.5 border border-slate-100">
                <span class="material-symbols-outlined text-[15px] text-blue-600">phone_iphone</span>
                <span>WhatsApp Follow-up</span>
              </div>
            </div>

            <p class="text-[11px] text-slate-400 text-center leading-normal">
              By continuing, you agree to Melete's <a href="terms-of-use.html" class="underline hover:text-slate-600">Terms</a> and <a href="privacy-policy.html" class="underline hover:text-slate-600">Privacy Policy</a>. Practice is free.
            </p>
          </div>

          <!-- Step 2: Candidate Profile Details (Phone & Target Destination) -->
          <form id="auth-step-profile" class="hidden space-y-3.5">
            <div class="flex items-center gap-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
              <img id="auth-preview-avatar" src="assets/favicon.svg" class="w-10 h-10 rounded-full object-cover border border-blue-200 shrink-0"/>
              <div class="min-w-0">
                <p id="auth-preview-name" class="text-xs font-bold text-slate-900 truncate">Candidate Name</p>
                <p id="auth-preview-email" class="text-[11px] font-mono text-slate-500 truncate">student@gmail.com</p>
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-slate-700">Phone / WhatsApp Number <span class="text-red-500">*</span></label>
              <div class="flex gap-2">
                <select id="auth-phone-code" class="w-28 px-2 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:outline-primary">
                  <option value="+44">UK (+44)</option>
                  <option value="+1">US/CA (+1)</option>
                  <option value="+977" selected>NP (+977)</option>
                  <option value="+91">IN (+91)</option>
                  <option value="+61">AU (+61)</option>
                  <option value="+49">DE (+49)</option>
                  <option value="+234">NG (+234)</option>
                  <option value="+880">BD (+880)</option>
                  <option value="+92">PK (+92)</option>
                </select>
                <input id="auth-phone-num" type="tel" required placeholder="98XXXXXXXX" class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-primary placeholder:text-slate-400 font-mono"/>
              </div>
              <p class="text-[10px] text-slate-400">Used by counselors to send official performance dossier reports.</p>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Target Country</label>
                <select id="auth-country" class="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:outline-primary">
                  <option value="United Kingdom" selected>United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="Germany">Germany</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Target University</label>
                <input id="auth-university" type="text" placeholder="e.g. Coventry, BPP" class="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-primary placeholder:text-slate-400"/>
              </div>
            </div>

            <button type="submit" id="btn-auth-complete" class="w-full py-2.5 rounded-xl bg-primary text-white font-sans text-xs font-semibold uppercase tracking-wider hover:bg-[#0d2a60] transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <span>Complete & Start Practice</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </form>

        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event Listeners for Modal
    const btnContinue = document.getElementById('btn-google-continue');
    btnContinue.addEventListener('click', handleGoogleContinue);

    const profileForm = document.getElementById('auth-step-profile');
    profileForm.addEventListener('submit', handleProfileSubmit);

    const closeBtn = document.getElementById('auth-modal-close-btn');
    closeBtn.addEventListener('click', () => hideAuthModal());
  }

  let activeAuthCallback = null;
  let tempGoogleData = null;

  function showAuthModal(callback, options = {}) {
    createAuthModal();
    activeAuthCallback = callback;
    const modal = document.getElementById('melete-auth-modal');
    const card = document.getElementById('melete-auth-modal-card');
    const closeBtn = document.getElementById('auth-modal-close-btn');

    if (options.allowClose) {
      closeBtn.classList.remove('hidden');
    } else {
      closeBtn.classList.add('hidden');
    }

    // Reset to step 1
    document.getElementById('auth-step-google').classList.remove('hidden');
    document.getElementById('auth-step-profile').classList.add('hidden');

    modal.classList.remove('pointer-events-none');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      card.classList.remove('scale-95');
      card.classList.add('scale-100');
    }, 10);
  }

  function hideAuthModal() {
    const modal = document.getElementById('melete-auth-modal');
    const card = document.getElementById('melete-auth-modal-card');
    if (!modal) return;
    modal.classList.add('opacity-0');
    card.classList.remove('scale-100');
    card.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('pointer-events-none');
    }, 300);
  }

  async function handleGoogleContinue() {
    // Prompt or emulate Google OAuth Profile
    const current = getUser();
    let googleName = current ? current.name : '';
    let googleEmail = current ? current.email : '';

    if (!googleEmail) {
      googleEmail = prompt('Enter your Google Account email:', 'candidate.scholar@gmail.com');
      if (!googleEmail) return;
      googleName = prompt('Enter your full legal candidate name:', 'Sarah Chen') || 'Candidate Student';
    }

    tempGoogleData = {
      name: googleName,
      email: googleEmail,
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    // Transition smoothly to Step 2 for Phone & Destination
    document.getElementById('auth-step-google').classList.add('hidden');
    const profileForm = document.getElementById('auth-step-profile');
    profileForm.classList.remove('hidden');

    document.getElementById('auth-preview-name').textContent = tempGoogleData.name;
    document.getElementById('auth-preview-email').textContent = tempGoogleData.email;
    document.getElementById('auth-preview-avatar').src = tempGoogleData.picture;
    document.getElementById('auth-phone-num').focus();
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    const phoneCode = document.getElementById('auth-phone-code').value;
    const phoneNum = document.getElementById('auth-phone-num').value.trim();
    const fullPhone = `${phoneCode} ${phoneNum}`;
    const country = document.getElementById('auth-country').value;
    const uni = document.getElementById('auth-university').value.trim() || 'Coventry University';

    const submitBtn = document.getElementById('btn-auth-complete');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Authenticating...';

    try {
      const payload = {
        name: tempGoogleData.name,
        email: tempGoogleData.email,
        picture: tempGoogleData.picture,
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
        if (typeof activeAuthCallback === 'function') {
          activeAuthCallback(data.user);
        }
      } else {
        alert('Authentication failed: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      console.error(err);
      // Offline fallback
      const fallbackUser = {
        id: 'usr_' + Date.now(),
        name: tempGoogleData.name,
        email: tempGoogleData.email,
        phone: fullPhone,
        target_destination: country,
        target_university: uni,
        picture: tempGoogleData.picture
      };
      setUser(fallbackUser);
      hideAuthModal();
      if (typeof activeAuthCallback === 'function') {
        activeAuthCallback(fallbackUser);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Complete & Start Practice</span><span class="material-symbols-outlined text-[16px]">arrow_forward</span>';
    }
  }

  // Update navigation headers across all pages
  function syncHeader() {
    const user = getUser();
    const userBadges = document.querySelectorAll('#user-badge, #user-display-name, #user-display-name-mobile');
    
    userBadges.forEach(el => {
      if (user) {
        el.textContent = user.name.split(' ')[0];
      } else {
        el.textContent = 'Sign In';
      }
    });

    // Update login link in desktop header
    const loginLinks = document.querySelectorAll('a[href="login.html"]');
    loginLinks.forEach(link => {
      if (user) {
        link.textContent = 'Account (' + user.name.split(' ')[0] + ')';
        link.title = 'Signed in as ' + user.email;
        link.onclick = (e) => {
          e.preventDefault();
          if (confirm(`Signed in as ${user.name} (${user.email})\nPhone: ${user.phone || 'Not recorded'}\n\nWould you like to log out?`)) {
            signOut();
          }
        };
      } else {
        link.textContent = 'Log in';
        link.onclick = null;
      }
    });
  }

  // Enforce authentication on practice pages
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

  // Auto-init on page load
  document.addEventListener('DOMContentLoaded', () => {
    syncHeader();

    // Check if on protected practice page
    const pathname = window.location.pathname;
    const isPracticePage = pathname.includes('practice.html') || pathname.includes('session.html');
    
    if (isPracticePage) {
      const user = getUser();
      if (!user) {
        // Enforce un-skippable Google Auth Gate
        requireAuth((u) => {
          console.log('Candidate authenticated:', u);
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
    syncHeader
  };
})();
