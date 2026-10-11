import '@testing-library/jest-dom/vitest';

// Radix primitives (Slider, Select) rely on browser APIs that jsdom does not implement.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
