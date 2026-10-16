import './style.css';
import { COLORS, createGame, applyMove, scores, isOver, validateState, chooseMove } from './game.js';
import { createTable } from './scene.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <header class="titlebar">
    <div class="brand">Terms<span>A game of give and take</span></div>
    <nav aria-label="Game controls">
      <button id="mode" class="quiet">Two players</button><span class="separator"></span>
      <button id="history" class="quiet">Moves</button><button id="rules" class="quiet">How to play</button>
      <button id="sound" class="icon-button" aria-label="Mute sound" title="Mute sound">♪</button>
      <button id="new" class="outline">New game</button>
    </nav>
  </header>
  <main>
    <section class="arena" aria-label="Game table">
      <aside class="player-panel" id="player-0"></aside>
      <div class="stage">
        <div class="turn-heading"><div class="eyebrow" id="turn-label"></div><h1 id="instruction"></h1><p id="turn-detail"></p></div>
        <div id="table" aria-label="Interactive three-dimensional table. Drag to orbit, scroll to zoom. Use the color buttons below to select counters with a keyboard."></div>
        <div class="scene-footer"><span>Drag to orbit <i>·</i> Scroll to zoom</span><div><button class="view active" id="perspective" aria-pressed="true">Table</button><button class="view" id="top" aria-pressed="false">Overhead</button><button class="view" id="reset-view" aria-label="Reset camera" title="Reset camera">↺</button></div></div>
      </div>
      <aside class="player-panel" id="player-1"></aside>
    </section>
    <section class="move-dock" aria-label="Choose your move">
      <div class="dock-top"><span class="eyebrow" id="dock-label">YOUR MOVE</span><span id="last-move">Keep one counter. Set a price for your opponent.</span><span class="move-number" id="move-number"></span></div>
      <div class="dock-content" id="selection-ui">
        <div class="allocation">
          <button id="keep-slot" class="slot selected" aria-label="Choose the counter to keep"><span class="step">1</span><span><small id="keep-label">For your collection</small><strong id="keep-choice">Choose a counter</strong></span><span class="slot-piece" id="keep-piece">+</span></button>
          <span class="join">&</span>
          <button id="give-slot" class="slot" aria-label="Choose the price counter to give"><span class="step">2</span><span><small id="give-label">For their price</small><strong id="give-choice">Choose a counter</strong></span><span class="slot-piece" id="give-piece">+</span></button>
        </div>
        <div class="supply-picker" aria-label="Available colors">${COLORS.map((c,i)=>`<button class="color-choice" data-color="${i}" aria-label="Select ${c.name}"><span class="mini-coin color-${i}">${c.symbol}</span><span class="color-name">${c.name}</span><span class="remaining" id="remaining-${i}">7</span><kbd>${i+1}</kbd></button>`).join('')}</div>
        <div class="commit-area"><button id="commit" class="primary" disabled>Make your move <span>↵</span></button><button id="clear" class="quiet" disabled>Clear selection</button></div>
      </div>
      <div id="finished" hidden><div><h2 id="outcome"></h2><p id="result-detail"></p></div><button class="primary" id="rematch">Play again <span>↗</span></button></div>
    </section>
  </main>
  <div id="toast" role="status" aria-live="polite"></div>
  <div id="announcement" class="sr-only" aria-live="polite"></div>
  <dialog id="dialog"><button id="close-dialog" class="close" aria-label="Close dialog">×</button><div id="dialog-content"></div></dialog>
`;

let game = createGame({ mode: 'computer', starter: 0 });
let selection = { keep: null, give: null };
let activeSlot = 'keep';
let sound = true;
let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let table;
let botTimer;
let toastTimer;
let audio;
let ready = false;
const $ = id => document.getElementById(id);
const dialog = $('dialog');
const name = player => game.mode === 'computer' ? (player === 0 ? 'You' : 'Computer') : (player === 0 ? 'Player One' : 'Player Two');
const possessive = player => game.mode === 'computer' && player === 0 ? 'your' : `${name(player)}’s`;
const computerTurn = () => game.mode === 'computer' && game.turn === 1 && !isOver(game);
const locked = () => !ready || computerTurn() || isOver(game);

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 5000);
}

function tone(kind = 'pick') {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const at = audio.currentTime;
    const notes = kind === 'commit' ? [392, 587.33] : [660];
    notes.forEach((frequency, i) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at + i * 0.065);
      gain.gain.linearRampToValueAtTime(0.055, at + i * 0.065 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + i * 0.065 + 0.22);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(at + i * 0.065); oscillator.stop(at + i * 0.065 + 0.24);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* Sound is optional; game input remains available without an audio device. */ }
}

async function persist() {
  const data = { version: 1, game, sound, reducedMotion };
  try {
    if (window.termsStore) await window.termsStore.save(data);
    else localStorage.setItem('terms-table', JSON.stringify(data));
  } catch { toast('This game could not be saved. You can keep playing in this window.'); }
}

function update() {
  const total = scores(game);
  const over = isOver(game);
  const thinking = computerTurn();
  const complete = selection.keep !== null && selection.give !== null;
  let preview;
  if (complete) preview = scores(applyMove(game, selection));
  for (let p = 0; p < 2; p++) {
    const player = game.players[p];
    const panel = $(`player-${p}`);
    panel.classList.toggle('current', !over && game.turn === p);
    const change = preview ? preview[p] - total[p] : 0;
    panel.innerHTML = `<div class="player-identity"><span class="seat-mark">${p === 0 ? 'I' : 'II'}</span><span>${name(p)}</span><span class="turn-dot" title="Active player"></span></div>
      <div class="score-line"><strong>${total[p]}</strong><span class="score-preview">${change ? '+' + change : ''}</span></div><div class="score-caption">POINTS${preview ? ' <span> / MOVE PREVIEW</span>' : ''}</div>
      <div class="ledger-header"><span>Color</span><span>Own × price</span><span>Pts</span></div>
      ${COLORS.map((c,i)=>`<div class="ledger-row"><span class="ledger-color"><i class="color-${i}">${c.symbol}</i>${c.name}</span><span class="equation"><b>${player.collection[i]}</b><span>×</span><b>${player.price[i]}</b></span><strong>${player.collection[i] * player.price[i]}</strong></div>`).join('')}
      <div class="player-foot"><span>${player.collection.reduce((a,b)=>a+b,0)} / 7 collected</span><span>${p === game.starter ? 'Opened' : 'Second'}</span></div>`;
  }
  $('turn-label').textContent = over ? 'THE FINAL TERMS' : thinking ? 'ACROSS THE TABLE' : game.mode === 'computer' ? 'YOUR TURN' : `${name(game.turn).toUpperCase()}’S TURN`;
  $('instruction').textContent = over ? (total[0] === total[1] ? 'Perfectly matched.' : `${name(total[0] > total[1] ? 0 : 1)} ${game.mode === 'computer' && total[0] > total[1] ? 'win' : 'wins'}.`) : thinking ? 'Considering the offer…' : complete ? 'Are these your terms?' : activeSlot === 'keep' ? 'What will you keep?' : 'What will you give?';
  $('turn-detail').textContent = over ? 'Every counter has found its price.' : thinking ? 'The next move is being weighed.' : complete ? 'See what changes before you commit.' : activeSlot === 'keep' ? 'Choose a counter for your collection.' : `Choose a counter to raise ${possessive(1 - game.turn)} price.`;
  $('move-number').textContent = `${Math.min(game.moveCount + 1, 14)} / 14 MOVES`;
  $('dock-label').textContent = over ? 'TABLE COMPLETE' : thinking ? 'COMPUTER’S MOVE' : game.mode === 'computer' ? 'YOUR MOVE' : `${name(game.turn).toUpperCase()}’S MOVE`;
  const last = game.history.at(-1);
  $('last-move').textContent = last ? `${name(last.player)} kept ${COLORS[last.keep].name} and raised ${possessive(1 - last.player)} ${COLORS[last.give].name} price.` : 'Keep one counter. Set a price for your opponent.';
  $('mode').textContent = game.mode === 'computer' ? 'Vs computer ▾' : 'Two players ▾';
  $('sound').textContent = sound ? '♪' : '♪̸';
  $('sound').setAttribute('aria-label', sound ? 'Mute sound' : 'Enable sound');
  $('sound').title = sound ? 'Mute sound' : 'Enable sound';
  $('keep-label').textContent = game.mode === 'computer' ? 'For your collection' : `For ${name(game.turn)}’s collection`;
  $('give-label').textContent = game.mode === 'computer' ? 'For their price' : `For ${name(1 - game.turn)}’s price`;
  for (const slot of ['keep', 'give']) {
    const index = selection[slot];
    $(`${slot}-choice`).textContent = index === null ? 'Choose a counter' : COLORS[index].name;
    $(`${slot}-piece`).textContent = index === null ? '+' : COLORS[index].symbol;
    $(`${slot}-piece`).className = 'slot-piece' + (index === null ? '' : ` mini-coin color-${index}`);
    $(`${slot}-slot`).classList.toggle('selected', slot === activeSlot && !locked());
    $(`${slot}-slot`).disabled = locked();
  }
  document.querySelectorAll('.color-choice').forEach(button => {
    const i = Number(button.dataset.color);
    const other = activeSlot === 'keep' ? 'give' : 'keep';
    const remaining = game.supply[i] - Number(selection.keep === i) - Number(selection.give === i);
    $(`remaining-${i}`).textContent = remaining;
    button.disabled = locked() || game.supply[i] <= Number(selection[other] === i);
    button.setAttribute('aria-label', `${COLORS[i].name}, ${remaining} remaining, select for ${activeSlot === 'keep' ? 'collection' : 'opponent price'}`);
  });
  $('commit').disabled = !complete || locked();
  $('clear').disabled = selection.keep === null && selection.give === null || locked();
  $('selection-ui').hidden = over;
  $('finished').hidden = !over;
  if (over) {
    $('outcome').textContent = $('instruction').textContent;
    $('result-detail').textContent = `${name(0)} ${total[0]} · ${name(1)} ${total[1]}. Swap the opening seat and try again.`;
  }
  table?.update(game, selection);
}

function pick(color) {
  if (locked() || dialog.open) return;
  const other = activeSlot === 'keep' ? 'give' : 'keep';
  if (game.supply[color] <= Number(selection[other] === color)) return;
  selection[activeSlot] = color;
  if (selection[other] === null) activeSlot = other;
  tone(); update();
}

function commit(move = selection) {
  if (isOver(game)) return;
  game = applyMove(game, move);
  selection = { keep: null, give: null }; activeSlot = 'keep';
  tone('commit'); update(); persist();
  $('announcement').textContent = `${$('last-move').textContent} Scores ${scores(game).join(' to ')}. ${$('instruction').textContent}`;
  queueBot();
}

function queueBot() {
  clearTimeout(botTimer);
  if (!computerTurn()) return;
  const snapshot = game;
  botTimer = setTimeout(() => {
    if (game !== snapshot) return;
    try { const move = chooseMove(game); if (move) commit(move); }
    catch { toast('The computer could not choose a move. Start a new game to retry.'); }
  }, reducedMotion ? 250 : 1050);
}

function start(mode = game.mode) {
  clearTimeout(botTimer);
  game = createGame({ mode, starter: 1 - game.starter });
  selection = { keep: null, give: null }; activeSlot = 'keep';
  dialog.close(); table?.resetView(); update(); persist(); queueBot();
}

function openDialog(content) {
  $('dialog-content').innerHTML = content;
  if (!dialog.open) dialog.showModal();
}

function newGameDialog() {
  openDialog(`<div class="eyebrow">A NEW SET OF TERMS</div><h2>Take a seat.</h2><p>${game.moveCount && !isOver(game) ? 'Starting a new game will replace the current table.' : 'A short game. An opponent with other ideas.'}</p><div class="mode-options"><button id="start-computer"><span>01</span><strong>Play the computer</strong><small>A local opponent. No connection needed.</small></button><button id="start-local"><span>02</span><strong>Two at the table</strong><small>Share this Mac and take turns.</small></button></div>`);
  $('start-computer').onclick = () => start('computer');
  $('start-local').onclick = () => start('local');
}

$('commit').onclick = () => { if (!locked() && selection.keep !== null && selection.give !== null) commit(); };
$('clear').onclick = () => { selection = { keep: null, give: null }; activeSlot = 'keep'; update(); };
for (const slot of ['keep', 'give']) $(`${slot}-slot`).onclick = () => { activeSlot = slot; update(); };
document.querySelectorAll('.color-choice').forEach(button => { button.onclick = () => pick(Number(button.dataset.color)); });
$('new').onclick = newGameDialog;
$('mode').onclick = newGameDialog;
$('rematch').onclick = () => start();
$('sound').onclick = () => { sound = !sound; tone(); update(); persist(); };
$('close-dialog').onclick = () => dialog.close();
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
$('rules').onclick = () => {
  openDialog(`<div class="eyebrow">HOW TO PLAY</div><h2>Keep one.<br>Give one a price.</h2><p>You choose what to collect. Your opponent determines what it is worth.</p><ol class="rule-steps"><li><b>Take two counters</b> from the shared supply. Same color is allowed when two remain.</li><li><b>Keep one</b> in your collection. Put the other in your opponent’s price row. Confirm to finish your turn.</li><li><b>Count your points:</b> for each color, multiply collection by price. Three reds at a price of two score six. A zero price scores nothing.</li></ol><p>All counters are public. Committed placements are permanent. Seven counters of each color, seven turns each. When the supply is empty, the higher total wins. Equal totals are a draw.</p><div class="rule-example"><span class="mini-coin color-0">◆</span><strong>3 collected × 2 price = 6 points</strong></div><div class="settings-row"><label><input id="motion-setting" type="checkbox" ${reducedMotion ? 'checked' : ''}> Reduce motion</label><span>Keys 1–4 select · Enter confirms</span></div>`);
  $('motion-setting').onchange = event => { reducedMotion = event.target.checked; table?.setReducedMotion(reducedMotion); document.body.classList.toggle('reduce-motion', reducedMotion); persist(); };
};
$('history').onclick = () => {
  openDialog(`<div class="eyebrow">THIS GAME</div><h2>The exchange.</h2>${game.history.length ? `<ol class="history-list">${game.history.map((move,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><strong>${name(move.player)}</strong><p>Kept <b>${COLORS[move.keep].name}</b><br>Gave a <b>${COLORS[move.give].name}</b> price</p></li>`).join('')}</ol>` : '<p>No moves yet. Every exchange will appear here.</p>'}`);
};
function view(mode) {
  table?.setView(mode);
  for (const id of ['perspective', 'top']) { $(id).classList.toggle('active', id === mode); $(id).setAttribute('aria-pressed', String(id === mode)); }
}
$('perspective').onclick = () => view('perspective');
$('top').onclick = () => view('top');
$('reset-view').onclick = () => { table?.resetView(); view('perspective'); };
window.addEventListener('keydown', event => {
  if (dialog.open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.metaKey || event.ctrlKey || event.altKey) return;
  if (/^[1-4]$/.test(event.key)) { event.preventDefault(); pick(Number(event.key) - 1); }
  if (event.key === 'Enter' && !locked() && !$('commit').disabled && event.target.tagName !== 'BUTTON') { event.preventDefault(); commit(); }
  if (event.key === 'Escape') { selection = { keep: null, give: null }; activeSlot = 'keep'; update(); }
});

async function initialize() {
  try {
    const saved = window.termsStore ? await window.termsStore.load() : JSON.parse(localStorage.getItem('terms-table') || 'null');
    if (saved?.loadError) toast(saved.loadError);
    else if (saved) {
      if (saved.version === 1 && validateState(saved.game)) {
        game = saved.game;
        if (typeof saved.sound === 'boolean') sound = saved.sound;
        if (typeof saved.reducedMotion === 'boolean') reducedMotion = saved.reducedMotion;
      } else toast('The saved table was invalid. A new game is ready.');
    }
  } catch { toast('The saved table could not be opened. A new game is ready.'); }
  try { table = createTable($('table'), { onPick: pick }); table.setReducedMotion(reducedMotion); }
  catch { $('table').innerHTML = '<div class="render-error">The 3D table could not start.<br>You can still play using the counters below.</div>'; toast('3D is unavailable. Restart Terms to try again.'); }
  document.body.classList.toggle('reduce-motion', reducedMotion);
  ready = true; update(); queueBot();
}
initialize();
