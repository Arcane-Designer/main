// Neosai dashboard — v4 (manual-only)
// Tabs: Words / Characters
// Words      = your personal list (add / edit / delete)
// Characters = hiragana, katakana, kanji tiles you mark as learned
// No routines, no automations. State lives in Arcane-Designer/neosai-data/state.json
// and is written through the neosai-worker.

const CONFIG = {
  repo: 'Arcane-Designer/neosai-data',
  branch: 'main',
  workerUrl: 'https://neosai-worker.nathanagellatly.workers.dev',
  // Append ?nosave to the URL to try the UI without writing anything.
  readOnly: /[?&]nosave\b/.test(location.search),
};

let state = null;
let characterOrder = null;
let kanjiList = [];
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
  ['や','ya'],['ゆ','yu'],['よ','yo'],
  ['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro'],
  ['わ','wa'],['を','wo'],['ん','n'],
  ['が','ga'],['ぎ','gi'],['ぐ','gu'],['げ','ge'],['ご','go'],
  ['ざ','za'],['じ','ji'],['ず','zu'],['ぜ','ze'],['ぞ','zo'],
  ['だ','da'],['ぢ','ji'],['づ','zu'],['で','de'],['ど','do'],
  ['ば','ba'],['び','bi'],['ぶ','bu'],['べ','be'],['ぼ','bo'],
  ['ぱ','pa'],['ぴ','pi'],['ぷ','pu'],['ぺ','pe'],['ぽ','po'],
];

const KATAKANA = [
  ['ア','a'],['イ','i'],['ウ','u'],['エ','e'],['オ','o'],
  ['カ','ka'],['キ','ki'],['ク','ku'],['ケ','ke'],['コ','ko'],
  ['サ','sa'],['シ','shi'],['ス','su'],['セ','se'],['ソ','so'],
  ['タ','ta'],['チ','chi'],['ツ','tsu'],['テ','te'],['ト','to'],
  ['ナ','na'],['ニ','ni'],['ヌ','nu'],['ネ','ne'],['ノ','no'],
  ['ハ','ha'],['ヒ','hi'],['フ','fu'],['ヘ','he'],['ホ','ho'],
  ['マ','ma'],['ミ','mi'],['ム','mu'],['メ','me'],['モ','mo'],
  ['ヤ','ya'],['ユ','yu'],['ヨ','yo'],
  ['ラ','ra'],['リ','ri'],['ル','ru'],['レ','re'],['ロ','ro'],
  ['ワ','wa'],['ヲ','wo'],['ン','n'],
  ['ガ','ga'],['ギ','gi'],['グ','gu'],['ゲ','ge'],['ゴ','go'],
  ['ザ','za'],['ジ','ji'],['ズ','zu'],['ゼ','ze'],['ゾ','zo'],
  ['ダ','da'],['ヂ','ji'],['ヅ','zu'],['デ','de'],['ド','do'],
  ['バ','ba'],['ビ','bi'],['ブ','bu'],['ベ','be'],['ボ','bo'],
  ['パ','pa'],['ピ','pi'],['プ','pu'],['ペ','pe'],['ポ','po'],
];

const GRADES = [1, 2, 3, 4, 5, 6, 'S'];
const GRADE_LABEL = { 1: 'Grade 1', 2: 'Grade 2', 3: 'Grade 3', 4: 'Grade 4', 5: 'Grade 5', 6: 'Grade 6', S: 'Secondary' };
const GRADE_KANJI = { 1: '一年', 2: '二年', 3: '三年', 4: '四年', 5: '五年', 6: '六年', S: '中学' };

// Character metadata lookup (romaji / meaning / script) so the detail card
// never has to read it back out of the DOM.
const charMeta = new Map();

// =============================================================
// LOADING
// =============================================================
const $ = (id) => document.getElementById(id);

function rawUrl(file) {
  return `https://raw.githubusercontent.com/${CONFIG.repo}/${CONFIG.branch}/${file}`;
}

const CACHE_KEY = 'neosai.state.v4';

function readCachedState() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' && 'user_words' in data ? data : null;
  } catch (_) { return null; }
}

function writeCachedState(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (_) {}
}

function setupCharacterMeta() {
  kanjiList = (characterOrder?.order || []).filter(c => c.script === 'kanji');
  charMeta.clear();
  for (const [c, r] of HIRAGANA) charMeta.set(c, { romaji: r, script: 'hiragana', meaning: null });
  for (const [c, r] of KATAKANA) charMeta.set(c, { romaji: r, script: 'katakana', meaning: null });
  for (const k of kanjiList) charMeta.set(k.char, { romaji: k.romaji || '', script: 'kanji', meaning: k.meaning || null, grade: k.grade || 'S' });
}

// Progressive load: the character inventory ships with the page, and the
// last known state is cached locally, so the page is usable immediately.
// The live state then arrives from the Worker and replaces both.
async function loadData() {
  characterOrder = embeddedOrder() || await fetchOrderWithFallback();
  setupCharacterMeta();

  const cached = readCachedState();
  state = cached || makeEmptyState();
  $('loading').hidden = !!cached;
  document.body.classList.add('ready');
  renderAll();

  const fresh = await fetchStateWithFallback();
  if (fresh) {
    state = fresh;
    writeCachedState(fresh);
    $('loading').hidden = true;
    renderAll();
  }
}

function embeddedOrder() {
  const k = window.NEOSAI_KANJI;
  if (!Array.isArray(k) || k.length === 0) return null;
  return { order: k.map(([char, grade, meaning, romaji]) => ({ char, grade, meaning, romaji, script: 'kanji' })) };
}

async function fetchStateWithFallback() {
  try {
    const res = await fetch(`${CONFIG.workerUrl}/state?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && ('user_words' in data || 'all_characters_learned' in data)) return data;
    }
  } catch (_) { /* fall through */ }
  try {
    const res = await fetch(rawUrl('state.json') + `?t=${Date.now()}`, { cache: 'no-cache' });
    if (res.ok) return await res.json();
  } catch (_) { /* fall through */ }
  showToast(state && state.user_words?.length ? 'Offline: showing your last saved words.' : 'Could not load your words.', 'error');
  return null;
}

async function fetchOrderWithFallback() {
  try {
    const res = await fetch(rawUrl('character-order.json'), { cache: 'force-cache' });
    if (res.ok) return await res.json();
  } catch (_) { /* ignore */ }
  return { order: [] };
}

function makeEmptyState() {
  return { schema_version: 4, user_words: [], all_words_learned: [], all_characters_learned: [] };
}

// =============================================================
// RENDERING
// =============================================================
function renderAll() {
  renderWords();
  renderCharacters();
}

// -------------------------------------------------------------
// WORDS TAB — user_words only
// -------------------------------------------------------------
function learnedSet() {
  return new Set(state?.all_characters_learned || []);
}

// Render a word's Japanese with each character marked learned / not.
function renderJapanese(jp, learned) {
  return Array.from(jp || '').map(ch => {
    const meta = charMeta.get(ch);
    if (!meta) return `<span class="ch other">${escapeHtml(ch)}</span>`;
    const cls = learned.has(ch) ? 'ch learned' : 'ch';
    return `<span class="${cls}" title="${escapeAttr(ch)} · ${learned.has(ch) ? 'learned' : 'not yet learned'}">${escapeHtml(ch)}</span>`;
  }).join('');
}

function renderWords() {
  if (!state) return;
  const search = ($('word-search')?.value || '').trim().toLowerCase();
  const learned = learnedSet();
  let words = (state.user_words || []).slice();

  if (search) {
    words = words.filter(w => {
      const hay = `${w.japanese || ''} ${w.reading_romaji || ''} ${w.translation || ''} ${w.notes || ''}`.toLowerCase();
      return hay.includes(search);
    });
  }
  words.sort((a, b) => new Date(b.added_at || 0) - new Date(a.added_at || 0));

  $('word-count').textContent = `${(state.user_words || []).length}`;

  const container = $('words-list');
  if (words.length === 0) {
    container.innerHTML = search
      ? '<div class="empty-state">Nothing matches that search.</div>'
      : '<div class="empty-state">No words yet. Add the first one above.</div>';
    return;
  }

  container.innerHTML = words.map(w => {
    return `
      <article class="word-card" data-jp="${escapeAttr(w.japanese)}">
        <div class="word-jp">${renderJapanese(w.japanese, learned)}</div>
        <div class="word-body">
          <div class="word-reading">${escapeHtml(w.reading_romaji || '')}</div>
          <div class="word-translation">${escapeHtml(w.translation || '')}</div>
          ${w.notes ? `<div class="word-notes">${escapeHtml(w.notes)}</div>` : ''}
        </div>
        <div class="word-side">
          <button class="btn-edit" type="button" data-edit="${escapeAttr(w.japanese)}" aria-label="Edit ${escapeAttr(w.japanese)}" title="Edit">✎</button>
        </div>
      </article>`;
  }).join('');
}

// -------------------------------------------------------------
// CHARACTERS TAB
// -------------------------------------------------------------
function cellHtml(char, sub, learned, isKanji, meaning) {
  let cls = 'tile';
  if (isKanji) cls += ' kanji';
  if (learned.has(char)) cls += ' learned';
  const title = meaning ? `${meaning} · ${sub}` : sub;
  return `<button type="button" class="${cls}" data-char="${escapeAttr(char)}" title="${escapeAttr(title)}">` +
    `<span class="ch">${char}</span>` +
    (isKanji ? '' : `<span class="ro">${sub}</span>`) +
    `</button>`;
}

function gridHtml(charset, learned) {
  return charset.map(([c, r]) => cellHtml(c, r, learned, false, null)).join('');
}

function kanjiGradeCells(grade, learned) {
  return kanjiList.filter(k => (k.grade || 'S') == grade)
    .map(k => cellHtml(k.char, k.romaji || '', learned, true, k.meaning)).join('');
}

function renderCharacters() {
  const learned = learnedSet();
  $('hiragana-grid').innerHTML = gridHtml(HIRAGANA, learned);
  $('katakana-grid').innerHTML = gridHtml(KATAKANA, learned);

  // Kanji: grades 1–6 rendered now, Secondary rendered the first time it is opened.
  $('kanji-grid').innerHTML = GRADES.map(g => {
    const items = kanjiList.filter(k => (k.grade || 'S') == g);
    if (items.length === 0) return '';
    const isS = g === 'S';
    return `
      <section class="kanji-grade${isS ? ' collapsed' : ''}" data-grade="${g}">
        <header class="kanji-grade-header" ${isS ? 'data-toggle-grade' : ''}>
          <span class="grade-kanji">${GRADE_KANJI[g]}</span>
          <h4>${GRADE_LABEL[g]}</h4>
          <span class="grade-count" data-grade-count="${g}"></span>
          ${isS ? '<span class="grade-toggle">Show</span>' : ''}
        </header>
        <div class="tile-grid kanji-grid" data-grade-grid="${g}">${isS ? '' : kanjiGradeCells(g, learned)}</div>
      </section>`;
  }).join('') || '<div class="empty-state">No kanji configured.</div>';

  updateCharCounts();
}

function toggleKanjiGrade(section) {
  const g = section.dataset.grade;
  const grid = section.querySelector('[data-grade-grid]');
  if (grid && !grid.dataset.rendered) {
    grid.innerHTML = kanjiGradeCells(g, learnedSet());
    grid.dataset.rendered = '1';
  }
  section.classList.toggle('collapsed');
  const t = section.querySelector('.grade-toggle');
  if (t) t.textContent = section.classList.contains('collapsed') ? 'Show' : 'Hide';
}

function setProgress(id, n, total) {
  const el = $(id);
  if (!el) return;
  el.querySelector('.count').textContent = `${n} / ${total}`;
  el.querySelector('.bar > i').style.transform = `scaleX(${total ? n / total : 0})`;
}

function updateCharCounts() {
  const learned = learnedSet();
  setProgress('hiragana-progress', HIRAGANA.filter(([c]) => learned.has(c)).length, HIRAGANA.length);
  setProgress('katakana-progress', KATAKANA.filter(([c]) => learned.has(c)).length, KATAKANA.length);
  setProgress('kanji-progress', kanjiList.filter(k => learned.has(k.char)).length, kanjiList.length);
  document.querySelectorAll('[data-grade-count]').forEach(el => {
    const g = el.dataset.gradeCount;
    const items = kanjiList.filter(k => (k.grade || 'S') == g);
    el.textContent = `${items.filter(k => learned.has(k.char)).length} / ${items.length}`;
  });
  const total = HIRAGANA.length + KATAKANA.length + kanjiList.length;
  const n = learned.size;
  const hero = $('learned-total');
  if (hero) hero.textContent = `${n} of ${total} characters learned`;
}

// =============================================================
// WORD ACTIONS — talk to the Worker
// =============================================================
async function workerCall(path, method, body, attempt = 1) {
  if (CONFIG.readOnly) {
    await new Promise(r => setTimeout(r, 250));
    return { ok: true, word: body && { ...body, added_at: new Date().toISOString(), source: 'user' } };
  }
  let res, data;
  try {
    res = await fetch(`${CONFIG.workerUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    data = await res.json().catch(() => ({}));
  } catch (_) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 600 * attempt)); return workerCall(path, method, body, attempt + 1); }
    throw new Error('No connection. Check your network and try again.');
  }
  if (!res.ok) {
    // 4xx = our mistake (duplicate, not found): report it. 5xx = GitHub hiccup: retry.
    if (res.status >= 500 && attempt < 3) { await new Promise(r => setTimeout(r, 600 * attempt)); return workerCall(path, method, body, attempt + 1); }
    throw new Error(data.error || `Save failed (${res.status})`);
  }
  return data;
}

// Prevent double submits: while one save runs, further clicks are ignored.
let _wordBusy = false;
async function guarded(buttonIds, fn) {
  if (_wordBusy) return;
  _wordBusy = true;
  const btns = buttonIds.map(id => $(id)).filter(Boolean);
  btns.forEach(b => { b.disabled = true; b.classList.add('busy'); });
  try { await fn(); }
  finally { _wordBusy = false; btns.forEach(b => { b.disabled = false; b.classList.remove('busy'); }); }
}

async function addUserWord() {
  const jp = $('add-jp').value.trim();
  const ro = $('add-romaji').value.trim();
  const tr = $('add-translation').value.trim();
  const notes = $('add-notes').value.trim();
  if (!jp) { showToast('Japanese is required', 'error'); $('add-jp').focus(); return; }
  if ((state?.user_words || []).some(w => w.japanese === jp)) { showToast('That word is already in your list', 'error'); return; }
  await guarded(['add-btn'], async () => {
    const result = await workerCall('/add-word', 'POST', { japanese: jp, reading_romaji: ro, translation: tr, notes });
    const word = result?.word || { japanese: jp, reading_romaji: ro, translation: tr, notes, added_at: new Date().toISOString(), source: 'user' };
    ['add-jp', 'add-romaji', 'add-translation', 'add-notes'].forEach(id => { $(id).value = ''; });
    state.user_words = state.user_words || [];
    state.user_words.push(word);
    state.all_words_learned = state.all_words_learned || [];
    state.all_words_learned.push({ ...word, week_number: 1, character: null, delivered_at: word.added_at, source: 'user' });
    writeCachedState(state);
    renderWords();
    showToast(`Added ${jp}`, 'success');
    $('add-jp').focus();
  }).catch(err => showToast(err.message, 'error'));
}

function openEdit(japanese) {
  const word = state?.user_words?.find(w => w.japanese === japanese);
  if (!word) return showToast('Word not found', 'error');
  currentEditWord = word;
  $('edit-jp').value = word.japanese;
  $('edit-romaji').value = word.reading_romaji || '';
  $('edit-translation').value = word.translation || '';
  $('edit-notes').value = word.notes || '';
  $('edit-modal').classList.add('show');
  setTimeout(() => $('edit-romaji').focus(), 30);
}

function closeModal() {
  $('edit-modal').classList.remove('show');
  currentEditWord = null;
}

async function saveEdit() {
  if (!currentEditWord) return;
  const targetJp = currentEditWord.japanese;
  const updates = {
    japanese: $('edit-jp').value.trim() || targetJp,
    reading_romaji: $('edit-romaji').value.trim(),
    translation: $('edit-translation').value.trim(),
    notes: $('edit-notes').value.trim(),
  };
  if (updates.japanese !== targetJp && (state.user_words || []).some(w => w.japanese === updates.japanese)) {
    showToast('Another word already uses that Japanese', 'error');
    return;
  }
  await guarded(['edit-save', 'edit-delete'], async () => {
    await workerCall('/update-word', 'POST', { japanese: targetJp, updates });
    const apply = (w) => { if (w?.japanese === targetJp) Object.assign(w, updates, { updated_at: new Date().toISOString() }); };
    (state.user_words || []).forEach(apply);
    (state.all_words_learned || []).forEach(apply);
    writeCachedState(state);
    closeModal();
    renderWords();
    showToast('Saved', 'success');
  }).catch(err => showToast(err.message, 'error'));
}

async function deleteCurrentWord() {
  if (!currentEditWord) return;
  const targetJp = currentEditWord.japanese;
  if (!confirm(`Delete "${targetJp}"? This cannot be undone.`)) return;
  await guarded(['edit-save', 'edit-delete'], async () => {
    await workerCall('/delete-word', 'POST', { japanese: targetJp });
    state.user_words = (state.user_words || []).filter(w => w.japanese !== targetJp);
    state.all_words_learned = (state.all_words_learned || []).filter(w => !(w.japanese === targetJp && w.source === 'user'));
    writeCachedState(state);
    closeModal();
    renderWords();
    showToast('Deleted', 'success');
  }).catch(err => showToast(err.message, 'error'));
}

// =============================================================
// MARK CHARACTER LEARNED — instant UI, debounced background save
// =============================================================
let _saveTimer = null;
let _savePromise = null;

function scheduleCharSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(runCharSave, 500);
}

async function runCharSave() {
  _saveTimer = null;
  if (_savePromise) { try { await _savePromise; } catch (_) {} }
  const localLearned = [...(state.all_characters_learned || [])];
  _savePromise = (async () => {
    try {
      if (CONFIG.readOnly) return;
      // The Worker merges this into the newest state on GitHub, so a word
      // edit happening at the same time is never overwritten.
      await workerCall('/set-characters', 'POST', { all_characters_learned: localLearned });
      writeCachedState({ ...state, all_characters_learned: localLearned });
      setSaveIndicator('saved');
    } catch (err) {
      setSaveIndicator('error');
      showToast('Save failed: ' + (err.message || 'unknown error'), 'error');
      throw err;
    }
  })();
  setSaveIndicator('saving');
  try { await _savePromise; } catch (_) {} finally { _savePromise = null; }
}

function setSaveIndicator(status) {
  const el = $('save-indicator');
  if (!el) return;
  el.dataset.status = status;
  el.textContent = status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Not saved';
  if (status === 'saved') setTimeout(() => { if (el.dataset.status === 'saved') el.dataset.status = ''; }, 1800);
}

function setCharLearned(char, isLearned) {
  if (!state) return;
  state.all_characters_learned = state.all_characters_learned || [];
  const idx = state.all_characters_learned.indexOf(char);
  if (isLearned && idx === -1) state.all_characters_learned.push(char);
  if (!isLearned && idx !== -1) state.all_characters_learned.splice(idx, 1);
  // Patch the DOM in place: no re-render of the grids.
  document.querySelectorAll(`.tile[data-char="${cssEscape(char)}"]`).forEach(t => t.classList.toggle('learned', isLearned));
  document.querySelectorAll(`.word-jp .ch`).forEach(s => { if (s.textContent === char) s.classList.toggle('learned', isLearned); });
  updateCharCounts();
  scheduleCharSave();
}

function cssEscape(s) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(s);
  return String(s).replace(/["\\\n\r\t]/g, m => '\\' + m);
}

// =============================================================
// CHARACTER DETAIL — a real 3D tile that rises and flips.
// Every animated property is transform / opacity, so open and close
// stay on the compositor and never trigger layout.
// =============================================================
const detail = {
  layer: null, root: null, box: null, front: null, back: null,
  cell: null, char: null, size: 0, busy: false, timer: null,
};

function wordsContaining(char) {
  return (state?.user_words || []).filter(w => w?.japanese && w.japanese.includes(char));
}

function buildBackFace(char) {
  const meta = charMeta.get(char) || { romaji: '', script: detectScript(char), meaning: null };
  const learned = learnedSet();
  const isLearned = learned.has(char);
  const words = wordsContaining(char);
  const list = words.length
    ? words.map(w => `
        <li>
          <span class="ex-jp">${renderJapanese(w.japanese, learned)}</span>
          <span class="ex-meta"><span class="ex-ro">${escapeHtml(w.reading_romaji || '')}</span><span class="ex-tr">${escapeHtml(w.translation || '')}</span></span>
        </li>`).join('')
    : '<li class="empty">None of your words use this character yet.</li>';

  return `
    <button class="close-x" type="button" aria-label="Close" data-close>×</button>
    <div class="detail-head">
      <div class="detail-char ${meta.script}">${escapeHtml(char)}</div>
      <div class="detail-info">
        <div class="detail-reading">${escapeHtml(meta.romaji || '')}</div>
        ${meta.meaning ? `<div class="detail-meaning">${escapeHtml(meta.meaning)}</div>` : ''}
        <div class="detail-script">${meta.script}${meta.grade ? ` · ${GRADE_LABEL[meta.grade] || meta.grade}` : ''}</div>
      </div>
    </div>
    <button type="button" class="learn-toggle${isLearned ? ' on' : ''}" data-learn-toggle aria-pressed="${isLearned}">
      <span class="knob"></span>
      <span class="label-off">Not yet learned</span>
      <span class="label-on">Learned</span>
    </button>
    <h4>In your words <span>${words.length}</span></h4>
    <ul class="examples">${list}</ul>`;
}

function openCharDetail(cell) {
  if (detail.busy) return;
  const char = cell.dataset.char;
  const meta = charMeta.get(char);
  const isLearned = learnedSet().has(char);

  // Size: a square that fits the viewport.
  const S = Math.round(Math.min(480, window.innerWidth * 0.92, window.innerHeight * 0.82));
  detail.size = S;
  detail.root.style.setProperty('--s', S + 'px');

  detail.front.className = `face front ${meta?.script || ''}${isLearned ? ' learned' : ''}`;
  detail.front.innerHTML = `<span class="ch">${escapeHtml(char)}</span>`;
  detail.back.className = `face back${isLearned ? ' learned' : ''}`;
  detail.back.innerHTML = buildBackFace(char);
  detail.back.scrollTop = 0;

  // FLIP: start where the tile is, end centered.
  const r = cell.getBoundingClientRect();
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const dx = (r.left + r.width / 2) - cx;
  const dy = (r.top + r.height / 2) - cy;
  const k = r.width / S;

  detail.cell = cell;
  detail.char = char;
  cell.classList.add('ghost');

  const { root, layer } = detail;
  layer.classList.remove('closing', 'open');
  root.style.transition = 'none';
  root.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`;
  layer.hidden = false;
  document.body.classList.add('detail-open');
  void root.offsetWidth; // commit the start position

  detail.busy = true;
  requestAnimationFrame(() => {
    root.style.transition = '';
    root.style.transform = 'translate(0, 0) scale(1)';
    layer.classList.add('open');
    clearTimeout(detail.timer);
    detail.timer = setTimeout(() => { detail.busy = false; }, 520);
  });
}

function closeCharDetail() {
  const { root, layer } = detail;
  if (layer.hidden || layer.classList.contains('closing')) return;
  const cell = detail.cell;
  detail.busy = true;
  layer.classList.add('closing');
  if (cell) {
    const r = cell.getBoundingClientRect();
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const dx = (r.left + r.width / 2) - cx;
    const dy = (r.top + r.height / 2) - cy;
    root.style.transform = `translate(${dx}px, ${dy}px) scale(${r.width / detail.size})`;
  } else {
    root.style.transform = 'scale(0.6)';
  }
  clearTimeout(detail.timer);
  detail.timer = setTimeout(() => {
    layer.classList.remove('open', 'closing');
    layer.hidden = true;
    document.body.classList.remove('detail-open');
    if (cell) cell.classList.remove('ghost');
    detail.cell = null;
    detail.char = null;
    detail.busy = false;
  }, 460);
}

function toggleDetailLearned() {
  if (!detail.char) return;
  const now = !learnedSet().has(detail.char);
  setCharLearned(detail.char, now);
  // The open card just changes colour: no reload, no re-render.
  detail.front.classList.toggle('learned', now);
  detail.back.classList.toggle('learned', now);
  const btn = detail.back.querySelector('[data-learn-toggle]');
  if (btn) { btn.classList.toggle('on', now); btn.setAttribute('aria-pressed', String(now)); }
}

// =============================================================
// UTILITIES
// =============================================================
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
function escapeAttr(str) { return escapeHtml(str); }

let toastTimer = null;
function showToast(msg, type = '') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 2400);
}

function detectScript(c) {
  if (!c) return 'unknown';
  const cp = c.codePointAt(0);
  if (cp >= 0x3040 && cp <= 0x309F) return 'hiragana';
  if (cp >= 0x30A0 && cp <= 0x30FF) return 'katakana';
  if (cp >= 0x4E00 && cp <= 0x9FFF) return 'kanji';
  return 'unknown';
}

// =============================================================
// ATMOSPHERE — light parallax on pointer move (transform only)
// =============================================================
function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const scene = document.querySelector('.scene');
  if (!scene) return;
  let tx = 0, ty = 0, raf = null;
  window.addEventListener('pointermove', (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(() => {
      raf = null;
      scene.style.setProperty('--mx', tx.toFixed(3));
      scene.style.setProperty('--my', ty.toFixed(3));
    });
  }, { passive: true });
}

// =============================================================
// WIRING
// =============================================================
function initUI() {
  detail.layer = $('char-detail-layer');
  detail.root = $('char-detail');
  detail.box = detail.root.querySelector('.box');
  detail.front = detail.root.querySelector('.face.front');
  detail.back = detail.root.querySelector('.face.back');

  // Tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
      document.querySelectorAll('.panel').forEach(p => { p.classList.toggle('active', p.dataset.panel === btn.dataset.tab); });
      try { localStorage.setItem('neosai.tab', btn.dataset.tab); } catch (_) {}
    });
  });
  try {
    const saved = localStorage.getItem('neosai.tab');
    const btn = saved && document.querySelector(`.tab[data-tab="${saved}"]`);
    if (btn) btn.click();
  } catch (_) {}

  // Words
  const addCard = $('add-card'), addToggle = $('add-toggle');
  const setAddOpen = (open) => {
    addCard.hidden = !open;
    addToggle.setAttribute('aria-expanded', String(open));
    addToggle.querySelector('.label').textContent = open ? 'Close' : 'Add word';
    addToggle.setAttribute('aria-label', open ? 'Close' : 'Add word');
    if (open) setTimeout(() => $('add-jp').focus(), 30);
  };
  addToggle.addEventListener('click', () => setAddOpen(addCard.hidden));
  $('add-cancel').addEventListener('click', () => setAddOpen(false));
  $('add-btn').addEventListener('click', addUserWord);
  ['add-jp', 'add-romaji', 'add-translation'].forEach(id => {
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addUserWord(); } });
  });
  $('word-search').addEventListener('input', renderWords);
  $('words-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-edit]');
    if (b) openEdit(b.dataset.edit);
  });
  $('edit-save').addEventListener('click', saveEdit);
  $('edit-cancel').addEventListener('click', closeModal);
  $('edit-delete').addEventListener('click', deleteCurrentWord);
  $('edit-modal').addEventListener('click', (e) => { if (e.target.id === 'edit-modal') closeModal(); });

  // Characters: one delegated listener per panel
  document.querySelector('.panel[data-panel="characters"]').addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    if (tile) { openCharDetail(tile); return; }
    const header = e.target.closest('[data-toggle-grade]');
    if (header) toggleKanjiGrade(header.closest('.kanji-grade'));
  });

  // Detail box
  detail.layer.addEventListener('click', (e) => {
    if (e.target.closest('[data-learn-toggle]')) { toggleDetailLearned(); return; }
    if (e.target.closest('[data-close]')) { closeCharDetail(); return; }
    if (!e.target.closest('.face.back')) closeCharDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('edit-modal').classList.contains('show')) closeModal();
      else closeCharDetail();
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (_savePromise || _saveTimer) {
      e.preventDefault();
      e.returnValue = 'A save is still in progress.';
      return e.returnValue;
    }
  });

  if (CONFIG.readOnly) {
    const tag = document.createElement('div');
    tag.className = 'readonly-tag';
    tag.textContent = 'preview · nothing is saved';
    document.body.appendChild(tag);
  }

  initParallax();
}

initUI();
loadData();
