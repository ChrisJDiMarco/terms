export const COLORS = Object.freeze([
  { id: 'red', name: 'Red', hex: '#dc645a', symbol: '◆' },
  { id: 'blue', name: 'Blue', hex: '#688fcf', symbol: '●' },
  { id: 'green', name: 'Green', hex: '#6cb69b', symbol: '▲' },
  { id: 'yellow', name: 'Yellow', hex: '#d7aa59', symbol: '■' },
].map(Object.freeze));

export function createGame({ mode = 'local', starter = 0 } = {}) {
  if (!['local', 'computer'].includes(mode) || ![0, 1].includes(starter)) {
    throw new TypeError('Invalid game settings.');
  }
  return {
    supply: [7, 7, 7, 7],
    players: Array.from({ length: 2 }, () => ({ collection: [0, 0, 0, 0], price: [0, 0, 0, 0] })),
    turn: starter,
    starter,
    moveCount: 0,
    history: [],
    mode,
  };
}

export function scores(state) {
  return state.players.map(player => player.collection.reduce((total, count, color) => total + count * player.price[color], 0));
}

export function isOver(state) {
  return state.supply.every(count => count === 0);
}

export function legalMoves(state) {
  const moves = [];
  for (let keep = 0; keep < 4; keep += 1) {
    if (state.supply[keep] === 0) continue;
    for (let give = 0; give < 4; give += 1) {
      if (state.supply[give] > (keep === give ? 1 : 0)) moves.push({ keep, give });
    }
  }
  return moves;
}

function advance(state, { keep, give }, record) {
  const supply = [...state.supply];
  supply[keep] -= 1;
  supply[give] -= 1;
  const players = state.players.map(player => ({ collection: [...player.collection], price: [...player.price] }));
  players[state.turn].collection[keep] += 1;
  players[1 - state.turn].price[give] += 1;
  return {
    ...state,
    supply,
    players,
    turn: 1 - state.turn,
    moveCount: state.moveCount + 1,
    history: record ? [...state.history, { player: state.turn, keep, give }] : state.history,
  };
}

export function applyMove(state, move) {
  if (!move || !Number.isInteger(move.keep) || !Number.isInteger(move.give)
    || !legalMoves(state).some(legal => legal.keep === move.keep && legal.give === move.give)) {
    throw new RangeError('Choose two available counters.');
  }
  return advance(state, move, true);
}

// Restored games must reproduce the entire visible state from a legal history.
export function validateState(state) {
  try {
    if (!state || typeof state !== 'object' || !Array.isArray(state.history)
      || state.history.length > 14 || state.moveCount !== state.history.length
      || ![0, 1].includes(state.turn) || ![0, 1].includes(state.starter)
      || !['local', 'computer'].includes(state.mode)) return false;
    let replay = createGame({ mode: state.mode, starter: state.starter });
    for (const move of state.history) {
      if (!move || move.player !== replay.turn) return false;
      replay = applyMove(replay, move);
    }
    const sameRow = (actual, expected) => Array.isArray(actual) && actual.length === 4
      && actual.every((count, index) => Number.isInteger(count) && count === expected[index]);
    return state.turn === replay.turn && sameRow(state.supply, replay.supply)
      && Array.isArray(state.players) && state.players.length === 2
      && state.players.every((player, index) => player && sameRow(player.collection, replay.players[index].collection)
        && sameRow(player.price, replay.players[index].price));
  } catch {
    return false;
  }
}

function evaluate(state, root) {
  const totals = scores(state);
  const difference = totals[root] - totals[1 - root];
  if (isOver(state)) return difference;
  // A small look-ahead estimate values opportunities that remain in the pool.
  // It never changes the terminal objective: actual point difference.
  const remaining = state.supply.reduce((sum, count) => sum + count, 0);
  const promise = state.players.map(player => state.supply.reduce((sum, count, color) => {
    const share = count / 4;
    return sum + share * (player.collection[color] + player.price[color]);
  }, 0));
  return difference + (promise[root] - promise[1 - root]) * Math.min(0.6, remaining / 28);
}

export function chooseMove(state) {
  const available = legalMoves(state);
  if (available.length === 0) return null;
  const root = state.turn;
  const remainingTurns = (28 - state.moveCount * 2) / 2;
  const depth = Math.min(4, remainingTurns);
  const immediate = (position, move) => position.players[position.turn].price[move.keep]
    - position.players[1 - position.turn].collection[move.give];
  const order = position => legalMoves(position).sort((a, b) => immediate(position, b) - immediate(position, a));

  function search(position, left, alpha, beta) {
    if (left === 0 || isOver(position)) return evaluate(position, root);
    const maximize = position.turn === root;
    let best = maximize ? -Infinity : Infinity;
    for (const move of order(position)) {
      const result = search(advance(position, move, false), left - 1, alpha, beta);
      best = maximize ? Math.max(best, result) : Math.min(best, result);
      if (maximize) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = -Infinity;
  let chosen = available[0];
  for (const move of order(state)) {
    const value = search(advance(state, move, false), depth - 1, best, Infinity);
    if (value > best + 1e-9) {
      best = value;
      chosen = move;
    }
  }
  return chosen;
}
