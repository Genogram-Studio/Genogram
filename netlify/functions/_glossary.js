/* 자동 생성 파일 — 고치지 마세요. 원본: glossary/glossary.js (scripts/gen-glossary.mjs가 변환) */
// glossary.js — Genogram Studio 상담 용어집 (초안 v0.3)
// 언어 코드: ko 한국어 / en English / zh 中文(繁體) / fr Français / th ไทย / km ខ្មែរ
// fr·th·km 번역어는 아래 TRANSLATIONS 구간에 있습니다(초안 → 검수 후 '확인'). 이 구간은 엑셀(glossary/glossary_review.xlsx)에서
// tools/glossary_xlsx.py 로 가져오면 다시 써지므로 직접 고치지 않습니다. 비어 있는 언어는 자동으로 건너뜁니다.
//   review   {fr|th|km: "draft" | "ok"} — draft(초안)인 번역어는 번역 모델에 '권장어'로만 전달하고 강제·재번역·DeepL 용어집에는 쓰지 않는다.
//
// 필드
//   cat        분류 (bowen 보웬 이론 / structure 가족 구조·역동 / genogram 가계도 표기 /
//              relation 관계선 / therapy 상담·평가 / culture 문화)
//   from       출처 (app 앱 화면 기존 용어 / book 원고·강의안 용어 / lecture 가족심리상담사 강의교안(박인숙)에서 확인 / draft 이번에 보충한 초안)
//   alt        같은 뜻의 다른 표기 {언어: [..]}  (원문에서 찾을 때 함께 인식)
//   ambiguous  일상어와 겹쳐 오해 가능 → LLM 프롬프트에만 쓰고 DeepL 용어집에서는 뺌
//   notFollowedBy  {언어: 정규식 문자열} 뒤에 이 글자가 오면 매칭 제외 (예: '경계하다')
//   hint       모델에게 주는 짧은 영어 주의사항
//   desc       화면(⚙ 기본 용어집)에 용어 옆에 작게 보이는 한국어 한 줄 설명 (번역에는 쓰지 않음)
//   verify     검수가 특히 필요한 언어 목록

const t = (id, cat, ko, en, zh, o = {}) => ({
  id, cat, ko, en, zh, fr: "", th: "", km: "",
  from: "draft", alt: {}, ambiguous: false, notFollowedBy: {}, hint: "", desc: "", verify: [],
  ...o,
});

const BASE = [
  // ── 보웬 가족체계이론 ─────────────────────────────
  t("self-diff", "bowen", "자아분화", "differentiation of self", "自我分化",
    { from: "book", alt: { ko: ["자기분화", "자기 분화", "자아 분화"], en: ["self-differentiation"] } }),
  t("triangulation", "bowen", "삼각관계", "triangulation", "三角關係",
    { from: "book", alt: { ko: ["삼각화", "정서적 삼각관계"], en: ["triangle"], zh: ["三角化"] } }),
  t("detriangulation", "bowen", "탈삼각화", "detriangulation", "去三角化", { verify: ["zh"] }),
  t("nuclear-emotional", "bowen", "핵가족 정서 과정", "nuclear family emotional process", "核心家庭情緒過程",
    { from: "book", alt: { ko: ["핵가족 정서체계", "핵가족 정서 체계"], en: ["nuclear family emotional system"] } }),
  t("projection-process", "bowen", "가족 투사 과정", "family projection process", "家庭投射過程", { from: "book", alt: { ko: ["가족투사과정"] } }),
  t("mgt-process", "bowen", "다세대 전수 과정", "multigenerational transmission process", "多代傳遞過程",
    { from: "book", alt: { ko: ["다세대전수과정", "다세대 전달 과정"] }, verify: ["zh"] }),
  t("igt", "bowen", "세대 간 전이", "intergenerational transmission", "跨代傳遞",
    { from: "book", alt: { ko: ["세대간 전이", "대물림"] }, verify: ["zh"] }),
  t("cutoff", "bowen", "정서적 단절", "emotional cutoff", "情緒斷絕",
    { from: "book", alt: { en: ["emotional cut-off"] }, verify: ["zh"] }),
  t("sibling-pos", "bowen", "형제 순위", "sibling position", "手足排行",
    { from: "book", alt: { ko: ["출생순위", "출생 순위", "출생순서"] }, verify: ["zh"] }),
  t("societal", "bowen", "사회적 정서 과정", "societal emotional process", "社會情緒過程", { from: "book", alt: { ko: ["사회적 정서과정"] } }),
  t("fusion", "bowen", "융합", "fusion", "融合", { from: "book", alt: { ko: ["융해"], en: ["emotional fusion", "fused"] } }),
  t("emo-system", "bowen", "정서 체계", "emotional system", "情緒系統", { from: "book", alt: { ko: ["정서적 체계"] } }),
  t("chronic-anxiety", "bowen", "만성 불안", "chronic anxiety", "慢性焦慮"),
  t("anxiety-flow", "bowen", "불안의 흐름", "flow of anxiety", "焦慮的流動", { from: "book" }),
  t("reactivity", "bowen", "정서적 반응성", "emotional reactivity", "情緒反應性", { alt: { ko: ["반응성"] } }),
  t("objectivity", "bowen", "정서적 객관성", "emotional objectivity", "情緒客觀性", { from: "book" }),
  t("individuality", "bowen", "개별성", "individuality", "個體性", { from: "book", verify: ["zh"] }),
  t("togetherness", "bowen", "연합성", "togetherness", "連結性",
    { from: "book", verify: ["zh"], desc: "함께하려는 정서적 힘",
      hint: "Bowen's 'togetherness' (the emotional force toward closeness). Not 'alliance' (동맹) and not 'coalition' (연합)." }),
  t("i-message", "bowen", "나 전달법", "I-message", "我訊息", { from: "book", alt: { ko: ["나-전달법"] }, verify: ["zh"] }),
  t("family-of-origin", "bowen", "원가족", "family of origin", "原生家庭", { from: "book", alt: { ko: ["원 가족"] } }),
  t("bowen-theory", "bowen", "보웬 가족체계이론", "Bowen family systems theory", "鮑文家庭系統理論",
    { alt: { ko: ["보웬의 가족체계이론", "보웬 이론"] } }),

  // ── 가족 구조·역동 ────────────────────────────────
  t("boundary", "structure", "경계", "boundary", "界線",
    { from: "book", alt: { ko: ["경계선"] }, ambiguous: true, notFollowedBy: { ko: "하|심" }, verify: ["zh"] }),
  t("enmeshment", "structure", "밀착", "enmeshment", "糾結",
    { from: "book", alt: { ko: ["과도한 밀착"], en: ["enmeshed"] }, verify: ["zh"] }),
  t("disengagement", "structure", "분리", "disengagement", "疏離",
    { from: "book", ambiguous: true, notFollowedBy: { ko: "하|되|수거|시|막|독" }, alt: { ko: ["유리된", "유리 관계"], en: ["disengaged"] }, verify: ["zh"] }),
  t("subsystem", "structure", "하위체계", "subsystem", "次系統", { from: "book", alt: { ko: ["하위 체계"] } }),
  t("alliance", "structure", "동맹", "alliance", "結盟",
    { from: "app", ambiguous: true, notFollowedBy: { ko: "국|군|휴학|파업" }, desc: "공동 목적을 위한 협력 관계",
      hint: "Family therapy: two people cooperating for a shared aim; not necessarily against a third person (that is a coalition, 연합). Not 'togetherness' (연합성)." }),
  t("coalition", "structure", "연합", "coalition", "聯盟",
    { from: "lecture", ambiguous: true, notFollowedBy: { ko: "회|군|뉴스|체" }, desc: "제3자에 맞서 형성하는 제휴",
      hint: "Structural family therapy: two people joined against a third person. Not 'alliance' (동맹) and not 'togetherness' (연합성)." }),
  t("cross-gen-coalition", "structure", "세대 간 연합", "cross-generational coalition", "跨世代聯盟",
    { from: "app", alt: { ko: ["세대 간 제휴", "세대간 연합"] } }),
  t("scapegoat", "structure", "희생양", "scapegoat", "代罪羔羊", { from: "app", alt: { en: ["scapegoating"] } }),
  t("surrogate", "structure", "감정적 대리인", "emotional surrogate", "情緒代理人", { from: "app" }),
  t("homeostasis", "structure", "항상성", "homeostasis", "恆定", { from: "book", alt: { ko: ["가족 항상성"] }, verify: ["zh"] }),
  t("feedback-loop", "structure", "피드백 루프", "feedback loop", "回饋迴路", { from: "book" }),
  t("role-expectation", "structure", "역할 기대", "role expectation", "角色期待", { from: "book" }),
  t("family-secret", "structure", "가족 비밀", "family secret", "家庭秘密", { alt: { ko: ["집안의 비밀"] } }),
  t("family-myth", "structure", "가족 신화", "family myth", "家庭神話", { from: "app" }),
  t("family-legacy", "structure", "가족 유산", "family legacy", "家庭傳承", { from: "book" }),
  t("family-dynamics", "structure", "가족 역동", "family dynamics", "家庭動力", { from: "book" }),
  t("identified-patient", "structure", "지목된 환자", "identified patient", "被指認的病人", { verify: ["zh"] }),
  t("therapeutic-triangle", "structure", "치료적 삼각관계", "therapeutic triangle", "治療性三角", { from: "book" }),
  t("in-law-triangle", "structure", "시어머니–며느리 삼각관계", "in-law triangle", "婆媳三角",
    { from: "app", alt: { ko: ["고부 삼각관계"] } }),

  // ── 구조적 가족치료 — 가족심리상담사 강의교안(10차시)에서 확인한 표기 ─────────────
  // 교안은 제휴(alignment)를 연합(coalition)과 동맹(alliance)으로 나누고, 경계선을 명확한/모호한/경직된 세 가지로 나눈다.
  // 중국어와 교안에 영어가 없는 표기는 비워 두거나 '중국어 검수'로 표시했다.
  t("alignment", "structure", "제휴", "alignment", "",
    { from: "lecture", ambiguous: true, desc: "가족원끼리 연결되는 방식 — 연합과 동맹을 아우름",
      hint: "Structural family therapy: how family members join with or against one another; includes coalition (연합) and alliance (동맹). Not a business partnership." }),
  t("stable-coalition", "structure", "안정적 연합", "stable coalition", "", { from: "lecture" }),
  t("detouring-coalition", "structure", "우회연합", "detouring coalition", "", { from: "lecture", alt: { ko: ["우회 연합"] } }),
  t("parental-alliance", "structure", "부모동맹", "parental alliance", "", { from: "lecture", alt: { ko: ["부모 동맹"] } }),
  t("spousal-subsystem", "structure", "부부 하위체계", "spousal subsystem", "夫妻次系統", { from: "lecture", alt: { ko: ["부부하위체계"] }, verify: ["zh"] }),
  t("parental-subsystem", "structure", "부모 하위체계", "parental subsystem", "父母次系統", { from: "lecture", alt: { ko: ["부모하위체계"] }, verify: ["zh"] }),
  t("sibling-subsystem", "structure", "형제자매 하위체계", "sibling subsystem", "手足次系統", { from: "lecture", alt: { ko: ["형제 하위체계"] }, verify: ["zh"] }),
  t("clear-boundary", "structure", "명확한 경계", "clear boundary", "清楚的界線", { from: "lecture", alt: { ko: ["명확한 경계선"] }, verify: ["zh"] }),
  t("diffuse-boundary", "structure", "모호한 경계", "diffuse boundary", "模糊的界線",
    { from: "lecture", alt: { ko: ["모호한 경계선"] }, verify: ["zh"], desc: "지나치게 얽히고 개입하는 밀착된 가족" }),
  t("rigid-boundary", "structure", "경직된 경계", "rigid boundary", "僵化的界線",
    { from: "lecture", alt: { ko: ["경직된 경계선"] }, verify: ["zh"], desc: "교류가 거의 없는 유리된 가족" }),
  t("hierarchy", "structure", "위계", "hierarchy", "階層", { from: "lecture", alt: { ko: ["위계구조", "위계 구조", "위계질서"] }, verify: ["zh"] }),
  t("restructuring", "therapy", "재구조화", "restructuring", "重新結構", { from: "lecture", verify: ["zh"], desc: "구조적 가족치료가 목표로 하는 가족 구조의 재정비" }),
  t("joining", "therapy", "합류", "joining", "",
    { from: "lecture", ambiguous: true, hint: "Structural family therapy: the therapist joins the family system to be accepted. Ignore this entry if it only means merge or join a group." }),
  t("enactment", "therapy", "실연", "enactment", "",
    { from: "lecture", ambiguous: true, hint: "Structural therapy technique: family members act out their interaction in the session. In everyday Korean 실연 can mean a broken love — ignore this entry then." }),

  // ── 가계도 표기 ───────────────────────────────────
  t("genogram", "genogram", "가계도", "genogram", "家系圖", { from: "app" }),
  t("family-tree", "genogram", "족보", "family tree", "族譜", { from: "book" }),
  t("extended-family", "genogram", "확대가족", "extended family", "延伸家庭", { from: "app" }),
  t("single-parent", "genogram", "한부모가족", "single-parent family", "單親家庭", { alt: { ko: ["한부모 가정"] } }),
  t("stepfamily", "genogram", "재혼가족", "stepfamily", "重組家庭", { alt: { ko: ["재혼 가정"], en: ["blended family"] } }),
  t("adoption", "genogram", "입양", "adoption", "領養", { from: "app" }),
  t("stepchild", "genogram", "의붓자녀", "stepchild", "繼子女", { from: "app" }),
  t("cohabit", "genogram", "동거", "cohabitation", "同居", { from: "app" }),
  t("separation", "genogram", "별거", "separation", "分居", { from: "app" }),
  t("divorce", "genogram", "이혼", "divorce", "離婚", { from: "app" }),
  t("miscarriage", "genogram", "유산", "miscarriage", "流產",
    { from: "app", ambiguous: true, hint: "Pregnancy loss only. If the sentence is about inheritance or legacy, ignore this entry." }),
  t("stillbirth", "genogram", "사산", "stillbirth", "死產", { from: "app" }),
  t("induced-abortion", "genogram", "임신중절", "induced abortion", "人工流產", { from: "app", alt: { ko: ["인공임신중절"] } }),

  // ── 관계선 ────────────────────────────────────────
  t("fused-rel", "relation", "융합 관계", "fused relationship", "融合關係", { from: "app" }),
  t("distant-rel", "relation", "소원한 관계", "distant relationship", "疏遠關係", { from: "app" }),
  t("cutoff-rel", "relation", "단절", "cut off", "斷絕",
    { from: "app", ambiguous: true, hint: "In a genogram context, a relationship with no contact." }),
  t("love-hate", "relation", "애증 관계", "love–hate relationship", "愛恨關係", { from: "app", alt: { ko: ["애증"] } }),
  t("emotional-abuse", "relation", "정서적 학대", "emotional abuse", "情緒虐待", { from: "app" }),

  // ── 상담·평가 ─────────────────────────────────────
  t("cultural-genogram", "therapy", "문화적 가계도", "cultural genogram", "文化家系圖", { from: "book" }),
  t("contextualization", "therapy", "맥락화", "contextualization", "脈絡化", { from: "book", verify: ["zh"] }),
  t("deconstruction", "therapy", "가족 해체", "deconstruction", "解構",
    { from: "book", ambiguous: true,
      hint: "Counseling concept: taking apart inherited family patterns to examine them. Do NOT translate as family breakdown or dissolution unless the speaker clearly means the family actually broke up." }),
  t("reconstruction", "therapy", "가족 재구성", "family reconstruction", "家庭重構", { from: "book" }),
  t("intergen-trauma", "therapy", "세대 간 트라우마", "intergenerational trauma", "跨世代創傷", { verify: ["zh"] }),
  t("resilience", "therapy", "회복 탄력성", "resilience", "復原力", { from: "book", alt: { ko: ["회복탄력성"] }, verify: ["zh"] }),
  t("coping", "therapy", "대처 전략", "coping strategy", "因應策略", { from: "book", alt: { ko: ["대처 방식"] }, verify: ["zh"] }),
  t("defense", "therapy", "방어 기제", "defense mechanism", "防衛機轉", { from: "book", alt: { ko: ["방어기제"] }, verify: ["zh"] }),
  t("rapport", "therapy", "라포", "rapport", "信任關係", { from: "book", verify: ["zh"] }),
  t("active-listening", "therapy", "적극적 경청", "active listening", "積極傾聽", { from: "book" }),
  t("emotion-labeling", "therapy", "감정 명명", "emotion labeling", "情緒命名", { from: "book", verify: ["zh"] }),
  t("safe-base", "therapy", "정서적 안전기지", "emotional safe base", "情緒安全基地", { from: "book" }),
  t("attachment", "therapy", "애착", "attachment", "依附", { from: "app" }),
  t("client", "therapy", "내담자", "client", "當事人", { verify: ["zh"] }),
  t("counselor", "therapy", "상담자", "counselor", "諮商師", { alt: { ko: ["상담사"] }, verify: ["zh"] }),
  t("family-counseling", "therapy", "가족상담", "family counseling", "家庭諮商", { alt: { ko: ["가족 상담"] } }),
  t("family-therapy", "therapy", "가족치료", "family therapy", "家族治療", { alt: { ko: ["가족 치료"] }, verify: ["zh"] }),

  // ── 문화 ──────────────────────────────────────────
  t("filial-piety", "culture", "효(孝)", "filial piety", "孝道", { alt: { ko: ["효도"] } }),
  t("eldest-son", "culture", "장남", "eldest son", "長子", { verify: ["zh"] }),
  t("face", "culture", "체면", "face (social standing)", "面子", { alt: { en: ["saving face", "losing face"] } }),
  t("ancestral-rites", "culture", "제사", "ancestral rites", "祭祖", { verify: ["zh"] }),
  t("migration", "culture", "이주", "migration", "遷徙", { from: "app" }),
];

/* <<AUTO:translations — tools/glossary_xlsx.py 가 이 구간을 다시 쓴다. 직접 고치지 마세요 */
const TRANSLATIONS = {
  "self-diff": { fr: "différenciation du soi", th: "การแยกความเป็นตัวตน", km: "ការញែកខ្លួនឯង", alt: {"fr": ["différenciation de soi"]}, review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "triangulation": { fr: "triangulation", th: "สามเหลี่ยมความสัมพันธ์", km: "ត្រីកោណទំនាក់ទំនង", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "detriangulation": { fr: "détriangulation", th: "การออกจากสามเหลี่ยมความสัมพันธ์", km: "ការចេញពីត្រីកោណទំនាក់ទំនង", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "nuclear-emotional": { fr: "processus émotionnel de la famille nucléaire", th: "กระบวนการทางอารมณ์ของครอบครัวเดี่ยว", km: "ដំណើរការអារម្មណ៍នៃគ្រួសារស្នូល", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "projection-process": { fr: "processus de projection familiale", th: "กระบวนการฉายภาพในครอบครัว", km: "ដំណើរការបញ្ជូនបញ្ហាទៅកូន", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "mgt-process": { fr: "processus de transmission multigénérationnelle", th: "กระบวนการส่งผ่านข้ามหลายรุ่น", km: "ដំណើរការបញ្ជូនឆ្លងច្រើនជំនាន់", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "igt": { fr: "transmission intergénérationnelle", th: "การส่งผ่านข้ามรุ่น", km: "ការបញ្ជូនឆ្លងជំនាន់", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "cutoff": { fr: "rupture émotionnelle", th: "การตัดขาดทางอารมณ์", km: "ការផ្ដាច់ផ្លូវអារម្មណ៍", alt: {"fr": ["coupure émotionnelle"]}, review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "sibling-pos": { fr: "position dans la fratrie", th: "ลำดับการเกิดของพี่น้อง", km: "លំដាប់បងប្អូន", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "societal": { fr: "processus émotionnel sociétal", th: "กระบวนการทางอารมณ์ของสังคม", km: "ដំណើរការអារម្មណ៍នៃសង្គម", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "fusion": { fr: "fusion", th: "การหลอมรวม", km: "ការលាយឡំគ្នា", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "emo-system": { fr: "système émotionnel", th: "ระบบอารมณ์", km: "ប្រព័ន្ធអារម្មណ៍", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "chronic-anxiety": { fr: "anxiété chronique", th: "ความวิตกกังวลเรื้อรัง", km: "ការថប់បារម្ភរ៉ាំរ៉ៃ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "anxiety-flow": { fr: "circulation de l'anxiété", th: "การไหลของความวิตกกังวล", km: "លំហូរនៃការថប់បារម្ភ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "reactivity": { fr: "réactivité émotionnelle", th: "ปฏิกิริยาทางอารมณ์", km: "ប្រតិកម្មផ្លូវអារម្មណ៍", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "objectivity": { fr: "objectivité émotionnelle", th: "ความเป็นกลางทางอารมณ์", km: "ភាពអព្យាក្រឹតផ្លូវអារម្មណ៍", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "individuality": { fr: "individualité", th: "ความเป็นปัจเจก", km: "ភាពជាបុគ្គល", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "togetherness": { fr: "besoin d'union", th: "แรงดึงให้อยู่ด้วยกัน", km: "កម្លាំងនៃការរួមគ្នា", alt: {"fr": ["force d'union"]}, review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "i-message": { fr: "message-je", th: "การสื่อสารแบบประโยคฉัน", km: "សារបែប «ខ្ញុំ»", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "family-of-origin": { fr: "famille d'origine", th: "ครอบครัวต้นกำเนิด", km: "គ្រួសារដើមកំណើត", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "bowen-theory": { fr: "théorie des systèmes familiaux de Bowen", th: "ทฤษฎีระบบครอบครัวของโบเวน", km: "ទ្រឹស្ដីប្រព័ន្ធគ្រួសាររបស់ប៊ូវេន", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "boundary": { fr: "frontière", th: "ขอบเขต", km: "ព្រំដែន", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "enmeshment": { fr: "enchevêtrement", th: "ความพัวพันเกินไป", km: "ការជាប់ទាក់ទងគ្នាហួសហេតុ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "disengagement": { fr: "désengagement", th: "การแยกตัวห่างเหิน", km: "ការដាច់ចេញឆ្ងាយពីគ្នា", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "subsystem": { fr: "sous-système", th: "ระบบย่อย", km: "ប្រព័ន្ធរង", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "alliance": { fr: "alliance", th: "พันธมิตร", km: "សម្ព័ន្ធមិត្ត", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "coalition": { fr: "coalition", th: "แนวร่วม", km: "សម្ព័ន្ធប្រឆាំង", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "cross-gen-coalition": { fr: "coalition intergénérationnelle", th: "แนวร่วมข้ามรุ่น", km: "សម្ព័ន្ធប្រឆាំងឆ្លងជំនាន់", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "scapegoat": { fr: "bouc émissaire", th: "แพะรับบาป", km: "អ្នកទទួលបន្ទោសជំនួស", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "surrogate": { fr: "substitut émotionnel", th: "ตัวแทนทางอารมณ์", km: "អ្នកជំនួសផ្លូវអារម្មណ៍", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "homeostasis": { fr: "homéostasie", th: "ภาวะธำรงดุล", km: "លំនឹងរបស់ប្រព័ន្ធ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "feedback-loop": { fr: "boucle de rétroaction", th: "วงจรป้อนกลับ", km: "រង្វង់មតិត្រឡប់", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "role-expectation": { fr: "attente de rôle", th: "ความคาดหวังตามบทบาท", km: "ការរំពឹងទុកតាមតួនាទី", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "family-secret": { fr: "secret de famille", th: "ความลับของครอบครัว", km: "អាថ៌កំបាំងគ្រួសារ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "family-myth": { fr: "mythe familial", th: "ตำนานครอบครัว", km: "ទេវកថាគ្រួសារ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "family-legacy": { fr: "héritage familial", th: "มรดกตกทอดของครอบครัว", km: "កេរ្តិ៍មរតកគ្រួសារ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "family-dynamics": { fr: "dynamique familiale", th: "พลวัตของครอบครัว", km: "ថាមវន្តគ្រួសារ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "identified-patient": { fr: "patient désigné", th: "ผู้ป่วยที่ถูกชี้ตัว", km: "អ្នកជំងឺដែលត្រូវបានចង្អុលបង្ហាញ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "therapeutic-triangle": { fr: "triangle thérapeutique", th: "สามเหลี่ยมเชิงบำบัด", km: "ត្រីកោណព្យាបាល", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "in-law-triangle": { fr: "triangle belle-mère–belle-fille", th: "สามเหลี่ยมแม่สามี–ลูกสะใภ้", km: "ត្រីកោណម្ដាយក្មេក–កូនប្រសា", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "alignment": { fr: "alignement", th: "การเข้าข้าง", km: "ការតម្រឹមភាគី", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "stable-coalition": { fr: "coalition stable", th: "แนวร่วมที่มั่นคง", km: "សម្ព័ន្ធប្រឆាំងដែលស្ថិរភាព", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "detouring-coalition": { fr: "coalition de détournement", th: "แนวร่วมเบี่ยงประเด็น", km: "សម្ព័ន្ធប្រឆាំងបង្វែរ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "parental-alliance": { fr: "alliance parentale", th: "พันธมิตรของพ่อแม่", km: "សម្ព័ន្ធមិត្តរបស់ឪពុកម្ដាយ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "spousal-subsystem": { fr: "sous-système conjugal", th: "ระบบย่อยคู่สมรส", km: "ប្រព័ន្ធរងប្ដីប្រពន្ធ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "parental-subsystem": { fr: "sous-système parental", th: "ระบบย่อยพ่อแม่", km: "ប្រព័ន្ធរងឪពុកម្ដាយ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "sibling-subsystem": { fr: "sous-système fraternel", th: "ระบบย่อยพี่น้อง", km: "ប្រព័ន្ធរងបងប្អូន", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "clear-boundary": { fr: "frontière claire", th: "ขอบเขตที่ชัดเจน", km: "ព្រំដែនច្បាស់លាស់", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "diffuse-boundary": { fr: "frontière diffuse", th: "ขอบเขตที่คลุมเครือ", km: "ព្រំដែនស្រពិចស្រពិល", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "rigid-boundary": { fr: "frontière rigide", th: "ขอบเขตที่แข็งตัว", km: "ព្រំដែនរឹងតឹង", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "hierarchy": { fr: "hiérarchie", th: "ลำดับชั้น", km: "ឋានានុក្រម", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "restructuring": { fr: "restructuration", th: "การจัดโครงสร้างใหม่", km: "ការរៀបចំរចនាសម្ព័ន្ធឡើងវិញ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "joining": { fr: "joining", th: "การเข้าร่วมกับครอบครัว", km: "ការចូលរួមជាមួយគ្រួសារ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "enactment": { fr: "mise en acte", th: "การแสดงปฏิสัมพันธ์จริง", km: "ការបង្ហាញអន្តរកម្មពិត", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "genogram": { fr: "génogramme", th: "จีโนแกรม", km: "ហ្សេណូក្រាម", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "family-tree": { fr: "arbre généalogique", th: "ผังลำดับวงศ์ตระกูล", km: "ពង្សាវតារ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "extended-family": { fr: "famille élargie", th: "ครอบครัวขยาย", km: "គ្រួសារធំ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "single-parent": { fr: "famille monoparentale", th: "ครอบครัวเลี้ยงเดี่ยว", km: "គ្រួសារឪពុកម្ដាយតែម្នាក់", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "stepfamily": { fr: "famille recomposée", th: "ครอบครัวที่เกิดจากการแต่งงานใหม่", km: "គ្រួសារដែលរៀបការថ្មី", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "adoption": { fr: "adoption", th: "การรับบุตรบุญธรรม", km: "ការសុំកូនចិញ្ចឹម", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "stepchild": { fr: "enfant du conjoint", th: "ลูกเลี้ยง", km: "កូនចុង", alt: {"fr": ["beau-fils", "belle-fille"]}, review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "cohabit": { fr: "cohabitation", th: "การอยู่ร่วมกัน", km: "ការរស់នៅជាមួយគ្នា", alt: {"fr": ["union libre", "concubinage"]}, review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "separation": { fr: "séparation", th: "การแยกกันอยู่", km: "ការបែកគ្នារស់នៅ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "divorce": { fr: "divorce", th: "การหย่า", km: "ការលែងលះ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "miscarriage": { fr: "fausse couche", th: "การแท้ง", km: "ការរលូតកូន", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "stillbirth": { fr: "mortinaissance", th: "การคลอดทารกเสียชีวิต", km: "កូនស្លាប់ក្នុងផ្ទៃ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "induced-abortion": { fr: "interruption volontaire de grossesse", th: "การยุติการตั้งครรภ์", km: "ការរំលូតកូន", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "fused-rel": { fr: "relation fusionnelle", th: "ความสัมพันธ์แบบหลอมรวม", km: "ទំនាក់ទំនងលាយឡំគ្នា", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "distant-rel": { fr: "relation distante", th: "ความสัมพันธ์ที่ห่างเหิน", km: "ទំនាក់ទំនងឆ្ងាយ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "cutoff-rel": { fr: "rupture", th: "การตัดขาด", km: "ការផ្ដាច់ទំនាក់ទំនង", alt: {"fr": ["coupure"]}, review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "love-hate": { fr: "relation amour–haine", th: "ความสัมพันธ์แบบรักปนเกลียด", km: "ទំនាក់ទំនងស្រលាញ់ក៏ស្អប់", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "emotional-abuse": { fr: "maltraitance émotionnelle", th: "การทารุณทางอารมณ์", km: "ការធ្វើបាបផ្លូវអារម្មណ៍", alt: {"fr": ["maltraitance psychologique", "violence psychologique"]}, review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "cultural-genogram": { fr: "génogramme culturel", th: "จีโนแกรมเชิงวัฒนธรรม", km: "ហ្សេណូក្រាមវប្បធម៌", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "contextualization": { fr: "contextualisation", th: "การพิจารณาตามบริบท", km: "ការដាក់តាមបរិបទ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "deconstruction": { fr: "déconstruction", th: "การรื้อสร้าง", km: "ការវែកញែករុះរើ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "reconstruction": { fr: "reconstruction familiale", th: "การสร้างครอบครัวขึ้นใหม่", km: "ការសាងសង់គ្រួសារឡើងវិញ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "intergen-trauma": { fr: "traumatisme intergénérationnel", th: "บาดแผลทางใจข้ามรุ่น", km: "ការប៉ះទង្គិចផ្លូវចិត្តឆ្លងជំនាន់", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "resilience": { fr: "résilience", th: "ความยืดหยุ่นทางจิตใจ", km: "ភាពធន់ផ្លូវចិត្ត", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "coping": { fr: "stratégie d'adaptation", th: "กลยุทธ์การรับมือ", km: "យុទ្ធសាស្ត្រដោះស្រាយ", alt: {"fr": ["coping"]}, review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "defense": { fr: "mécanisme de défense", th: "กลไกการป้องกันตนเอง", km: "យន្តការការពារខ្លួន", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "rapport": { fr: "relation de confiance", th: "สัมพันธภาพที่ไว้วางใจ", km: "ទំនាក់ទំនងទុកចិត្ត", alt: {"fr": ["rapport"]}, review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "active-listening": { fr: "écoute active", th: "การฟังอย่างตั้งใจ", km: "ការស្ដាប់ដោយយកចិត្តទុកដាក់", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "emotion-labeling": { fr: "nommer les émotions", th: "การเรียกชื่ออารมณ์", km: "ការដាក់ឈ្មោះអារម្មណ៍", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "safe-base": { fr: "base de sécurité émotionnelle", th: "ฐานที่ปลอดภัยทางอารมณ์", km: "មូលដ្ឋានសុវត្ថិភាពផ្លូវអារម្មណ៍", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "attachment": { fr: "attachement", th: "ความผูกพัน", km: "ការភ្ជាប់ចិត្ត", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "client": { fr: "client", th: "ผู้รับการปรึกษา", km: "អ្នកទទួលការប្រឹក្សា", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "counselor": { fr: "conseiller", th: "ผู้ให้การปรึกษา", km: "អ្នកប្រឹក្សា", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "family-counseling": { fr: "conseil familial", th: "การให้การปรึกษาครอบครัว", km: "ការប្រឹក្សាគ្រួសារ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "family-therapy": { fr: "thérapie familiale", th: "การบำบัดครอบครัว", km: "ការព្យាបាលគ្រួសារ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "filial-piety": { fr: "piété filiale", th: "ความกตัญญู", km: "កតញ្ញូ", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "eldest-son": { fr: "fils aîné", th: "ลูกชายคนโต", km: "កូនប្រុសច្បង", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "face": { fr: "face", th: "หน้าตา", km: "មុខមាត់", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "ancestral-rites": { fr: "rites ancestraux", th: "พิธีไหว้บรรพบุรุษ", km: "ពិធីបុណ្យដូនតា", review: {"fr": "draft", "th": "draft", "km": "draft"} },
  "migration": { fr: "migration", th: "การย้ายถิ่น", km: "ការធ្វើចំណាកស្រុក", review: {"fr": "draft", "th": "draft", "km": "draft"} },
};
/* AUTO:translations>> */

/* <<AUTO:extra — 엑셀에서 새로 적은 용어. tools/glossary_xlsx.py 가 이 구간을 다시 쓴다 */
const EXTRA_TERMS = [
];
/* AUTO:extra>> */

/* 기본 항목 위에 fr·th·km 번역어와 검수 상태를 얹고, 엑셀에서 새로 적은 용어를 덧붙인다 */
const GLOSSARY = [
  ...BASE.map((e) => {
    const x = TRANSLATIONS[e.id];
    if (!x) return e;
    return { ...e, fr: x.fr || "", th: x.th || "", km: x.km || "", alt: { ...e.alt, ...(x.alt || {}) }, review: x.review || {} };
  }),
  ...EXTRA_TERMS.map((x) => ({ cat: "user", from: "draft", alt: {}, ambiguous: false, notFollowedBy: {}, hint: "", desc: "", verify: [], review: {}, fr: "", th: "", km: "", ...x })),
];

// ───────────────────────── 매칭 ─────────────────────────
const LANGS = ["ko", "en", "zh", "fr", "th", "km"];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function surfaceForms(entry, lang) {
  const main = entry[lang];
  if (!main) return [];
  return [main, ...((entry.alt && entry.alt[lang]) || [])];
}

function makeRegex(form, lang, entry) {
  if (lang === "en") {
    const body = esc(form).replace(/\\?[\s\-–]+/g, "[\\s\\-–]+");
    return new RegExp(`(?<![A-Za-z])${body}(?:s|es)?(?![A-Za-z])`, "gi");
  }
  if (lang === "fr") {
    /* 프랑스어: 영어처럼 낱말 경계를 지키되, 악센트 글자(\p{L})와 축약(l'alliance)·복수·여성형 어미를 다룬다 */
    const body = esc(form).replace(/\\?[\s\-–]+/g, "[\\s\\-–]+").replace(/['’]/g, "['’]");
    return new RegExp(`(?<![\\p{L}])${body}(?:s|x|e|es)?(?![\\p{L}])`, "giu");
  }
  const nf = entry.notFollowedBy && entry.notFollowedBy[lang];
  const body = esc(form) + (nf ? `(?!${nf})` : "");
  return new RegExp(body, "g");
}

/** 원문에서 용어집 항목을 찾는다. 긴 표현 우선, 겹치면 하나만. */
function findTerms(text, srcLang, extra = []) {
  const all = mergeUserTerms(GLOSSARY, extra);
  const found = [];
  for (const entry of all) {
    for (const form of surfaceForms(entry, srcLang)) {
      const re = makeRegex(form, srcLang, entry);
      let m;
      while ((m = re.exec(text))) {
        found.push({ start: m.index, end: m.index + m[0].length, entry });
        if (m[0].length === 0) re.lastIndex++;
      }
    }
  }
  found.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  const taken = [];
  for (const f of found) {
    if (!taken.some((x) => f.start < x.end && f.end > x.start)) taken.push(f);
  }
  taken.sort((a, b) => a.start - b.start);
  const seen = new Set();
  return taken.map((x) => x.entry).filter((e) => (seen.has(e.id) ? false : seen.add(e.id)));
}

const isDraft = (e, lang) => !!(e.review && e.review[lang] === "draft");

/** 찾은 항목을 {src, tgt} 쌍으로 바꾼다. 도착 언어 칸이 비어 있으면 뺀다.
    soft: 어느 한쪽 번역어가 아직 초안(검수 전)이면 true — 권장어로만 전달하고 강제하지 않는다. */
function toPairs(entries, srcLang, tgtLang) {
  return entries
    .filter((e) => e[srcLang] && e[tgtLang])
    .map((e) => ({
      id: e.id,
      src: e[srcLang],
      tgt: e[tgtLang],
      tgtAlts: (e.alt && e.alt[tgtLang]) || [],
      ambiguous: !!e.ambiguous,
      hint: e.hint || "",
      soft: isDraft(e, srcLang) || isDraft(e, tgtLang),
    }));
}

/** GPT / Claude 용 시스템 지시문 조각 */
function buildPromptBlock(pairs) {
  if (!pairs.length) return "";
  const hard = pairs.filter((p) => !p.soft), soft = pairs.filter((p) => p.soft);
  const list = (ps) => ps.map((p) => `- ${p.src} → ${p.tgt}`).join("\n");
  const hints = pairs.filter((p) => p.hint).map((p) => `- ${p.src}: ${p.hint}`).join("\n");
  return [
    hard.length ? "Glossary: when the source text contains these counseling terms, use exactly the target term shown." : "",
    hard.length ? "Do not paraphrase them or switch to synonyms. Terms not listed may be translated normally." : "",
    hard.length ? list(hard) : "",
    soft.length ? "Suggested terms (unreviewed drafts): prefer these only when they read naturally in the target language; do not force them and do not mention them." : "",
    soft.length ? list(soft) : "",
    hints ? "Notes:\n" + hints : "",
  ].filter(Boolean).join("\n");
}

/** DeepL 용어집용 TSV. 모호어와 초안(soft) 용어는 강제 치환 위험이 있어 제외한다. */
function toDeepLTsv(pairs) {
  const seen = new Set();
  return pairs
    .filter((p) => !p.ambiguous && !p.soft && !seen.has(p.src) && seen.add(p.src))
    .map((p) => `${p.src}\t${p.tgt}`)
    .join("\n");
}

/** 번역 결과에 지정 용어가 들어갔는지 검사한다. 빠진 항목을 돌려준다. */
function checkOutput(pairs, output) {
  const low = output.toLowerCase();
  return pairs.filter((p) => {
    const forms = [p.tgt, ...p.tgtAlts].map((s) => s.toLowerCase());
    return !forms.some((f) => low.includes(f));
  });
}

/** 기본 용어집 위에 사용자 용어를 덧씌운다. (같은 id 또는 같은 한국어 표기는 사용자 것이 우선) */
function mergeUserTerms(base, userTerms = []) {
  if (!userTerms.length) return base;
  const users = userTerms.map((u, i) => ({
    id: u.id || `user-${i}`, cat: "user", fr: "", th: "", km: "", from: "user",
    alt: {}, ambiguous: false, notFollowedBy: {}, hint: "", verify: [], ...u,
  }));
  const overridden = new Set(users.flatMap((u) => [u.id, u.ko].filter(Boolean)));
  return [...base.filter((e) => !overridden.has(e.id) && !overridden.has(e.ko)), ...users];
}

module.exports = { GLOSSARY, findTerms, toPairs, buildPromptBlock, toDeepLTsv, checkOutput, mergeUserTerms, LANGS };
