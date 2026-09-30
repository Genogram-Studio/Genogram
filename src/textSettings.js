export const textSize = (value, fallback) => Number.isFinite(Number(value)) && Number(value)>0 ? Math.min(48,Math.max(6,Number(value))) : fallback;
// Preserve the appearance of older files once, then keep each text field independent.
export function normalizeTextSettings(doc = {}) {
  if(doc.textSettingsVersion === 2)return doc;
  const scale=Math.min(1.8,Math.max(1,Number(doc.textScale)||1));
  return {...doc,textSettingsVersion:2,textScale:1,
    people:(doc.people||[]).map(p=>({...p,nameSize:textSize(p.nameSize,13*scale),infoSize:textSize(p.infoSize,11*scale),noteSize:textSize(p.noteSize,10*scale)})),
    notes:(doc.notes||[]).map(n=>({...n,size:textSize((n.size||12)*scale,12)})),
    storyFontSizes:{...doc.storyFontSizes},contextFontSizes:{...doc.contextFontSizes},storySplit:true};
}
