export function createAudioBus() {
  let soundEnabled = false;
  const listeners = new Set();

  return {
    isEnabled() {
      return soundEnabled;
    },

    setEnabled(enabled) {
      soundEnabled = Boolean(enabled);
    },

    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    emit(type, payload = {}) {
      if (!soundEnabled) {
        return;
      }

      for (const listener of listeners) {
        listener({ type, payload });
      }
    }
  };
}
