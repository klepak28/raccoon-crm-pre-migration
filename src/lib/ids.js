export function createIdGenerator(prefix) {
  let next = 1;
  return () => `${prefix}_${String(next++).padStart(4, '0')}`;
}
