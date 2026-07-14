// Neosai dashboard — v3
// Tabs: Words / Characters / Daily
// Words = manually-added words + Week 1 routine words (view-only)
// Characters = manually toggled learned/not, with fast tile-flip animation
// Daily = chronological funword deliveries from the 3x/week Tue/Fri/Sun routines

const CONFIG = {
repo: 'Arcane-Designer/neosai-data',
branch: 'main',
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

// =============================================================
// LOADING
// =============================================================

function rawUrl(file) {
return `https://raw.githubusercontent.com/${CONFIG.repo}/${CONFIG.branch}/${file}`;
}

async function loadData() {
document.getElementById('loading').style.display = 'block';
document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
state = await fetchStateWithFallback();
characterOrder = await fetchOrderWithFallback();
document.getElementById('loading').style.display = 'none';
document.querySelectorAll('.panel').forEach(p => {
if (p.classList.contains('active')) p.style.display = 'block';
});
renderAll();
}

async function fetchStateWithFallback() {
try {
const res = await fetch(`${CONFIG.workerUrl}/state?t=${Date.now()}`, { cache: 'no-store' });
if (res.ok) {
const data = await res.json();
if (data && typeof data === 'object' && ('current_week_number' in data || 'user_words' in data)) return data;
}
} catch (_) { /* fall through */ }
try {
const res = await fetch(rawUrl('state.json') + `?t=${Date.now()}`, { cache: 'no-cache' });
if (res.ok) return await res.json();
} catch (_) { /* fall through */ }
showToast('Could not load state. Showing empty defaults.', 'error');
return makeEmptyState();
}

async function fetchOrderWithFallback() {
try {
const res = await fetch(rawUrl('character-order.json') + `?t=${Date.now()}`, { cache: 'no-cache' });
if (res.ok) return await res.json();
} catch (_) { /* ignore */ }
return { order: [] };
}

function makeEmptyState() {
return {
schema_version: 3,
current_week_number: 1,
current_character: null,
current_week_words: [],
delivery_log: [],
all_words_learned: [],
all_characters_learned: [],
user_words: [],
daily_words: [],
};
}

// =============================================================
// RENDERING
// =============================================================

function renderAll() {
renderWords();
renderCharacters();
renderDaily();
}

// -------------------------------------------------------------
// WORDS TAB — user_words + week 1 routine words in one list
// -------------------------------------------------------------
function renderWords() {
if (!state) return;
const search = (document.getElementById('word-search')?.value || '').toLowerCase();
const filter = document.getElementById('word-filter')?.value || 'all';

const userWords = (state.user_words || []).map(w => ({ ...w, source: 'user' }));
// Week 1 routine words: pull from all_words_learned where source=routine AND week_number=1
const week1Routine = (state.all_words_learned || [])
.filter(w => w.source === 'routine' && (w.week_number === 1 || w.week_number === '1'))
.map(w => ({ ...w, source: 'routine' }));

let combined = [];
if (filter === 'user') combined = userWords;
else if (filter === 'week1') combined = week1Routine;
else combined = [...userWords, ...week1Routine];

if (search) {
combined = combined.filter(w => {
const hay = `${w.japanese || ''} ${w.reading_romaji || ''} ${w.translation || w.english || ''} ${w.notes || ''}`.toLowerCase();
return hay.includes(search);
});
}

// Sort: user words newest-first by added_at, then week-1 routine words (by delivered_at)
combined.sort((a, b) => {
const ta = new Date(a.added_at || a.delivered_at || 0).getTime();
const tb = new Date(b.added_at || b.delivered_at || 0).getTime();
return tb - ta;
});

const container = document.getElementById('words-list');
if (!container) return;
if (combined.length === 0) {
container.innerHTML = '<div class="empty-state" style="padding:32px;">No words yet. Add one above.</div>';
return;
}

container.innerHTML = combined.map(w => {
const isUser = w.source === 'user';
const slotText = isUser ? 'Mine' : (w.is_funword ? 'Wk 1 ★' : 'Wk 1');
const classes = ['word-row'];
if (w.is_funword) classes.push('is-funword');
if (isUser) classes.push('is-user');
else classes.push('is-week1');
const actions = isUser
? `<button class="btn-mini" onclick="openEdit('${escapeAttr(w.japanese)}')">Edit</button>`
: '';
return `
<div class="${classes.join(' ')}">
<div class="slot-label">${slotText}</div>
<div class="word-jp">${escapeHtml(w.japanese)}<span class="reading">${escapeHtml(w.reading_romaji || '')}</span></div>
<div class="word-translation">
${escapeHtml(w.translation || w.english || '')}
${w.notes ? `<span class="word-notes">${escapeHtml(w.notes)}</span>` : ''}
</div>
<div class="word-actions">${actions}</div>
${renderExample(w)}
</div>
`;
}).join('');
}

// -------------------------------------------------------------
// CHARACTERS TAB
// -------------------------------------------------------------
function renderCharacters() {
const learned = new Set(state?.all_characters_learned || []);

const hiraganaHtml = renderHiraganaKatakanaGrid(HIRAGANA, learned);
const katakanaHtml = renderHiraganaKatakanaGrid(KATAKANA, learned);

const kanjiList = (characterOrder?.order || []).filter(c => c.script === 'kanji');
const gradesOrder = [1, 2, 3, 4, 5, 6, 'S'];
const gradeLabel = {1: 'Grade 1', 2: 'Grade 2', 3: 'Grade 3', 4: 'Grade 4', 5: 'Grade 5', 6: 'Grade 6', 'S': 'Secondary'};
const byGrade = {};
for (const g of gradesOrder) byGrade[g] = [];
for (const k of kanjiList) {
const g = k.grade || 'S';
if (byGrade[g]) byGrade[g].push(k);
else byGrade['S'].push(k);
}
const kanjiHtml = gradesOrder.map(g => {
const items = byGrade[g];
if (!items || items.length === 0) return '';
const isSecondary = g === 'S';
const gCount = items.filter(k => learned.has(k.char)).length;
const cellsHtml = items.map(c => renderCell(c.char, c.romaji, learned, true, c.meaning)).join('');
return `
<div class="kanji-grade kanji-grade-${g}${isSecondary ? ' collapsed' : ''}" data-grade="${g}">
<div class="kanji-grade-header" ${isSecondary ? `onclick="toggleKanjiGrade('${g}')"` : ''}>
<h4>${gradeLabel[g]}</h4>
<span class="kanji-grade-count">${gCount} / ${items.length}</span>
${isSecondary ? '<span class="kanji-grade-toggle">Show ▾</span>' : ''}
</div>
<div class="char-grid kanji kanji-grade-grid">${cellsHtml}</div>
</div>
`;
}).join('');

document.getElementById('hiragana-grid').innerHTML = hiraganaHtml;
document.getElementById('katakana-grid').innerHTML = katakanaHtml;
document.getElementById('kanji-grid').innerHTML = kanjiHtml || '<div class="empty-state" style="grid-column:1/-1;">No kanji configured.</div>';

const hCount = HIRAGANA.filter(([c]) => learned.has(c)).length;
const kCount = KATAKANA.filter(([c]) => learned.has(c)).length;
const jCount = kanjiList.filter(c => learned.has(c.char)).length;
document.getElementById('hiragana-count').textContent = `${hCount} / ${HIRAGANA.length}`;
document.getElementById('katakana-count').textContent = `${kCount} / ${KATAKANA.length}`;
document.getElementById('kanji-count').textContent = `${jCount} / ${kanjiList.length}`;
}

function renderCell(char, romaji, learned, isKanji, meaning) {
let cls = 'char-cell';
if (isKanji) cls += ' kanji-cell';
if (learned.has(char)) cls += ' learned';
const script = isKanji ? 'kanji' : detectScript(char);
const meaningAttr = meaning ? ` data-meaning="${escapeAttr(meaning)}"` : '';
return `<div class="${cls}" title="${escapeAttr(meaning || romaji)}" data-char="${escapeAttr(char)}" data-romaji="${escapeAttr(romaji)}" data-script="${script}"${meaningAttr} onclick="openCharDetail(this)">
<div class="char">${char}</div>
<div class="romaji">${romaji}</div>
</div>`;
}

function renderHiraganaKatakanaGrid(charset, learned) {
return charset.map(([char, romaji]) => renderCell(char, romaji, learned, false, null)).join('');
}

function toggleKanjiGrade(grade) {
const el = document.querySelector(`.kanji-grade[data-grade="${grade}"]`);
if (!el) return;
el.classList.toggle('collapsed');
const toggle = el.querySelector('.kanji-grade-toggle');
if (toggle) toggle.textContent = el.classList.contains('collapsed') ? 'Show ▾' : 'Hide ▴';
}

// -------------------------------------------------------------
// DAILY TAB
// -------------------------------------------------------------
function renderDaily() {
const container = document.getElementById('daily-list');
if (!container) return;
const daily = (state?.daily_words || []).slice();
// Sort newest-first
daily.sort((a, b) => {
const ta = new Date(a.delivered_at || 0).getTime();
const tb = new Date(b.delivered_at || 0).getTime();
return tb - ta;
});
if (daily.length === 0) {
container.innerHTML = '<div class="empty-state" style="padding:60px 20px;">No daily words yet. First one arrives Tuesday at 10 AM.</div>';
return;
}
container.innerHTML = daily.map(w => `
<div class="daily-row">
<div class="daily-jp">${escapeHtml(w.japanese || '')}<span class="reading">${escapeHtml(w.reading_romaji || '')}</span></div>
<div class="daily-translation">${escapeHtml(w.translation || w.english || '')}</div>
<div class="daily-week">Week ${w.week_number ?? '?'}</div>
</div>
`).join('');
}

// =============================================================
// USER ACTIONS (Words tab) — talk to Worker endpoints
// =============================================================

async function workerCall(path, method, body) {
const url = `${CONFIG.workerUrl}${path}`;
const init = { method, headers: { 'Content-Type': 'application/json' } };
if (body !== undefined) init.body = JSON.stringify(body);
const res = await fetch(url, init);
const data = await res.json().catch(() => ({}));
if (!res.ok) throw new Error(data.error || `Worker error ${res.status}`);
return data;
}

async function addUserWord() {
const jp = document.getElementById('add-jp').value.trim();
const ro = document.getElementById('add-romaji').value.trim();
const tr = document.getElementById('add-translation').value.trim();
const notes = document.getElementById('add-notes').value.trim();
if (!jp) { showToast('Japanese field is required', 'error'); return; }
const btn = document.getElementById('add-btn');
btn.disabled = true;
btn.textContent = 'Saving…';
try {
const result = await workerCall('/add-word', 'POST', { japanese: jp, reading_romaji: ro, translation: tr, notes });
document.getElementById('add-jp').value = '';
document.getElementById('add-romaji').value = '';
document.getElementById('add-translation').value = '';
document.getElementById('add-notes').value = '';
showToast('Word added', 'success');
if (result?.word && state) {
state.user_words = state.user_words || [];
state.user_words.push(result.word);
state.all_words_learned = state.all_words_learned || [];
state.all_words_learned.push({
...result.word,
week_number: state.current_week_number || 1,
character: null,
delivered_at: result.word.added_at,
source: 'user',
});
renderAll();
} else {
await loadData();
}
} catch (err) {
showToast(err.message, 'error');
} finally {
btn.disabled = false;
btn.textContent = '+ Add word';
}
}

function openEdit(japanese) {
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
const targetJp = currentEditWord.japanese;
try {
await workerCall('/update-word', 'POST', { japanese: targetJp, updates });
showToast('Saved', 'success');
closeModal();
if (state) {
const applyUpdates = (w) => { if (w?.japanese === targetJp) Object.assign(w, updates); };
(state.user_words || []).forEach(applyUpdates);
(state.all_words_learned || []).forEach(applyUpdates);
renderAll();
}
} catch (err) {
showToast(err.message, 'error');
}
}

async function deleteCurrentWord() {
if (!currentEditWord) return;
if (!confirm(`Delete "${currentEditWord.japanese}"? This cannot be undone.`)) return;
const targetJp = currentEditWord.japanese;
try {
await workerCall('/delete-word', 'POST', { japanese: targetJp });
showToast('Deleted', 'success');
closeModal();
if (state) {
state.user_words = (state.user_words || []).filter(w => w.japanese !== targetJp);
state.all_words_learned = (state.all_words_learned || []).filter(w => !(w.japanese === targetJp && w.source === 'user'));
renderAll();
}
} catch (err) {
showToast(err.message, 'error');
}
}

// =============================================================
// MARK CHARACTER LEARNED — optimistic UI + debounced background save
// =============================================================

let _saveTimer = null;
let _savePromise = null;
let _saveError = false;

function scheduleCharSave() {
if (_saveTimer) clearTimeout(_saveTimer);
_saveTimer = setTimeout(runCharSave, 400); // debounce burst-clicks
}

async function runCharSave() {
_saveTimer = null;
// If a previous save is still in flight, wait for it to finish before starting another
if (_savePromise) {
try { await _savePromise; } catch (_) {}
}
const localLearned = [...(state.all_characters_learned || [])];
_savePromise = (async () => {
try {
// Merge-safe: pull latest server state, patch only the field we own, PUT back.
const fresh = await fetchStateWithFallback();
const next = { ...fresh, all_characters_learned: localLearned };
await workerCall('/state', 'PUT', next);
_saveError = false;
} catch (err) {
_saveError = true;
showToast('Save failed: ' + (err.message || 'unknown error'), 'error');
throw err;
}
})();
try { await _savePromise; } finally { _savePromise = null; }
}

function toggleCharacterLearnedLocal(char) {
if (!state) return;
state.all_characters_learned = state.all_characters_learned || [];
const idx = state.all_characters_learned.indexOf(char);
const wasLearned = idx !== -1;
if (wasLearned) state.all_characters_learned.splice(idx, 1);
else state.all_characters_learned.push(char);
// Update the specific cell in-place without a full re-render (faster + no flicker)
updateCellVisual(char, !wasLearned);
// Also update Characters counts
updateCharCounts();
scheduleCharSave();
return !wasLearned;
}

function updateCellVisual(char, isLearned) {
document.querySelectorAll(`.char-cell[data-char="${cssEscape(char)}"]`).forEach(cell => {
if (isLearned) cell.classList.add('learned');
else cell.classList.remove('learned');
});
// Also update the modal front-face if open
const front = document.getElementById('char-detail-front');
if (front && _activeCharCell && _activeCharCell.dataset.char === char) {
if (isLearned) front.classList.add('learned');
else front.classList.remove('learned');
}
}

function updateCharCounts() {
const learned = new Set(state.all_characters_learned || []);
const hCount = HIRAGANA.filter(([c]) => learned.has(c)).length;
const kCount = KATAKANA.filter(([c]) => learned.has(c)).length;
const kanjiList = (characterOrder?.order || []).filter(c => c.script === 'kanji');
const jCount = kanjiList.filter(c => learned.has(c.char)).length;
const h = document.getElementById('hiragana-count');
const k = document.getElementById('katakana-count');
const j = document.getElementById('kanji-count');
if (h) h.textContent = `${hCount} / ${HIRAGANA.length}`;
if (k) k.textContent = `${kCount} / ${KATAKANA.length}`;
if (j) j.textContent = `${jCount} / ${kanjiList.length}`;
// Update kanji grade counts too
document.querySelectorAll('.kanji-grade').forEach(gradeEl => {
const g = gradeEl.dataset.grade;
const items = kanjiList.filter(c => (c.grade || 'S') == g || (g === 'S' && !c.grade));
const count = items.filter(c => learned.has(c.char)).length;
const el = gradeEl.querySelector('.kanji-grade-count');
if (el) el.textContent = `${count} / ${items.length}`;
});
}

// Simple CSS.escape polyfill for old browsers
function cssEscape(s) {
if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(s);
return String(s).replace(/["\\\n\r\t]/g, m => '\\' + m);
}

// Called from the tile-flip modal's toggle button. Instant local update + close.
function toggleCharacterLearned(charAttr) {
const char = charAttr.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
const nowLearned = toggleCharacterLearnedLocal(char);
// Update button label immediately in the modal
const btn = document.querySelector('.toggle-learned-btn');
if (btn) {
btn.textContent = nowLearned ? 'Learned ✓' : 'Not yet learned';
btn.classList.toggle('learned', nowLearned);
}
// Close modal instantly (the fast animation)
closeCharDetail();
}

// =============================================================
// UTILITIES
// =============================================================

function escapeHtml(str) {
if (str == null) return '';
return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
}
function escapeAttr(str) { return escapeHtml(str).replace(/'/g, "&apos;"); }

function renderExample(w) {
if (!w) return '';
const jp = w.example_jp || w.example_japanese || '';
const en = w.example_en || w.example_english || w.example_translation || '';
if (!jp && !en) return '';
return `
<div class="word-example">
${jp ? `<div class="ex-jp">${escapeHtml(jp)}</div>` : ''}
${en ? `<div class="ex-en">${escapeHtml(en)}</div>` : ''}
</div>
`;
}

let toastTimer = null;
function showToast(msg, type = '') {
const el = document.getElementById('toast');
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
// CHARACTER DETAIL MODAL — faster flip animation
// =============================================================

let _activeCharCell = null;
let _closeTimeoutId = null;

// Collect all words (user + daily + week 1 routine) that contain a character
function wordsContaining(char) {
const src = [
...(state?.user_words || []),
...(state?.daily_words || []),
...((state?.all_words_learned || []).filter(w => w.source === 'routine' && (w.week_number === 1 || w.week_number === '1'))),
];
const seen = new Set();
const out = [];
for (const w of src) {
if (!w?.japanese) continue;
if (!w.japanese.includes(char)) continue;
if (seen.has(w.japanese)) continue;
seen.add(w.japanese);
out.push(w);
}
return out;
}

function openCharDetail(cellEl) {
if (_closeTimeoutId) {
clearTimeout(_closeTimeoutId);
_closeTimeoutId = null;
if (_activeCharCell) _activeCharCell.style.visibility = '';
_activeCharCell = null;
const m = document.getElementById('char-detail-modal');
m.classList.remove('open', 'closing');
}
const char = cellEl.dataset.char;
const romaji = cellEl.dataset.romaji;
const script = cellEl.dataset.script;
const meaning = cellEl.dataset.meaning || null;

const learned = new Set(state?.all_characters_learned || []);
const isLearned = learned.has(char);
const status = isLearned ? 'learned' : 'not-yet';
const statusLabel = isLearned ? 'Learned' : 'Not yet learned';

const examples = wordsContaining(char);
const examplesHtml = examples.length
? examples.map(w => `
<li>
<span class="ex-jp">${escapeHtml(w.japanese)}</span>
<span class="ex-reading">${escapeHtml(w.reading_romaji || '')}</span>
<span class="ex-trans">${escapeHtml(w.translation || w.english || '')}</span>
</li>
`).join('')
: '<li class="empty">Add a word containing this character in the Words tab and it\'ll show up here.</li>';

const meaningHtml = meaning ? `<div class="meaning">${escapeHtml(meaning)}</div>` : '';
const isKanji = script === 'kanji';

const card = document.getElementById('char-detail-card');
const toggleLabel = isLearned ? 'Learned ✓' : 'Mark as learned';
const btnCls = isLearned ? 'btn-secondary toggle-learned-btn learned' : 'btn-secondary toggle-learned-btn';
const charAttr = escapeAttr(char);
card.innerHTML = `
<button class="close-x" aria-label="Close" onclick="closeCharDetail()">×</button>
<div class="status-pill ${status}">${statusLabel}</div>
<div class="big-char ${isKanji ? 'kanji' : ''}">${escapeHtml(char)}</div>
<div class="big-romaji">${escapeHtml(romaji)}</div>
<div class="script-tag">${script}</div>
${meaningHtml}
<div class="char-actions">
<button class="${btnCls}" onclick="toggleCharacterLearned('${charAttr}')">${toggleLabel}</button>
</div>
<h4>Words with this character</h4>
<ul class="examples">${examplesHtml}</ul>
`;

const front = document.getElementById('char-detail-front');
let frontCls = 'char-detail-front';
if (isLearned) frontCls += ' learned';
front.className = frontCls;
front.innerHTML = `<div class="char">${escapeHtml(char)}</div>`;

const rect = cellEl.getBoundingClientRect();
const tile = document.getElementById('char-detail-tile');
const modal = document.getElementById('char-detail-modal');

cellEl.style.visibility = 'hidden';
_activeCharCell = cellEl;

tile.style.transition = 'none';
tile.style.width = rect.width + 'px';
tile.style.height = rect.height + 'px';
tile.style.transform = `translate(${rect.left}px, ${rect.top}px)`;

modal.classList.remove('closing');
modal.setAttribute('aria-hidden', 'false');
document.body.style.overflow = 'hidden';

void tile.offsetWidth;

requestAnimationFrame(() => {
const targetW = Math.min(420, window.innerWidth * 0.92);
const targetH = Math.min(540, window.innerHeight * 0.85);
const targetX = (window.innerWidth - targetW) / 2;
const targetY = (window.innerHeight - targetH) / 2;
// Faster: 0.36s total (down from 1.1s)
const ease = 'cubic-bezier(0.4, 0.15, 0.3, 1)';
tile.style.transition = `width 0.36s ${ease}, height 0.36s ${ease}, transform 0.36s ${ease}`;
tile.style.width = targetW + 'px';
tile.style.height = targetH + 'px';
tile.style.transform = `translate(${targetX}px, ${targetY}px)`;
modal.classList.add('open');
});
}

function closeCharDetail() {
const modal = document.getElementById('char-detail-modal');
if (!modal.classList.contains('open')) return;
if (modal.classList.contains('closing')) return;

const tile = document.getElementById('char-detail-tile');
const cellEl = _activeCharCell;
if (!cellEl) {
modal.classList.remove('open');
document.body.style.overflow = '';
return;
}

modal.classList.add('closing');
const rect = cellEl.getBoundingClientRect();

// Faster close: 0.3s shrink after a brief 0.14s delay so the rotation reads
const ease = 'cubic-bezier(0.4, 0.15, 0.3, 1)';
tile.style.transition = `width 0.3s 0.12s ${ease}, height 0.3s 0.12s ${ease}, transform 0.3s 0.12s ${ease}`;
tile.style.width = rect.width + 'px';
tile.style.height = rect.height + 'px';
tile.style.transform = `translate(${rect.left}px, ${rect.top}px)`;

_closeTimeoutId = setTimeout(() => {
modal.classList.remove('open', 'closing');
modal.setAttribute('aria-hidden', 'true');
document.body.style.overflow = '';
if (cellEl) cellEl.style.visibility = '';
_activeCharCell = null;
_closeTimeoutId = null;
}, 460);
}

document.addEventListener('keydown', (e) => {
if (e.key === 'Escape') closeCharDetail();
});
document.getElementById('char-detail-modal')?.addEventListener('click', (e) => {
if (!e.target.closest('.char-detail-back')) closeCharDetail();
});

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

document.getElementById('word-search')?.addEventListener('input', renderWords);
document.getElementById('word-filter')?.addEventListener('change', renderWords);
document.getElementById('edit-modal')?.addEventListener('click', (e) => {
if (e.target.id === 'edit-modal') closeModal();
});

// Warn on close if a save is still pending
window.addEventListener('beforeunload', (e) => {
if (_savePromise || _saveTimer) {
e.preventDefault();
e.returnValue = 'Character save is still in progress. Wait a moment before closing.';
return e.returnValue;
}
});

// Initial load
loadData();
