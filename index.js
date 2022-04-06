// - [ ] マルチタッチの配慮（プライマリポインタの決定） https://developer.mozilla.org/ja/docs/Web/API/Pointer_events#determining_the_primary_pointer

(() => {
  let state = 0;
  const $sheet = $("#sheet");
  const $control = $("#sheet-control");
  const $content = $("#sheet-content");

  $control.on("click", () => {
    const nextState = (state + 1) % 3;
    moveToState(nextState);
  });

  moveToState(0);

  function moveToState(nextState) {
    state = nextState;
    if (state === 0) {
      $sheet.css("transition", "0.4s ease transform");
      $sheet.css({
        transform: "translateY(-64px)",
      });
      $sheet.one("transitionend", () => {
        $sheet.css("transition", "");
      });
    } else if (state === 1) {
      $sheet.css("transition", "0.3s ease transform");
      $sheet.css({
        transform: "translateY(-50vh)",
      });
      $sheet.one("transitionend", () => {
        $sheet.css("transition", "");
      });
    } else if (state === 2) {
      $sheet.css("transition", "0.4s ease transform");
      $sheet.css({
        transform: "translateY(-100vh)",
      });
      $sheet.one("transitionend", () => {
        $sheet.css("transition", "");
      });
    }
  }

  // $sheet.on("pointerdown", (e) => {
  //   console.log("pointerdown");
  //   $sheet[0].setPointerCapture(e.pointerId);
  // });
  //
  // $sheet.on("pointermove", () => {
  //   console.log("pointermove");
  // });
  //
  // $sheet.on("pointerup", (e) => {
  //   console.log("pointerup");
  //   $sheet[0].releasePointerCapture(e.pointerId);
  // });
})();
