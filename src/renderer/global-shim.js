if (typeof global === 'undefined') {
  if (typeof window !== 'undefined') {
    window.global = window;
  } else if (typeof self !== 'undefined') {
    self.global = self;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.global = globalThis;
  }
}
