let lastConfirmAt = 0;

export const SoundGate = {
  markConfirm() {
    lastConfirmAt = Date.now();
  },
  shouldSuppressAIThought(windowMs = 3000) {
    return Date.now() - lastConfirmAt < windowMs;
  }
};
