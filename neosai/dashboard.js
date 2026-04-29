// Neosai dashboard
// Reads state.json from GitHub raw URLs (fast, cacheable).
// Writes through Cloudflare Worker (handles auth, no token in client).

const CONFIG = {
  repo: 'Arcane-Designer/neosai-data',
  branch: 'main',
  // CAPTAIN: replace this with your deployed Worker URL after Step 5 of DEPLOY.md
  workerUrl: 'https://neosai-worker.nathanagellatly.workers.dev',
};

let state = null;
let characterOrder = null;
let currentEditWord = null;

// =============================================================
// CHARACTER REFERENCE DATA
// =============================================================
const HIRAGANA = [
  ['あ','a'],['い','i'],['う','u'],['え','e'],['お','o'],
  ['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko'],
  ['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so'],
  ['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to'],
  ['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no'],
  ['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho'],
  ['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo'],
  ['や','ya'],          ['ゆ','yu'],          ['よ','yo'],
  ['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro'],
  ['わ','wa'],                                  ['を','wo'],
  ['ん','n'],
];

const KATAKANA = [
  ['ア','a'],['イ','i'],['ウ','u'],['エ','e'],['オ','o'],
  ['カ','ka'],['キ','ki'],['ク','ku'],['ケ','ke'],['コ','ko'],
  ['サ','sa'],['シ','shi'],['ス','su'],['セ','se'],['ソ','so'],
  ['タ','ta'],['チ','chi'],['ツ','tsu'],['テ','te'],['ト','to'],
  ['ナ','na'],['ニ','ni'],['ヌ','nu'],['ネ','ne'],['ノ','no'],
  ['ハ','ha'],['ヒ','hi'],['フ','fu'],['ヘ','he'],['ホ','ho'],
  ['マ','ma'],['ミ','mi'],['ム','mu'],['メ','me'],['モ','mo'],
  ['ヤ','ya'],          ['ユ','yu'],          ['ヨ','yo'],
  ['ラ','ra'],['リ','ri'],['ル','ru'],['レ','re'],['ロ','ro'],
  ['ワ','wa'],                                  ['ヲ','wo'],
  ['ン','n'],
];

// =============================================================
// LOADING
// =============================================================

function rawUrl(file) {
  return `https://raw.githubusercontent.com/${CONFIG.repo}/${CONFIG.branch}/${file}`;
}

async function loadData() {
  document.getElementById('loading').style.display = 'block';
  document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');

  try {
    // Add a cache buster to ensure fresh data
    const cacheBuster = `?t=${Date.now()}`;
    const [stateRes, orderRes] = await Promise.allSettled([
      fetch(rawUrl('state.json') + cacheBuster, { cache: 'no-cache' }),
      fetch(rawUrl('character-order.json') + cacheBuster, { cache: 'no-cache' }),
    ]);

    if (stateRes.status === 'fulfilled' && stateRes.value.ok) {
      state = await stateRes.value.json();
    } else {
      state = makeEmptyState();
      showToast('Could not load state. Showing empty defaults.', 'error');
    }

    if (orderRes.status === 'fulfilled' && orderRes.value.ok) {
      characterOrder = await orderRes.value.json();
    } else {
      characterOrder = { order: [] };
    }
  } catch (err) {
    console.error('Load error:', err);
    state = makeEmptyState();
    showToast('Network error loading data.', 'error');
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
    current_character_script: null,
    current_week_words: [],
    delivery_log: [],
    all_words_learned: [],
    all_characters_learned: [],
    user_words: [],
  };
}

// =============================================================
// RENDERING
// =============================================================

function renderAll() {
  renderOverview();
  renderAllWords();
  renderCharacters();
  renderManage();
}

function renderOverview() {
  if (!state) return;
  const wordsCount = state.all_words_learned?.length || 0;
  const charsCount = state.all_characters_learned?.length || 0;
  const userCount = state.user_words?.length || 0;
  const week = state.current_week_number || 1;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat">
      <div class="stat-number">${wordsCount}</div>
      <div class="stat-label">Words</div>
    </div>
    <div class="stat">
      <div class="stat-number">${charsCount}</div>
      <div class="stat-label">Characters</div>
    </div>
    <div class="stat">
      <div class="stat-number">${week}</div>
      <div class="stat-label">Current Week</div>
    </div>
    <div class="stat">
      <div class="stat-number">${userCount}</div>
      <div class="stat-label">Personal</div>
    </div>
  `;

  const char = state.current_character || '?';
  const romaji = state.current_character_romaji || '';
  const script = state.current_character_script || '';
  const words = state.current_week_words || [];
  const dotsHtml = Array.from({length: 5}, (_, i) =>
    `<div class="dot ${i < words.length ? 'filled' : ''}"></div>`
  ).join('');

  document.getElementById('current-week-panel').innerHTML = `
    <div class="current-week">
      <div class="char-seal">${char}</div>
      <div class="current-week-content">
        <div class="label">Character of the Week — Week ${week}</div>
        <h3>${char}</h3>
        <div class="romaji">${romaji}${script ? ' · ' + script : ''}</div>
        <div class="progress">
          ${words.length} of 5 words delivered
          <span class="progress-dots">${dotsHtml}</span>
        </div>
      </div>
    </div>
  `;

  const container = document.getElementById('current-week-words');
  if (words.length === 0) {
    container.innerHTML = '<div class="empty-state">No words delivered yet this week. The first one will arrive on Monday morning.</div>';
    return;
  }
  container.innerHTML = renderCurrentWeekBlock(state.current_week_number, char, words);
}

function renderCurrentWeekBlock(weekNum, character, words) {
  const dayShort = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
  const wordsHtml = words.map((w, i) => {
    const fallback = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri ★'];
    const fromWeekday = w.weekday ? (dayShort[w.weekday] || w.weekday) + (w.is_funword ? ' ★' : '') : null;
    const label = fromWeekday || fallback[i] || '';
    const translation = w.translation || w.english || '';
    return `
      <div class="word-row ${w.is_funword ? 'is-funword' : ''}">
        <div class="slot-label">${escapeHtml(label)}</div>
        <div class="word-jp">${escapeHtml(w.japanese)}<span class="reading">${escapeHtml(w.reading_romaji || '')}</span></div>
        <div class="word-translation">${escapeHtml(translation)}</div>
        <div class="word-actions"></div>
      </div>
    `;
  }).join('');
  return `
    <div class="week-block">
      <div class="week-header">
        <div class="char-seal-mini">${character || '?'}</div>
        <h4>Week ${weekNum}</h4>
      </div>
      ${wordsHtml}
    </div>
  `;
}

function renderAllWords() {
  if (!state) return;
  const search = document.getElementById('word-search').value.toLowerCase();
  const filter = document.getElementById('word-filter').value;
  const allWords = state.all_words_learned || [];

  const filtered = allWords.filter(w => {
    if (filter === 'routine' && w.source !== 'routine') return false;
    if (filter === 'user' && w.source !== 'user') return false;
    if (filter === 'funword' && !w.is_funword) return false;
    if (search) {
      const hay = `${w.japanese} ${w.reading_romaji || ''} ${w.translation || w.english || ''} ${w.notes || ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  // Group by week_number
  const byWeek = {};
  for (const w of filtered) {
    const wk = w.week_number || 0;
    if (!byWeek[wk]) byWeek[wk] = { week_number: wk, character: w.character, words: [] };
    byWeek[wk].words.push(w);
  }

  const weekKeys = Object.keys(byWeek).map(Number).sort((a,b) => b - a);
  const container = document.getElementById('all-words-list');
  if (weekKeys.length === 0) {
    container.innerHTML = '<div class="empty-state">No words match this filter yet.</div>';
    return;
  }

  container.innerHTML = weekKeys.map(wk => {
    const week = byWeek[wk];
    const wordsHtml = week.words.map(w => {
      const isUser = w.source === 'user';
      const slotText = isUser ? 'Mine' : (w.slot || w.weekday || '');
      return `
        <div class="word-row ${w.is_funword ? 'is-funword' : ''} ${isUser ? 'is-user' : ''}">
          <div class="slot-label">${slotText}</div>
          <div class="word-jp">${escapeHtml(w.japanese)}<span class="reading">${escapeHtml(w.reading_romaji || '')}</span></div>
          <div class="word-translation">
            ${escapeHtml(w.translation || w.english || '')}
            ${w.notes ? `<span class="word-notes">${escapeHtml(w.notes)}</span>` : ''}
          </div>
          <div class="word-actions">
            ${isUser ? `<button class="btn-mini" onclick="openEdit('${escapeAttr(w.japanese)}')">Edit</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
    const headerLabel = wk === 0 ? 'Personal additions' : `Week ${wk}`;
    return `
      <div class="week-block">
        <div class="week-header">
          ${week.character ? `<div class="char-seal-mini">${week.character}</div>` : ''}
          <h4>${headerLabel}</h4>
        </div>
        ${wordsHtml}
      </div>
    `;
  }).join('');
}

function renderCharacters() {
  const learned = new Set(state?.all_characters_learned || []);
  const current = state?.current_character;

  const renderCell = (char, romaji, isKanji = false, meaning = null) => {
    let cls = 'char-cell';
    if (isKanji) cls += ' kanji-cell';
    if (char === current) cls += ' current';
    else if (learned.has(char)) cls += ' learned';
    return `<div class="${cls}" title="${meaning || romaji}">
      <div class="char">${char}</div>
      <div class="romaji">${romaji}</div>
    </div>`;
  };

  const renderEmpty = () => `<div class="char-cell" style="opacity:0;"></div>`;

  // Hiragana — render with empty cells in gaps for traditional layout
  const hiraganaHtml = renderHiraganaKatakanaGrid(HIRAGANA, learned, current);
  const katakanaHtml = renderHiraganaKatakanaGrid(KATAKANA, learned, current);

  // Kanji — pull from character-order.json
  const kanjiList = (characterOrder?.order || []).filter(c => c.script === 'kanji');
  const kanjiHtml = kanjiList.map(c => renderCell(c.char, c.romaji, true, c.meaning)).join('');

  document.getElementById('hiragana-grid').innerHTML = hiraganaHtml;
  document.getElementById('katakana-grid').innerHTML = katakanaHtml;
  document.getElementById('kanji-grid').innerHTML = kanjiHtml || '<div class="empty-state" style="grid-column:1/-1;">No kanji configured.</div>';

  // Counts
  const hCount = HIRAGANA.filter(([c]) => learned.has(c)).length;
  const kCount = KATAKANA.filter(([c]) => learned.has(c)).length;
  const jCount = kanjiList.filter(c => learned.has(c.char)).length;
  document.getElementById('hiragana-count').textContent = `${hCount} / ${HIRAGANA.length}`;
  document.getElementById('katakana-count').textContent = `${kCount} / ${KATAKANA.length}`;
  document.getElementById('kanji-count').textContent = `${jCount} / ${kanjiList.length}`;
}

function renderHiraganaKatakanaGrid(charset, learned, current) {
  return charset.map(([char, romaji]) => {
    let cls = 'char-cell';
    if (char === current) cls += ' current';
    else if (learned.has(char)) cls += ' learned';
    return `<div class="${cls}"><div class="char">${char}</div><div class="romaji">${romaji}</div></div>`;
  }).join('');
}

function renderManage() {
  const userWords = state?.user_words || [];
  const container = document.getElementById('user-words-list');
  if (userWords.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:24px;">No words added yet.</div>';
    return;
  }
  container.innerHTML = userWords.map(w => `
    <div class="word-row is-user" style="cursor:pointer;" onclick="openEdit('${escapeAttr(w.japanese)}')">
      <div class="slot-label">Mine</div>
      <div class="word-jp">${escapeHtml(w.japanese)}<span class="reading">${escapeHtml(w.reading_romaji || '')}</span></div>
      <div class="word-translation">
        ${escapeHtml(w.translation || w.english || '')}
        ${w.notes ? `<span class="word-notes">${escapeHtml(w.notes)}</span>` : ''}
      </div>
      <div class="word-actions"><button class="btn-mini">Edit</button></div>
    </div>
  `).join('');
}

// =============================================================
// USER ACTIONS — talk to the Worker
// =============================================================

async function workerCall(path, method, body) {
  const url = `${CONFIG.workerUrl}${path}`;
  const init = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data.error || `Worker error ${res.status}`;
    throw new Error(errMsg);
  }
  return data;
}

async function addUserWord() {
  const jp = document.getElementById('add-jp').value.trim();
  const ro = document.getElementById('add-romaji').value.trim();
  const tr = document.getElementById('add-translation').value.trim();
  const notes = document.getElementById('add-notes').value.trim();
  if (!jp) {
    showToast('Japanese field is required', 'error');
    return;
  }

  const btn = document.getElementById('add-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    await workerCall('/add-word', 'POST', { japanese: jp, reading_romaji: ro, translation: tr, notes });
    document.getElementById('add-jp').value = '';
    document.getElementById('add-romaji').value = '';
    document.getElementById('add-translation').value = '';
    document.getElementById('add-notes').value = '';
    showToast('Word added', 'success');
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Add word';
  }
}

function openEdit(japanese) {
  // Decode in case it came through escapeAttr
  const decoded = japanese.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
  const word = state.user_words?.find(w => w.japanese === decoded);
  if (!word) return showToast('Word not found in your list', 'error');
  currentEditWord = word;
  document.getElementById('edit-jp').value = word.japanese;
  document.getElementById('edit-romaji').value = word.reading_romaji || '';
  document.getElementById('edit-translation').value = word.translation || '';
  document.getElementById('edit-notes').value = word.notes || '';
  document.getElementById('edit-modal').classList.add('show');
}

function closeModal() {
  document.getElementById('edit-modal').classList.remove('show');
  currentEditWord = null;
}

async function saveEdit() {
  if (!currentEditWord) return;
  const updates = {
    reading_romaji: document.getElementById('edit-romaji').value.trim(),
    translation: document.getElementById('edit-translation').value.trim(),
    notes: document.getElementById('edit-notes').value.trim(),
  };
  try {
    await workerCall('/update-word', 'POST', { japanese: currentEditWord.japanese, updates });
    showToast('Saved', 'success');
    closeModal();
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCurrentWord() {
  if (!currentEditWord) return;
  if (!confirm(`Delete "${currentEditWord.japanese}"? This cannot be undone.`)) return;
  try {
    await workerCall('/delete-word', 'POST', { japanese: currentEditWord.japanese });
    showToast('Deleted', 'success');
    closeModal();
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =============================================================
// UTILITIES
// =============================================================

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&apos;");
}

let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3000);
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

document.getElementById('word-search')?.addEventListener('input', renderAllWords);
document.getElementById('word-filter')?.addEventListener('change', renderAllWords);

// Close modal when clicking outside
document.getElementById('edit-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'edit-modal') closeModal();
});

// Initial load
loadData();
