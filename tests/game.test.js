import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, scores, legalMoves, applyMove, isOver, validateState, chooseMove } from '../src/game.js';

const reachExample = () => [[1, 2], [2, 2], [0, 2], [0, 2], [0, 2], [3, 3], [2, 3], [3, 0], [0, 3], [1, 0]]
  .reduce((state, [keep, give]) => applyMove(state, { keep, give }), createGame());
const play = (state, sequence) => sequence.reduce((next, [keep, give]) => applyMove(next, { keep, give }), state);

test('initial setup supports all sixteen allocations and preserves input on a move', () => {
  const initial = createGame();
  const before = JSON.stringify(initial);
  assert.equal(legalMoves(initial).length, 16);
  const next = applyMove(initial, { keep: 0, give: 0 });
  assert.equal(JSON.stringify(initial), before);
  assert.deepEqual(next.supply, [5, 7, 7, 7]);
  assert.equal(next.players[0].collection[0], 1);
  assert.equal(next.players[1].price[0], 1);
  assert.deepEqual(next.history, [{ player: 0, keep: 0, give: 0 }]);
});

test('worked endgame is reachable and greedy gain loses while denial wins', () => {
  const state = reachExample();
  assert.equal(validateState(state), true);
  assert.deepEqual(state.supply, [1, 5, 0, 2]);
  assert.deepEqual(state.players, [
    { collection: [3, 1, 1, 0], price: [2, 0, 2, 1] },
    { collection: [1, 1, 1, 2], price: [0, 0, 3, 2] },
  ]);
  assert.deepEqual(scores(state), [8, 7]);
  assert.deepEqual(scores(play(state, [[0, 1], [3, 3], [1, 1], [1, 1]])), [12, 13]);
  assert.deepEqual(scores(play(state, [[3, 3], [0, 1], [1, 1], [1, 1]])), [13, 11]);
});

test('illegal allocations include depleted colors, a lone same-color counter, and invalid indices', () => {
  const state = reachExample();
  for (const move of [{ keep: 0, give: 0 }, { keep: 2, give: 1 }, { keep: 1, give: 2 },
    { keep: -1, give: 1 }, { keep: 4, give: 1 }, { keep: 0.5, give: 1 }, { keep: '1', give: 1 }, null]) {
    assert.throws(() => applyMove(state, move), RangeError);
  }
});

test('every counter is conserved through complete computer games from either starter', () => {
  for (const starter of [0, 1]) {
    let state = createGame({ mode: 'computer', starter });
    while (!isOver(state)) {
      const before = JSON.stringify(state);
      const move = chooseMove(state);
      assert.equal(JSON.stringify(state), before);
      assert.ok(legalMoves(state).some(candidate => candidate.keep === move.keep && candidate.give === move.give));
      state = applyMove(state, move);
      for (let color = 0; color < 4; color += 1) {
        assert.equal(state.supply[color] + state.players.reduce((sum, p) => sum + p.collection[color] + p.price[color], 0), 7);
      }
      assert.equal(validateState(state), true);
    }
    assert.equal(state.moveCount, 14);
    assert.deepEqual(state.players.map(p => p.collection.reduce((a, b) => a + b)), [7, 7]);
    assert.deepEqual(state.players.map(p => p.price.reduce((a, b) => a + b)), [7, 7]);
    assert.equal(chooseMove(state), null);
    assert.deepEqual(legalMoves(state), []);
    assert.throws(() => applyMove(state, { keep: 0, give: 1 }));
  }
});

test('bot chooses the winning denial in the exact four-turn ending', () => {
  assert.deepEqual(chooseMove(reachExample()), { keep: 3, give: 3 });
});

test('restoration accepts legal JSON and rejects altered or malformed state', () => {
  const state = reachExample();
  assert.equal(validateState(JSON.parse(JSON.stringify(state))), true);
  for (const malformed of [null, {}, [], { ...state, mode: 'remote' }, { ...state, moveCount: 9 },
    { ...state, turn: 1 }, { ...state, starter: 1 }, { ...state, supply: [2, 4, 0, 2] },
    { ...state, supply: ['1', 5, 0, 2] }, { ...state, players: [null, null] },
    { ...state, history: [...state.history.slice(0, -1), { player: 1, keep: 2, give: 2 }] }]) {
    assert.equal(validateState(malformed), false);
  }
});
