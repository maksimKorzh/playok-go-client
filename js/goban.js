const EMPTY = 0
const BLACK = 1
const WHITE = 2
const MARKER = 4
const OFFBOARD = 7
const LIBERTY = 8

var board = [];
var moveHistory = [];
var komi = 7.5;
var size = 21;
var side = BLACK;
var liberties = [];
var block = [];
var ko = EMPTY;
var bestMove = EMPTY;
var userMove = EMPTY;
var moveCount = EMPTY;
var level = 1;

function clearBoard() {
  board = [];
  moveHistory = [];
  liberties = [];
  block = [];
  liberties = [];
  block = [];
  side = BLACK;
  ko = EMPTY;
  bestMove = EMPTY;
  userMove = EMPTY;
  moveCount = EMPTY;
  level = 1;
  for (let sq = 0; sq < size ** 2; sq++) {
    switch (true) {
      case (sq < size):
      case (sq >= (size ** 2 - size)):
      case (!(sq % size)):
        board[sq] = OFFBOARD;
        board[sq-1] = OFFBOARD;
        break;
      default: board[sq] = 0;
    }
  }
}

function printBoard() {
  let pos = '';
  let chars = '.XO    #';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      let sq = row * size + col;
      pos += ' ' + chars[board[sq]];
    } pos += '\n'
  } console.log(pos);
}

function setStone(sq, color, user) {
  if (board[sq] != EMPTY) return false;
  else if (sq == ko) {
    if (user) alert("Ko!");
    return false;
  } let old_ko = ko;
  ko = EMPTY;
  board[sq] = color;
  captures(3 - color, sq);
  countLiberties(sq, color);
  let suicide = liberties.length ? false : true; 
  restoreBoard();
  if (suicide) {
    board[sq] = EMPTY;
    ko = old_ko;
    moveCount--;
    if (user) alert("Suicide move!");
    return false;
  } 
  side = 3 - side;
  userMove = sq;
  moveHistory.push({
    'ply': moveCount+1,
    'side': (3-color),
    'move': sq,
    'board': JSON.stringify(board),
    'ko': ko
  });
  moveCount = moveHistory.length-1;
  moveSound.play();
  return true;
}

function passMove() {
  alert('PASS');
  moveHistory.push({
    'ply': moveCount+1,
    'side': (3-side),
    'move': EMPTY,
    'board': JSON.stringify(board),
    'ko': ko
  });
  moveCount = moveHistory.length-1;
  ko = EMPTY;
  side = 3 - side;
  moveSound.play();
}

function countLiberties(sq, color) {
  let stone = board[sq];
  if (stone == OFFBOARD) return;
  if (stone && (stone & color) && (stone & MARKER) == 0) {
    block.push(sq);
    board[sq] |= MARKER;
    for (let offset of [1, size, -1, -size]) countLiberties(sq+offset, color);
  } else if (stone == EMPTY) {
    board[sq] |= LIBERTY;
    liberties.push(sq);
  }
}

function restoreBoard() {
  block = []; liberties = []; points_side = [];
  for (let sq = 0; sq < size ** 2; sq++) {
    if (board[sq] != OFFBOARD) board[sq] &= 3;
  }
}

function captures(color, move) {
  for (let sq = 0; sq < size ** 2; sq++) {
    let stone = board[sq];
    if (stone == OFFBOARD) continue;
    if (stone & color) {
      countLiberties(sq, color);
      if (liberties.length == 0) clearBlock(move);
      restoreBoard()
    }
  }
}

function clearBlock(move) {
  if (block.length == 1 && inEye(move, 0) == 3-side) ko = block[0];
  for (let i = 0; i < block.length; i++)
    board[block[i]] = EMPTY;
}

function inEye(sq) {
  let eyeColor = -1;
  let otherColor = -1;
  for (let offset of [1, size, -1, -size]) {
    if (board[sq+offset] == OFFBOARD) continue;
    if (board[sq+offset] == EMPTY) return 0;
    if (eyeColor == -1) {
      if (board[sq+offset] <= 2) eyeColor = board[sq+offset];
      else eyeColor = board[sq+offset] - MARKER;
      otherColor = 3-eyeColor;
    } else if (board[sq+offset] == otherColor)
      return 0;
  } return eyeColor;
}

function initGoban() {
  clearBoard();
  moveHistory.push({
    'ply': 0,
    'side': BLACK,
    'move': EMPTY,
    'board': JSON.stringify(board),
    'ko': ko
  });
  moveCount = moveHistory.length-1;
}
