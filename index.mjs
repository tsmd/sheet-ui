// - [x] ポインター動作に合わせてシートを動かす
// - [x] ポインターを離した位置に応じてシート位置を設定する
// - [x] iOS Safari のアドレスバーが動いてしまう問題を解消する
// - [ ] マークアップちゃんとする
// - [ ] 閉じてるときコンテンツは不可視にする
// - [ ] 開閉に応じてコンテンツの高さを変動させる
// - [x] 全開きのとき、スクロール最上部における下スワイプはシートを閉じる動作になり、それ以外はスクロールできる
// - [ ] ウィンドウ変化に応じて stops を動かす
// - [x] マルチタッチの配慮（プライマリポインタの決定） https://developer.mozilla.org/ja/docs/Web/API/Pointer_events#determining_the_primary_pointer → うまくいかない
// - [ ] フリック方向に応じてシート位置を設定する
// - [ ] フリックの速度に応じてシート位置を設定する
// - [ ] フリックの速度とシートの動く速度を滑らかに接続する
// - [ ] 外部から開閉を制御する
// - [ ] 外部から新しいシートを作って制御する
// - [ ] 閉じるボタンで完全に閉じる
// - [ ] スクロールの高さを超える大きさの要素にフォーカスしたときに自動的にフルスクリーンにする
// - [ ] インタラクティブ要素からスワイプを始めたときの挙動を修正する

let state = 0;
const $sheet = $("#sheet");
const $control = $("#sheet-control");
const $content = $("#sheet-content");

/*
 * スクロールキャンセルの制御
 * 全開きのときかつ、コンテンツがスクロール最上部にいるとき、下にスワイプするとスクロールをキャンセルして
 * パネルの操作をさせる。
 */
let startY = 0;
$content[0].addEventListener("touchstart", (e) => {
  log(`content touchstart ${e.touches[0].clientY}`);
  startY = e.touches[0].clientY;
});
$content[0].addEventListener("touchmove", (e) => {
  log(`content touchmove ${e.touches[0].clientY}`);
  // 最初の touchmove の発生の時点で preventDefault すればスクロールをキャンセルできる。
  // Chrome でどうなるかは要検証
  if (
    state !== 2 ||
    ($content.scrollTop() <= 0 && startY < e.touches[0].clientY)
  ) {
    log(`prevent content touchmove!`);
    e.preventDefault();
  }
});

function getStop(state) {
  switch (state) {
    case 0:
      return 64;
    case 1:
      return window.innerHeight / 2;
    case 2:
      return window.innerHeight - 16;
  }
}

function moveToState(nextState, { v0 = 0, noTransition = false } = {}) {
  state = nextState;
  const stop = -getStop(state);
  if (noTransition) {
    $sheet.css("transform", `translateY(${stop}px)`);
    return;
  }
  const bezier = BezierEasing(0.16, 0.8 + Math.abs(v0) / 12, 0.32, 1.0);
  const duration = 500;
  const start = getYFromMatrix($sheet.css("transform"));
  const startTime = Date.now();
  function tick() {
    const now = Date.now();
    const t = Math.min((now - startTime) / duration, 1);
    $sheet.css(
      "transform",
      `translateY(${start + (stop - start) * bezier(t)}px)`
    );
    if (startTime + duration > now) {
      requestAnimationFrame(tick);
    }
  }
  tick();
}

/**
 * @param {string} matrix
 * @returns {*}
 */
function getYFromMatrix(matrix) {
  const matched = matrix.match(/matrix\((.+)\)/);
  if (!matched) return 0;
  const value = matched[1];
  return Number(value.split(/,\s*/).slice(-1)[0]);
}

let grabbing = false;

// インタラクティブ要素をタッチの起点にしつつスワイプしたときでもクリックイベントが発火してしまう。
// クリック判定のために、
let hasMoved = false;
$sheet[0].addEventListener(
  "click",
  (e) => {
    if (hasMoved) {
      e.preventDefault();
    }
  },
  { capture: true }
);

let start = 0;
let startMatrix;

/*
 * コントローラークリックの制御
 */
$control.on("click", (e) => {
  if (e.originalEvent.defaultPrevented) {
    return;
  }
  log("controller click");
  const nextState = (state + 1) % 3;
  moveToState(nextState);
});

/*
 * ポインター操作による開閉処理
 */
let pastPositions = [];
$sheet.on("pointerdown", (e) => {
  log("pointerdown");
  grabbing = true;
  hasMoved = false;
  // moveToState によって有効化されているかもしれないトランジションを削除
  $sheet.css("transition", "");
  start = e.clientY;
  pastPositions = [{ pos: start, time: Date.now() }];
  startMatrix = $sheet.css("transform");

  // 操作が要素の外側にはみ出ても pointermove を発火し続ける
  e.target.setPointerCapture(e.pointerId);
});
$sheet.on("pointercancel", (e) => {
  log(`pointercancel`);
  grabbing = false;
  moveToState(state, { noTransition: true });
});
$sheet.on("pointermove", (e) => {
  if (!grabbing) {
    return;
  }
  log(`pointermove ${e.clientY}`);
  const delta = e.clientY - start;
  if (Math.abs(delta) > 5) {
    hasMoved = true;
  }
  pastPositions.push({ pos: e.clientY, time: Date.now() });
  if (pastPositions.length > 3) pastPositions.shift();
  $sheet.css("transform", `${startMatrix} translateY(${delta}px)`);
});
$sheet.on("pointerup", (e) => {
  // pastPositions.push(e.clientY);
  // if (pastPositions.length > 3) pastPositions.shift();
  log(`pointerup ${JSON.stringify(pastPositions)}`);
  $sheet[0].releasePointerCapture(e.pointerId);
  grabbing = false;
  // フリック
  const elapsedTime =
    pastPositions[pastPositions.length - 1].time - pastPositions[0].time;
  const distance =
    pastPositions[pastPositions.length - 1].pos - pastPositions[0].pos;
  const velocity = elapsedTime === 0 ? 0 : distance / elapsedTime;
  log(`velocity ${velocity} ${state}`);
  if (Math.abs(velocity) >= 1) {
    if (state === 2) {
      if (velocity >= 4.5) {
        moveToState(0, { v0: velocity });
      } else if (velocity >= 1) {
        moveToState(1, { v0: velocity });
      } else {
        moveToState(2, { v0: velocity });
      }
    } else if (state === 1) {
      if (velocity >= 1) {
        moveToState(0, { v0: velocity });
      } else if (velocity <= 1) {
        moveToState(2, { v0: velocity });
      } else {
        moveToState(1, { v0: velocity });
      }
    } else if (state === 0) {
      if (velocity <= -4.5) {
        moveToState(2, { v0: velocity });
      } else if (velocity <= -1) {
        moveToState(1, { v0: velocity });
      } else {
        moveToState(0, { v0: velocity });
      }
    }
  } else {
    const last = getYFromMatrix(startMatrix) + e.clientY - start;
    const minIndex = [0, 1, 2]
      .map((state) => Math.abs(last + getStop(state)))
      .reduce((minIndex, delta, i, deltas) => {
        return deltas[minIndex] > delta ? i : minIndex;
      }, 0);
    moveToState(minIndex);
  }
});

/* ログ */
const $log = $("#log");
function log(text) {
  const newText = (text + "\n" + $log.text()).slice(0, 1024);
  $log.text(newText);
}

/*
 * シート内のインタラクティブ要素にクリックイベントを付けるときは
 * かならず defaultPrevented プロパティを検査する。
 */
$("#interactive-1").on("click", (e) => {
  if (e.originalEvent.defaultPrevented) {
    return;
  }
  alert("clicked!");
});

moveToState(0, { noTransition: true });
