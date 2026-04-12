export function createInputController(canvas, controller, statusUpdater) {
  let pointerActive = false;

  function getPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width / (globalThis.devicePixelRatio || 1);
    const scaleY = canvas.height / rect.height / (globalThis.devicePixelRatio || 1);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  canvas.addEventListener("pointerdown", (event) => {
    pointerActive = true;
    canvas.setPointerCapture(event.pointerId);
    controller.startAim(getPoint(event));
    statusUpdater("Aim high and release to fire.");
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointerActive) {
      return;
    }

    controller.updateAim(getPoint(event));
  });

  function release(event) {
    if (!pointerActive) {
      return;
    }

    pointerActive = false;
    controller.releaseAim(getPoint(event));
  }

  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", (event) => {
    if (pointerActive && event.buttons === 0) {
      release(event);
    }
  });
}
