export function createInputController(surface, canvas, controller, statusUpdater) {
  let pointerActive = false;

  function getPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 720 / rect.width;
    const scaleY = 960 / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  surface.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, input, label")) {
      return;
    }

    pointerActive = true;
    surface.setPointerCapture(event.pointerId);
    controller.startAim(getPoint(event));
    statusUpdater("Pull anywhere on the screen, then release to fire.");
  });

  surface.addEventListener("pointermove", (event) => {
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

  surface.addEventListener("pointerup", release);
  surface.addEventListener("pointercancel", release);
  surface.addEventListener("pointerleave", (event) => {
    if (pointerActive && event.buttons === 0) {
      release(event);
    }
  });
}
