(async function () {
  await MeleteAuth.ready;
  if (!MeleteAuth.getUser()) {
    MeleteAuth.requireAuth();
    return;
  }

  const id = new URLSearchParams(location.search).get('id');
  const container = document.getElementById('qa-audit-container');
  if (!id) {
    container.textContent = 'No completed report was selected.';
    return;
  }

  const add = (parent, tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = String(value);
    parent.appendChild(el);
    return el;
  };

  try {
    const data = await MeleteAuth.request(`/api/sessions/${encodeURIComponent(id)}`);
    const session = data.session;
    document.getElementById('report-ref').textContent = `REF: ${session.id}`;
    document.getElementById('report-date').textContent = new Date(session.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('report-candidate-meta').textContent = `${session.university || 'University'} • ${session.country || 'Destination'} • ${session.framework || 'Interview practice'}`;

    const score = Number(session.score);
    const scoreBox = document.getElementById('report-overall-score');
    scoreBox.replaceChildren();
    add(scoreBox, 'span', '', Number.isFinite(score) ? score : 0);
    add(scoreBox, 'span', 'text-secondary text-headline-md font-sans', '/100');
    document.getElementById('report-score-bar').style.width = `${Math.max(0, Math.min(100, score || 0))}%`;

    ['pillar-clarity','pillar-alignment','pillar-logic','pillar-depth'].forEach(key => {
      const el = document.getElementById(key);
      if (el) el.textContent = 'N/A';
    });

    const answers = Array.isArray(session.answers) ? session.answers : [];
    document.getElementById('total-answers-count').textContent = `${answers.length} Prompts Evaluated`;
    container.replaceChildren();

    answers.forEach((answer, index) => {
      const card = add(container, 'article', 'p-6 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-4 shadow-xs');
      const header = add(card, 'div', 'flex items-center justify-between font-mono text-xs text-secondary border-b border-outline-variant/40 pb-2');
      add(header, 'span', 'font-bold text-on-surface uppercase', `Question ${String(index + 1).padStart(2, '0')} • ${answer.type || 'CREDIBILITY CHECK'}`);
      add(header, 'span', `font-bold ${Number(answer.score) >= 75 ? 'text-emerald-700' : 'text-amber-700'}`, `Score: ${Number(answer.score) || 0}%`);
      add(card, 'h4', 'font-headline-md text-headline-md text-on-surface font-semibold', answer.q || 'Interview question');

      const comparison = add(card, 'div', 'grid grid-cols-1 md:grid-cols-2 gap-4 pt-1');
      const heard = add(comparison, 'div', 'p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/40 space-y-1.5');
      add(heard, 'span', 'font-mono text-[11px] text-secondary uppercase font-bold', 'What we heard you say');
      add(heard, 'p', 'font-body-md text-on-surface text-xs leading-relaxed italic', answer.what_heard || 'No transcript available.');
      const improved = add(comparison, 'div', 'p-4 bg-blue-50/70 rounded-lg border border-blue-200/70 space-y-1.5');
      add(improved, 'span', 'font-mono text-[11px] text-primary uppercase font-bold', 'A clearer way to answer');
      add(improved, 'p', 'font-body-md text-slate-900 text-xs leading-relaxed font-medium', answer.better_way || 'No suggested answer was returned.');

      const details = add(card, 'div', 'grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1');
      [['What worked', answer.strengths], ['Risks or missing details', answer.risks]].forEach(([title, items]) => {
        const box = add(details, 'div', 'p-3 bg-surface-container-highest/60 rounded');
        add(box, 'span', 'font-mono font-bold text-on-surface uppercase block text-[11px] mb-1', title);
        const list = add(box, 'ul', 'space-y-1 text-on-surface-variant list-disc list-inside');
        (Array.isArray(items) && items.length ? items : ['No items returned.']).forEach(item => add(list, 'li', '', item));
      });
    });
  } catch (error) {
    container.textContent = error.message || 'The report could not be loaded.';
  }
})();
