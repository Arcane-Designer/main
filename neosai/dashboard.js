// Neosai Dashboard — Captain's Japanese learning interface
// Reads data from GitHub raw URLs; stores user-side preferences and lists in component memory.
// Note: This is a static page, so changes are stored in JS state during the session and
// exported as JSON for Captain to commit back to the repo manually.

const DEFAULTS = {
  // Captain: update this after creating the GitHub repo. Format: "owner/repo-name"
  repo: 'Arcane-Designer/neosai-data',
  branch: 'main',
};

// Standard hiragana chart in pedagogical order.
const HIRAGANA_CHART = [
  ['あ','a'],['い','i'],['う','u'],['え','e'],['お','o'],
  ['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko'],
  ['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so'],
  ['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to'],
  ['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no'],
  ['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho'],
  ['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo'],
  ['や','ya'],['ゆ','yu'],['よ','yo'],
  ['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro'],
  ['わ','wa'],['を','wo'],['ん','n'],
];

// In-memory state for this session
let appState = {
  state: null,        // from state.json
  curriculum: null,   // from curriculum.json
  userLists: {        // synced via export to user-lists.json
    known: [],
    custom: [],
  },
  prefs: {
    show_spoilers: false,
    hide_known: true,
  },
  repo: DEFAULTS.repo,
  branch: DEFAULTS.branch,
};

// =============================================================
// DATA LOADING
// =============================================================

function rawUrl(file) {
  return `https://raw.githubusercontent.com/${appState.repo}/${appState.branch}/${file}`;
}

async function loadData() {
  document.getElementById('loading').style.display = 'block';
  document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');

  try {
    const [stateRes, currRes, userRes] = await Promise.allSettled([
      fetch(rawUrl('state.json'), { cache: 'no-cache' }),
      fetch(rawUrl('curriculum.json'), { cache: 'no-cache' }),
      fetch(rawUrl('user-lists.json'), { cache: 'no-cache' }),
    ]);

    if (stateRes.status === 'fulfilled' && stateRes.value.ok) {
      appState.state = await stateRes.value.json();
    } else {
      appState.state = makeEmptyState();
    }

    if (currRes.status === 'fulfilled' && currRes.value.ok) {
      appState.curriculum = await currRes.value.json();
    } else {
      console.warn('curriculum.json not loaded — upcoming view disabled');
      appState.curriculum = { weeks: [] };
    }

    if (userRes.status === 'fulfilled' && userRes.value.ok) {
      const userData = await userRes.value.json();
      appState.userLists = {
        known: userData.known || [],
        custom: userData.custom || [],
      };
    }
  } catch (err) {
    console.error('Load error:', err);
  }

  document.getElementById('loading').style.display = 'none';
  document.querySelectorAll('.panel').forEach(p => {
    if (p.classList.contains('active')) p.style.display = 'block';
  });

  renderAll();
}

function makeEmptyState() {
  return {
    current_week_number: 1,
    current_character: null,
    current_character_romaji: null,
    current_week_words: [],
    delivery_log: [],
    all_words_learned: [],
    all_characters_learned: [],
  };
}

// =============================================================
// RENDERING
// =============================================================

function renderAll() {
  renderMasthead();
  renderOverview();
  renderAllWords();
  renderCharacters();
  renderManage();
  renderUpcoming();
  renderSettingsPanel();
}

function renderMasthead() {
  const week = appState.state?.current_week_number ?? 1;
  document.getElementById('meta-week').textContent = String(week).padStart(2, '0');
  const today = new Date();
  document.getElementById('meta-date').textContent = today.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function renderOverview() {
  const s = appState.state;
  if (!s) return;

  // Stats
  const wordsCount = s.all_words_learned?.length || 0;
  const charsCount = s.all_characters_learned?.length || 0;
  const customCount = appState.userLists.custom.length;
  const knownCount = appState.userLists.known.length;

  const statsHtml = `
    <div class="stat">
      <div class="stat-number">${wordsCount}</div>
      <div class="stat-label">Words Learned</div>
    </div>
    <div class="stat">
      <div class="stat-number">${charsCount}</div>
      <div class="stat-label">Characters Acquired</div>
    </div>
    <div class="stat">
      <div class="stat-number">${s.current_week_number || 1}</div>
      <div class="stat-label">Current Week</div>
    </div>
    <div class="stat">
      <div class="stat-number">${customCount + knownCount}</div>
      <div class="stat-label">Personal Entries</div>
    </div>
  `;
  document.getElementById('stats-grid').innerHTML = statsHtml;

  // Current week panel
  const char = s.current_character || '?';
  const romaji = s.current_character_romaji || '';
  const words = s.current_week_words || [];
  const dotsHtml = Array.from({length: 5}, (_, i) =>
    `<div class="dot ${i < words.length ? 'filled' : ''}"></div>`
  ).join('');

  const weekDates = getWeekDateRange(s.current_week_start);

  document.getElementById('current-week-panel').innerHTML = `
    <div class="current-week">
      <div class="char-seal">${char}</div>
      <div class="current-week-content">
        <div class="label">Character of the Week — Week ${s.current_week_number || 1}</div>
        <h3>${char}</h3>
        <div class="romaji">${romaji}</div>
        <div class="progress">
          ${words.length} of 5 words delivered
          <span class="progress-dots">${dotsHtml}</span>
        </div>
        ${weekDates ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);margin-top:12px;letter-spacing:0.1em;text-transform:uppercase;">${weekDates}</div>` : ''}
      </div>
    </div>
  `;

  // This week's five words
  const container = document.getElementById('current-week-words');
  if (words.length === 0) {
    container.innerHTML = '<div class="empty-state">No words delivered yet this week. The first one will arrive on Monday morning.</div>';
    return;
  }
  container.innerHTML = renderWeekBlock({
    week_number: s.current_week_number,
    character: s.current_character,
    character_romaji: s.current_character_romaji,
    words_delivered: words,
  }, true);
}

function getWeekDateRange(startDate) {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (isNaN(start)) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} — ${fmt(end)}`;
}

function renderAllWords() {
  const s = appState.state;
  if (!s) return;
  const search = document.getElementById('word-search').value.toLowerCase();
  const filter = document.getElementById('word-filter').value;
  const words = s.all_words_learned || [];

  // Group by week
  const byWeek = {};
  for (const w of words) {
    if (!byWeek[w.week_number]) byWeek[w.week_number] = { week_number: w.week_number, character: w.character, words: [] };
    byWeek[w.week_number].words.push(w);
  }

  const known = new Set(appState.userLists.known.map(k => k.japanese));

  const filtered = Object.values(byWeek).map(week => {
    const filteredWords = week.words.filter(w => {
      const isKnown = known.has(w.japanese);
      if (filter === 'active' && isKnown) return false;
      if (filter === 'known' && !isKnown) return false;
      if (filter === 'funword' && !w.is_funword) return false;
      if (search) {
        const hay = `${w.japanese} ${w.reading_romaji || ''} ${w.translation || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    return { ...week, words: filteredWords };
  }).filter(w => w.words.length > 0).sort((a,b) => b.week_number - a.week_number);

  const container = document.getElementById('all-words-list');
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No words match this filter yet.</div>';
    return;
  }
  container.innerHTML = filtered.map(week => renderWeekBlockFromLog(week, known)).join('');
}

function renderWeekBlock(week, isCurrent) {
  const wordsHtml = (week.words_delivered || []).map((w, i) => {
    const slotLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri ★'];
    return `
      <div class="word-row ${w.is_funword ? 'is-funword' : ''}">
        <div class="slot-label">${slotLabels[i] || ''}</div>
        <div class="word-jp">${w.japanese}<span class="reading">${w.reading_romaji || ''}</span></div>
        <div class="word-translation">${w.translation || ''}</div>
        <div class="word-actions"></div>
      </div>
    `;
  }).join('');
  return `
    <div class="week-block">
      <div class="week-header">
        <div class="char-seal-mini">${week.character || '?'}</div>
        <h4>Week ${week.week_number}</h4>
        <div class="week-date">${week.character_romaji || ''}</div>
      </div>
      ${wordsHtml || '<div class="empty-state" style="padding:32px;">Awaiting first delivery…</div>'}
    </div>
  `;
}

function renderWeekBlockFromLog(week, known) {
  const wordsHtml = week.words.map(w => {
    const isKnown = known.has(w.japanese);
    return `
      <div class="word-row ${w.is_funword ? 'is-funword' : ''} ${isKnown ? 'is-known' : ''}">
        <div class="slot-label">${w.slot || ''}</div>
        <div class="word-jp">${w.japanese}<span class="reading">${w.reading_romaji || ''}</span></div>
        <div class="word-translation">${w.translation || ''}</div>
        <div class="word-actions">
          <button class="btn-mini ${isKnown ? 'active' : ''}" onclick="toggleKnown('${w.japanese.replace(/'/g, "\\'")}', '${(w.reading_romaji||'').replace(/'/g, "\\'")}', '${(w.translation||'').replace(/'/g, "\\'")}')">${isKnown ? '✓ Known' : 'Mark known'}</button>
        </div>
      </div>
    `;
  }).join('');
  return `
    <div class="week-block">
      <div class="week-header">
        <div class="char-seal-mini">${week.character || '?'}</div>
        <h4>Week ${week.week_number}</h4>
      </div>
      ${wordsHtml}
    </div>
  `;
}

function renderCharacters() {
  const learned = new Set(appState.state?.all_characters_learned || []);
  const current = appState.state?.current_character;
  const grid = document.getElementById('char-grid');
  grid.innerHTML = HIRAGANA_CHART.map(([ch, ro]) => {
    let cls = 'char-cell';
    if (ch === current) cls += ' current';
    else if (learned.has(ch)) cls += ' learned';
    return `<div class="${cls}"><div class="char">${ch}</div><div class="romaji">${ro}</div></div>`;
  }).join('');
}

function renderManage() {
  // Known list
  const knownContainer = document.getElementById('known-list');
  if (appState.userLists.known.length === 0) {
    knownContainer.innerHTML = '<div style="font-style:italic;color:var(--muted);font-size:13px;padding:8px 0;">No known words added yet.</div>';
  } else {
    knownContainer.innerHTML = appState.userLists.known.map((k, i) => `
      <div class="list-managed-item">
        <div>
          <span class="word">${k.japanese}</span>
          <span class="reading">${k.reading_romaji || ''}</span>
          <span style="color:var(--muted);font-style:italic;margin-left:8px;font-size:13px;">— ${k.translation || ''}</span>
        </div>
        <button onclick="removeKnown(${i})">remove</button>
      </div>
    `).join('');
  }

  // Custom list
  const customContainer = document.getElementById('custom-list');
  if (appState.userLists.custom.length === 0) {
    customContainer.innerHTML = '<div style="font-style:italic;color:var(--muted);font-size:13px;padding:8px 0;">No custom words yet.</div>';
  } else {
    customContainer.innerHTML = appState.userLists.custom.map((c, i) => `
      <div class="list-managed-item">
        <div>
          <span class="word">${c.japanese}</span>
          <span class="reading">${c.reading_romaji || ''}</span>
          <span style="color:var(--muted);font-style:italic;margin-left:8px;font-size:13px;">— ${c.translation || ''}</span>
          ${c.source ? `<span style="font-size:11px;color:var(--muted);margin-left:8px;">[${c.source}]</span>` : ''}
        </div>
        <button onclick="removeCustom(${i})">remove</button>
      </div>
    `).join('');
  }

  updateExport();
}

function renderUpcoming() {
  const container = document.getElementById('upcoming-content');
  if (!appState.prefs.show_spoilers) {
    container.innerHTML = `
      <div class="spoiler-warning">
        <h4>⚠ Spoiler zone</h4>
        <p>You said you didn't want to see upcoming words. This is hidden by default. Toggle on in Settings if you ever want to peek.</p>
      </div>
    `;
    return;
  }

  if (!appState.curriculum?.weeks) {
    container.innerHTML = '<div class="empty-state">Curriculum not loaded.</div>';
    return;
  }

  const currentWeek = appState.state?.current_week_number || 1;
  const upcoming = appState.curriculum.weeks.filter(w => w.week_number >= currentWeek);
  if (upcoming.length === 0) {
    container.innerHTML = '<div class="empty-state">No upcoming weeks. Curriculum exhausted.</div>';
    return;
  }

  const html = upcoming.map(week => {
    const slots = ['monday','tuesday','wednesday','thursday','friday_funword'];
    const slotLabels = ['Mon','Tue','Wed','Thu','Fri ★'];
    const wordsHtml = slots.map((slot, i) => {
      const w = week.words[slot];
      if (!w) return '';
      return `
        <div class="word-row ${w.is_funword ? 'is-funword' : ''}">
          <div class="slot-label">${slotLabels[i]}</div>
          <div class="word-jp">${w.japanese}<span class="reading">${w.reading_romaji || ''}</span></div>
          <div class="word-translation">${w.translation || ''}</div>
          <div class="word-actions"></div>
        </div>
      `;
    }).join('');
    return `
      <div class="week-block">
        <div class="week-header">
          <div class="char-seal-mini">${week.character}</div>
          <h4>Week ${week.week_number}</h4>
          <div class="week-date">${week.character_romaji}</div>
        </div>
        ${wordsHtml}
      </div>
    `;
  }).join('');
  container.innerHTML = `<div class="upcoming-block">${html}</div>`;
}

function renderSettingsPanel() {
  const spoilerToggle = document.getElementById('toggle-spoilers');
  spoilerToggle.classList.toggle('on', appState.prefs.show_spoilers);
  const knownToggle = document.getElementById('toggle-hide-known');
  knownToggle.classList.toggle('on', appState.prefs.hide_known);
  document.getElementById('repo-input').value = appState.repo;
}

// =============================================================
// USER ACTIONS
// =============================================================

function addKnown() {
  const jp = document.getElementById('known-jp').value.trim();
  const ro = document.getElementById('known-romaji').value.trim();
  const tr = document.getElementById('known-translation').value.trim();
  if (!jp) return alert('Please enter the Japanese word.');
  appState.userLists.known.push({ japanese: jp, reading_romaji: ro, translation: tr, added_at: new Date().toISOString() });
  document.getElementById('known-jp').value = '';
  document.getElementById('known-romaji').value = '';
  document.getElementById('known-translation').value = '';
  renderManage();
}

function addCustom() {
  const jp = document.getElementById('add-jp').value.trim();
  const ro = document.getElementById('add-romaji').value.trim();
  const tr = document.getElementById('add-translation').value.trim();
  const src = document.getElementById('add-source').value.trim();
  if (!jp) return alert('Please enter the Japanese word.');
  appState.userLists.custom.push({
    japanese: jp,
    reading_romaji: ro,
    translation: tr,
    source: src,
    added_at: new Date().toISOString(),
  });
  document.getElementById('add-jp').value = '';
  document.getElementById('add-romaji').value = '';
  document.getElementById('add-translation').value = '';
  document.getElementById('add-source').value = '';
  renderManage();
}

function removeKnown(idx) {
  appState.userLists.known.splice(idx, 1);
  renderManage();
}

function removeCustom(idx) {
  appState.userLists.custom.splice(idx, 1);
  renderManage();
}

function toggleKnown(jp, ro, tr) {
  const idx = appState.userLists.known.findIndex(k => k.japanese === jp);
  if (idx >= 0) {
    appState.userLists.known.splice(idx, 1);
  } else {
    appState.userLists.known.push({ japanese: jp, reading_romaji: ro, translation: tr, added_at: new Date().toISOString() });
  }
  renderAllWords();
  renderManage();
}

function toggleSetting(key, el) {
  appState.prefs[key] = !appState.prefs[key];
  el.classList.toggle('on');
  if (key === 'show_spoilers') renderUpcoming();
  if (key === 'hide_known') renderAllWords();
}

function updateExport() {
  const data = {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    known: appState.userLists.known,
    custom: appState.userLists.custom,
  };
  document.getElementById('export-json').textContent = JSON.stringify(data, null, 2);
}

function copyExport() {
  const text = document.getElementById('export-json').textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied. Paste into user-lists.json in your repo and commit.');
  });
}

// =============================================================
// TAB SWITCHING
// =============================================================

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.tab;
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });
    const panel = document.querySelector(`.panel[data-panel="${target}"]`);
    if (panel) {
      panel.classList.add('active');
      panel.style.display = 'block';
    }
  });
});

// Search/filter listeners
document.getElementById('word-search')?.addEventListener('input', renderAllWords);
document.getElementById('word-filter')?.addEventListener('change', renderAllWords);

// Repo input
document.getElementById('repo-input')?.addEventListener('change', (e) => {
  appState.repo = e.target.value.trim() || DEFAULTS.repo;
  loadData();
});

// Initialize
loadData();
