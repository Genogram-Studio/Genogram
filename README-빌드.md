# Genogram Studio — 소스 하나, 배포 둘

소스는 `src/App.jsx` 하나입니다. 빌드할 때 판(edition)만 다릅니다.

| | 기본판 lite | 통역판 full |
|---|---|---|
| 스위치 | `.env.lite` → `VITE_EDITION=lite` | `.env.full` → `VITE_EDITION=full` |
| 번역 띠·글칸 번역·통역·읽기 | 코드째 빠짐 | 있음 |
| `netlify/functions` · API 키 | 없음 | 있음 |
| 산출물 | `out/genogram-lite-<해시>.zip` | `out/genogram-full-<해시>.zip` |

## 기본판의 번역·통역 안내
기본판에는 🌐 번역·🎤 통역 단추가 옅게 보이고, 누르면 "비용이 드는 기능이라 별도 사이트(통역판)로 분리했다"는 안내와
고정된 예시가 나옵니다(네트워크 사용 없음). 통역판 주소를 `.env.lite`의 `VITE_FULL_URL=https://…`에 적으면
안내창에 "통역판 열기" 링크가 생깁니다(비어 있으면 링크 없음). 주소를 바꾸면 기본판만 다시 빌드해서 올립니다.

## 명령
```
npm install            # 처음 한 번
npm test               # 입력 단축키·언어 판별·설명 박스 줄바꿈·용어집·언어팩 검사
npm run i18n           # App.jsx의 화면 문구를 문법 분석으로 뽑아 i18n/catalog.json 갱신
npm run i18n:report    # 언어팩 진행률·열쇠 불일치·자리 표시·넘칠 수 있는 문구
npm run build:all      # 두 판 빌드 → 자동 검사 → zip 세 개와 jsx 사본 (out/)
npm run dev            # 개발(통역판 모드)
```
`build:all`은 검사(`scripts/check.mjs`)에 실패하면 zip을 만들지 않습니다.
기본판 결과물에 `/.netlify/functions` 같은 API 흔적이 한 글자라도 남으면 실패합니다.

## 배포(Netlify, zip 끌어다 놓기)
- 기본판: 기존 사이트에 lite zip. 환경변수(OPENAI_API_KEY, DEEPL_API_KEY)는 지웁니다.
- 통역판: 별도 사이트에 full zip. 환경변수를 넣고 **다시 배포**합니다. 아래 두 방식 중 하나를 쓰며, 함께 넣지 않습니다.

  **방식 A — 모두가 같은 코드(공용 계정, 간단함)**
  - `OPENAI_API_KEY` — 통역판 전용 OpenAI 프로젝트의 키(월 한도를 그 프로젝트에 설정)
  - `ACCESS_CODE` — 접근 코드(함수 주소는 공개라서 반드시 설정)
  - 선택: `DEEPL_API_KEY`

  **방식 B — 사람마다 다른 코드·다른 OpenAI 프로젝트(비용을 사람별로 구분)**
  - `USER_ACCOUNTS` — 아래 형태의 JSON을 **한 줄로** 넣습니다. `code`는 그 사람에게 알려 줄 12자 이상의 비밀 코드, `openaiKey`는 그 사람의 OpenAI 프로젝트 키(알려 주지 않음). DeepL도 그 사람의 계정으로 나누려면 `deeplKey`를 추가합니다.
    ```json
    [{"id":"counselor_a","code":"12자 이상의 무작위 코드 A","openaiKey":"sk-proj-A"},{"id":"counselor_b","code":"12자 이상의 무작위 코드 B","openaiKey":"sk-proj-B","deeplKey":"deepl-B"}]
    ```
  - 이 값이 설정되어 있으면 `ACCESS_CODE`·공용 `OPENAI_API_KEY`·공용 `DEEPL_API_KEY`는 무시됩니다(우회 불가). 형식이 잘못되거나(JSON 깨짐, 코드 12자 미만, id·코드 중복) `id`·`code`·`openaiKey` 중 하나라도 빠지면 통번역 요청을 전부 막습니다(로그에 이유가 남음) — 비용이 엉뚱한 계정에 잡히는 것보다 안전한 쪽을 택한 것입니다.
  - 사람을 추가·삭제할 때는 배열을 고치고 다시 배포합니다. 앱은 상담 내용도, 사용자별 사용량도 저장하지 않습니다 — 비용은 OpenAI Platform의 **Usage → Costs**에서 그 사람의 프로젝트를 골라 확인합니다.
  - 같은 기기를 여러 사람이 돌아가며 쓰면 번역창·통역창 설정의 **사용자 코드 변경**으로 기기에 저장된 코드만 바꿉니다(가계도 데이터는 그대로).
  - 과거에 공용 키로 이미 쓴 비용은 소급해서 나눌 수 없고, Netlify 호스팅 요금은 이 방식에 포함되지 않습니다.

  **두 방식 공통 선택 환경변수**: `OPENAI_TRANSLATE_MODEL`, `OPENAI_TRANSLATE_EFFORT`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `OPENAI_STT_MODEL`
- 화면 왼쪽 아래의 "기본판 · 해시" / "통역판 · 해시"로 두 사이트의 버전이 같은지 확인합니다.

## 저장된 사례
브라우저 저장소는 주소별로 나뉩니다. 두 사이트 사이에서는 `.genogram.json`으로 내보내고 불러옵니다.

## 통역판의 번역 띠 (요약)
- 표시 언어 [한국어][영어][중국어] 토글(끈 언어는 번역하지 않음), 번역 품질 [자동|일반|정밀], 응답 시간·모델 표시,
  ⚙의 내 용어집·번역 비교, ✎로 번역문 고치기, 🎤 통역을 띠 안의 보이기/가리기 부분으로 통합.
- 등급은 서버가 실제 모델로 바꾼다: 정밀 = `OPENAI_TRANSLATE_MODEL`(기본 gpt-5.6-sol), 일반 = `OPENAI_MODEL_STD`(기본 gpt-5.6-terra → gpt-5.6-sol).
- `OPENAI_TRANSLATE_TIER=fast`면 Fast mode(속도 최대 2.5배, 가격 2배, 기본 꺼짐). 계정이 거부하면 스스로 끈다.
- 함수는 `{ "warm": true }` 요청에 OpenAI를 부르지 않고 바로 답한다(콜드 스타트 완화용 예열, 접근 코드 불필요).
- 소스 안내: `src/App.jsx`(번역 띠 `TranslateDock`, 통역 `InterpreterSection`, 글칸 번역 `TransAssist`), `netlify/functions/*`.

## 화면 크기 (번역 띠·설명 박스)
- 번역 띠는 화면 아래 오른쪽(⇤/⇥로 왼쪽)에 붙는 작은 카드: 폭 540px(번역·통역 함께면 960px), 높이 42vh 이하, 글씨 기본 12px(한글 원문 10px), 줄 간격 1.2.
- 설명 박스 기본 글씨는 12. 선택하면 오른쪽 위에 A−/A+(10~28), 세부 패널에 '모든 설명 박스에 이 크기 적용'.

## 용어집
- 원본은 `glossary/glossary.js`(ES 모듈, 79개 항목)와 검수용 `glossary/glossary_review.xlsx`. 수정하면 `npm run glossary`로
  `netlify/functions/_glossary.js`(자동 생성 사본, 직접 고치지 않는다)를 만든다. `npm run build:all`이 빌드 전에 자동으로 만들고,
  `scripts/check.mjs`가 사본이 원본과 같은지, 기본판에 용어집 자료가 없는지 검사한다.
- `gpt-translate`는 번역할 문장(과 앞 문장)에서 용어를 찾아 그 용어만 지침에 넣고, 문장에 있는 용어(모호어·두 글자 용어 제외)가
  번역에 빠졌으면 같은 모델로 한 번 다시 번역한다(응답의 terms/retried/missing). 사용자 용어집(⚙)이 기본 용어집보다 앞서고, 비운 칸은 기본값을 물려받는다.
- 표준 표기는 '자아분화'(자기분화·자기 분화·자아 분화는 같은 용어로 인식). 앱의 모든 한국어 문구를 자아분화로 통일.
- `package.json`의 `"sideEffects": false`는 기본판에서 안 쓰는 용어집 모듈이 통째로 빠지게 하려는 설정이다.

## 용어 구분 결정과 강의교안 (v0.3)
- alliance=동맹, coalition=연합, togetherness=연합성('함께하려는 정서적 힘'). 앱의 관계선 메뉴·분석 영역 D05('동맹과 연합')·중국어(結盟=alliance, 聯盟=coalition)에 반영.
- 용어집 항목에 `desc`(화면용 한국어 한 줄 설명)를 추가했고, ⚙ 기본 용어집에서 용어 옆에 작게 보인다(번역에는 쓰지 않는다).
- `가족심리상담사 과정 강의교안(박인숙 교안 모음)` → 분석 근거 S7(R05·R06·R07·R08·R15·R16), 참고 도서(제목만), 용어 15개(출처 `lecture`).
- `glossary/glossary_review.xlsx`는 glossary.js에서 다시 만든 검수 시트(94행). xlsx로 고친 것을 반영할 때는 xlsx에 없는 항목(영어·중국어 다른 표기, notFollowedBy)을 잃지 않도록 id별로 합쳐야 한다.

## 데이터 안전
- 저장 키는 예전 그대로다(`gs:index`, `gs:case:<id>`, `gs:draft`, `gs:autosave`). 새로 생긴 키(`gs:trans`, `gs:code`, `gs:tier`, `gs:glossary`, `gs:assist*`)는 사례 자료를 건드리지 않는다.
- `keepUnsaved()`: 새로 시작(onNew)·저장 사례 열기(loadCase)·파일 열기(importJSON) 직전에 저장하지 않은 작업(현재 문서가 마지막 저장 스냅샷과 다르고 사람이 있을 때, 또는 부팅 때 남은 임시저장)을 `gs:case:auto-*`로 자동 보관하고 색인 맨 앞에 '(자동 보관) 제목'으로 넣는다. 저장이 실패하면 아무것도 지우지 않는다.
- 저장한 가계도 삭제는 두 번 눌러야 한다(`delAsk`, 4초 후 취소). '모두 삭제'는 기존의 확인 단계 유지.
- 실제 크롬으로 검증하는 방법: 빌드한 dist-lite/dist-full을 정적 서버로 띄우고 localStorage에 예전 사례를 심은 뒤 열기·번역 띠·분석·새로 고침을 해 보고 저장 자료가 글자 하나까지 같은지 비교한다.


## 화면 언어팩 (locales/)
- 화면 언어 번호 0 영어 · 1 한국어 · 2 중국어는 문구 배열의 같은 번호 칸을 읽고, 3번부터는 `locales/xx.json` 언어팩에서 영어 문구로 찾는다(`src/locales.js`). 새 언어 = 파일 하나 추가(코드 수정 없음, 언어 목록 자동).
- 형식: `{ "meta": {code, label, htmlLang, order}, "strings": { "<영어>": "번역", "<영어>\u0001<한국어>": "번역" } }`. 열쇠에 한국어를 붙이는 것은 영어가 같고 뜻이 다른 문구뿐이다(카탈로그의 `ambiguous`).
- 없는 문구는 영어. 1단계(화면 문구)는 세 언어 모두 채움, 2단계(분석·면담 질문·근거·긴 안내)는 아직 비어 있음(`i18n/catalog.json`의 `tier`).
- App.jsx의 영어 문구를 고치면 그 문구의 번역이 카탈로그에서 빠진다 → `npm run i18n`, `npm test`(고아 열쇠 검사)로 확인하고 엑셀 왕복으로 맞춘다. 문구를 새로 추가하면 언어팩이 비어 있어 영어로 나온다.
- 문구 안의 `{n}`·`{a}` 같은 자리 표시는 번역에서도 그대로 둔다(검사함). 태국어·크메르어는 `html[data-ui="th|km"]` CSS로 줄 간격을 넓혔다.
- 엑셀 검수: `python3 tools/i18n_xlsx.py export|import` (openpyxl 필요).

## 용어집의 프랑스어·태국어·크메르어
- 원본은 여전히 `glossary/glossary.js` 하나다. fr·th·km 번역어와 검수 상태는 그 안의 자동 구간(`AUTO:translations`, `AUTO:extra`)에 있고, `tools/glossary_xlsx.py`가 다시 쓴다(직접 고치지 않는다).
- 검수 상태 `review: {fr|th|km: "draft"|"ok"}` — draft는 번역 모델에 권장어로만 전달, ok가 되면 강제(gpt-translate의 `enforceable`, DeepL TSV에서 제외).
- 엑셀: `python3 tools/glossary_xlsx.py export|import|seed`. 가져올 때 한·영·중 칸이 달라지면 목록으로만 알려 준다.
