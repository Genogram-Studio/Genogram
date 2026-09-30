// Merge only identical records; preserve different dates, types and extra metadata.
const stable = value => Array.isArray(value) ? value.map(stable) :
  value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
export function normalizeUnions(doc) {
  const seen = new Map(), aliases = new Map(), unions = [];
  for (const union of doc.unions || []) {
    const { id, a, b, ...data } = union;
    const key = JSON.stringify(stable({ pair: [a, b].sort(), data }));
    if (seen.has(key)) aliases.set(id, seen.get(key));
    else { seen.set(key, id); unions.push(union); }
  }
  if (!aliases.size) return doc;
  const anchor = a => a?.kind === 'union' && aliases.has(a.id) ? { ...a, id: aliases.get(a.id) } : a;
  return { ...doc, unions,
    people: (doc.people || []).map(p => aliases.has(p.puid) ? { ...p, puid: aliases.get(p.puid) } : p),
    notes: (doc.notes || []).map(n => ({ ...n, anchor: anchor(n.anchor), ...(n.anchors ? { anchors: n.anchors.map(anchor) } : {}) })) };
}
