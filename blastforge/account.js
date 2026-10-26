// Signing in on Sarge & Deputy Games (account mode only). The account, password handling and session
// belong to the games site (/auth.js); signing in there signs you in here too, and the reverse.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLORS=['#c9b458','#e07a3f','#d94f5c','#c86bd6','#6f8cff','#43b7c9','#5cc48a','#a3c45c','#f2c94c','#e8e2c8'];
let auth=null;const load=async()=>auth||=await import('/auth.js');

// Resolves with the signed-in player, showing the sign-in screen first if needed.
export async function signedInPlayer(){
 const a=await load();let player=null;
 try{player=await a.me();}catch{return gate({note:'Can’t reach Sarge & Deputy Games right now. Check your connection and try again.'});}
 return player||gate();
}

// The sign-in screen. mode: 'in' (sign in), 'up' (create an account), 'claim' (a profile from before accounts)
// or 'forgot' (a recovery code sets a new password).
export function gate({mode='in',name='',note=''}={}){
 return new Promise(resolve=>{
  let box=document.getElementById('account-gate');if(!box){box=document.createElement('section');box.id='account-gate';box.className='account-gate';document.body.append(box);}
  document.body.classList.add('gated');
  const draw=(mode,name='',note='')=>{
   const fresh=mode!=='in',forgot=mode==='forgot';let color=COLORS[Math.floor(Math.random()*COLORS.length)];
   box.innerHTML=`<div class="gate-card"><div class="gate-brand"><img src="./assets/anvil.webp" alt="" width="64" height="64"><div><h1>BLASTFORGE</h1><span>Goals &amp; Adventure</span></div></div>
    <p class="gate-lede">Finish your goals, heat the forge, raise a dragon. Sign in with your Sarge &amp; Deputy Games account.</p>
    ${mode==='claim'||forgot?'':`<div class="seg gate-tabs" role="tablist"><button type="button" role="tab" class="${mode==='in'?'on':''}" aria-selected="${mode==='in'}" data-mode="in">Sign in</button><button type="button" role="tab" class="${mode==='up'?'on':''}" aria-selected="${mode==='up'}" data-mode="up">Create account</button></div>`}
    <form class="gate-form" novalidate>${forgot?'<h2 class="gate-title">Forgot your password?</h2><p class="gate-note">Enter your name and the recovery code you saved when you made your account, then choose a new password.</p>':''}${note?`<p class="gate-note">${esc(note)}</p>`:''}
     <label>Name<input name="name" maxlength="20" autocomplete="username" value="${esc(name)}" ${mode==='claim'?'readonly':''} required></label>
     ${forgot?'<label>Recovery code<input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" required></label>':''}
     <label>${forgot?'New password':fresh?'Choose a password':'Password'}<input name="password" type="password" autocomplete="${fresh?'new-password':'current-password'}" required></label>
     ${fresh?'<label>Type it again<input name="password2" type="password" autocomplete="new-password" required></label>':''}
     ${mode==='up'?`<div class="gate-colors" role="radiogroup" aria-label="Your color">${COLORS.map(c=>`<button type="button" role="radio" aria-checked="${c===color}" data-color="${c}" style="--c:${c}" aria-label="Color ${c}"></button>`).join('')}</div>`:''}
     <button class="primary gate-go">${mode==='up'?'Create account':mode==='claim'||forgot?'Set password':'Sign in'}</button>
     <p class="error gate-error" role="alert"></p>
     ${mode==='in'?'<button type="button" class="gate-link" data-mode="forgot">Forgot your password?</button>':forgot?'<button type="button" class="gate-link" data-mode="in">Back to sign in</button>':''}</form>
    <p class="gate-foot">One account for every game on <a href="/">Sarge &amp; Deputy Games</a>.</p></div>`;
   box.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>draw(b.dataset.mode,box.querySelector('[name=name]').value));
   box.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;box.querySelectorAll('[data-color]').forEach(x=>x.setAttribute('aria-checked',String(x===b)));});
   const form=box.querySelector('form'),err=box.querySelector('.gate-error'),go=box.querySelector('.gate-go');
   (name?form.password:form.name).focus({preventScroll:true});
   form.onsubmit=async e=>{e.preventDefault();err.textContent='';const n=form.name.value.trim(),pw=form.password.value;
    if(!n||!pw){err.textContent='Enter your name and password.';return;}
    if(fresh&&pw!==form.password2.value){err.textContent='Those passwords don’t match.';return;}
    const label=go.textContent;go.disabled=true;go.textContent=mode==='up'?'Creating…':'Signing in…';
    try{const a=await load(),player=mode==='up'?await a.signUp(n,pw,color):mode==='claim'?await a.claim(n,pw):forgot?await a.recover(n,form.code.value,pw):await a.signIn(n,pw);
     const code=player.recovery;delete player.recovery;const finish=()=>{document.body.classList.remove('gated');box.remove();resolve(player);};
     if(code)showCode(code,forgot?'Password changed':'Save your recovery code',finish);else finish();}
    catch(ex){if(ex.code==='unclaimed')return draw('claim',n,ex.message);err.textContent=ex.message;go.disabled=false;go.textContent=label;}};
  };
  // A new recovery code, shown once: the only way back in without the password.
  const showCode=(code,title,done)=>{
   box.innerHTML=`<div class="gate-card"><div class="gate-brand"><img src="./assets/anvil.webp" alt="" width="64" height="64"><div><h1>BLASTFORGE</h1><span>Goals &amp; Adventure</span></div></div>
    <div class="gate-form"><h2 class="gate-title">${esc(title)}</h2><p class="gate-note">If you ever forget your password, this recovery code lets you set a new one. Keep it somewhere safe, like a password manager or a note. You won’t see it again.</p>
    <code class="gate-code">${esc(code)}</code><div class="gate-row"><button type="button" class="quiet" data-copy>Copy</button><button type="button" class="primary" data-done>I’ve saved it</button></div></div></div>`;
   box.querySelector('[data-copy]').onclick=async e=>{try{await navigator.clipboard.writeText(code);e.target.textContent='Copied';}catch{getSelection().selectAllChildren(box.querySelector('.gate-code'));}};
   box.querySelector('[data-done]').onclick=done;
  };
  draw(mode,name,note);
 });
}

export async function signOut(){const a=await load();await a.signOut().catch(()=>{});}
