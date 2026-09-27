// The first app's progress codes: the watched marks as one base-36 number, one bit per film in a frozen
// catalogue order (see legacy-ids.js). They carry no dates and don't say which order made them.

export function decodeLegacy(code, legacyIds) {
  if (typeof code !== "string" || !/^[a-z0-9]+$/i.test(code.trim()) || code.length > 200) throw Error("Invalid legacy code.");
  let n = 0n;
  for (const ch of code.trim().toLowerCase()) n = n * 36n + BigInt(parseInt(ch, 36));
  if (n >= 1n << BigInt(legacyIds.length)) throw Error("The legacy code is too long for the original catalogue.");
  const bits = n.toString(2).padStart(legacyIds.length, "0");
  return new Set(legacyIds.filter((_, i) => bits[i] === "1"));
}

// The inverse, for tests and fixtures only: Kuvert never writes these codes any more.
export function encodeLegacy(ids, legacyIds) {
  const set = new Set(ids);
  const bits = legacyIds.map((id) => (set.has(id) ? "1" : "0")).join("");
  return BigInt("0b" + (bits || "0")).toString(36);
}
