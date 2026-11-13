// Model lifecycle hook untuk uji handler; bukan renderer/layout React Native.
export function hookHarness() {
  const slots = [];
  let cursor = 0;
  let pending = [];
  let updates = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, (next) => {
        updates += 1;
        slots[index].value = typeof next === "function" ? next(slots[index].value) : next;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback) { return callback; },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((dep, n) => dep !== slots[index].deps[n])) {
        pending.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { deps, cleanup: callback() };
        });
      }
    },
  };
  return {
    react,
    render(callback) {
      cursor = 0;
      const result = callback();
      const effects = pending;
      pending = [];
      effects.forEach((effect) => effect());
      return result;
    },
    updates: () => updates,
    unmount: () => slots.forEach((slot) => slot.cleanup?.()),
  };
}
