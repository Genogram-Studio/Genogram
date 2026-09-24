/* USER_ACCOUNTS — 사용자별 계정 인증(_util.resolveAccount). 사람마다 자기 OpenAI 프로젝트로 청구되도록
   올바른 코드에만 그 사람의 키를 돌려주는지, 설정이 잘못되면 막는지, 예전 단일-코드 방식과 호환되는지 검사한다. */
import assert from "node:assert/strict";

const ORIG = process.env.USER_ACCOUNTS, ORIG_ACCESS = process.env.ACCESS_CODE, ORIG_OPENAI = process.env.OPENAI_API_KEY, ORIG_DEEPL = process.env.DEEPL_API_KEY;
async function withEnv(vars, fn) {
  const keys = ["USER_ACCOUNTS", "ACCESS_CODE", "OPENAI_API_KEY", "DEEPL_API_KEY"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  Object.assign(process.env, vars);
  try { return await fn(); } finally { for (const k of keys) delete process.env[k]; for (const k of keys) if (saved[k] !== undefined) process.env[k] = saved[k]; }
}
async function fresh() {
  const mod = await import(`../netlify/functions/_util.js?t=${Date.now()}-${Math.random()}`);
  return mod;
}
const ev = (code) => ({ headers: code === undefined ? {} : { "x-access-code": code } });

const ACCOUNTS = JSON.stringify([
  { id: "counselor_a", code: "aaaaaaaaaaaa", openaiKey: "sk-proj-A" },
  { id: "counselor_b", code: "bbbbbbbbbbbb", openaiKey: "sk-proj-B", deeplKey: "deepl-B" },
]);

await (async () => {
  await withEnv({ USER_ACCOUNTS: ACCOUNTS }, async () => {
    const { resolveAccount } = await fresh();
    const a = resolveAccount(ev("aaaaaaaaaaaa"), "openai");
    assert.equal(a.userId, "counselor_a"); assert.equal(a.openaiKey, "sk-proj-A"); assert.ok(!a.error);
    const b = resolveAccount(ev("bbbbbbbbbbbb"), "openai");
    assert.equal(b.openaiKey, "sk-proj-B");
    /* 코드가 틀리면 막힌다 — 다른 계정으로도, 무작위로도 통과하지 못한다 */
    assert.ok(resolveAccount(ev("wrong-code-here"), "openai").error, "wrong code must be rejected");
    assert.ok(resolveAccount(ev(), "openai").error, "missing code must be rejected");
    /* DeepL 키가 없는 사용자는 DeepL을 못 쓴다 */
    assert.ok(resolveAccount(ev("aaaaaaaaaaaa"), "deepl").error, "user without deeplKey must be blocked from DeepL");
    const bd = resolveAccount(ev("bbbbbbbbbbbb"), "deepl");
    assert.equal(bd.deeplKey, "deepl-B");
    /* USER_ACCOUNTS가 설정되면 예전 ACCESS_CODE/공용 키로 우회할 수 없다 */
  });
  await withEnv({ USER_ACCOUNTS: ACCOUNTS, ACCESS_CODE: "aaaaaaaaaaaa", OPENAI_API_KEY: "sk-legacy-shared" }, async () => {
    const { resolveAccount } = await fresh();
    const r = resolveAccount(ev("aaaaaaaaaaaa"), "openai");
    assert.equal(r.openaiKey, "sk-proj-A", "must resolve the per-user key, never the shared legacy key");
    assert.notEqual(r.openaiKey, "sk-legacy-shared");
  });
  /* 잘못된 설정은 요청을 막는다(엉뚱한 계정에 비용이 잡히는 것보다 안전) */
  for (const bad of ['not json', '[]', '[{"id":"a"}]', '[{"id":"a","code":"short","openaiKey":"k"}]',
    '[{"id":"a","code":"aaaaaaaaaaaa","openaiKey":"k"},{"id":"b","code":"aaaaaaaaaaaa","openaiKey":"k2"}]',
    '[{"id":"a","code":"aaaaaaaaaaaa","openaiKey":"k"},{"id":"a","code":"bbbbbbbbbbbb","openaiKey":"k2"}]']) {
    await withEnv({ USER_ACCOUNTS: bad }, async () => {
      const { resolveAccount } = await fresh();
      const r = resolveAccount(ev("aaaaaaaaaaaa"), "openai");
      assert.ok(r.error, `malformed USER_ACCOUNTS must block requests: ${bad}`);
      assert.equal(r.error.statusCode, 500);
    });
  }
  /* USER_ACCOUNTS가 없으면 예전 공용 코드 방식 그대로 동작한다(하위 호환) */
  await withEnv({ ACCESS_CODE: "shared-secret-code", OPENAI_API_KEY: "sk-shared" }, async () => {
    const { resolveAccount } = await fresh();
    const ok = resolveAccount(ev("shared-secret-code"), "openai");
    assert.equal(ok.openaiKey, "sk-shared"); assert.equal(ok.userId, null);
    assert.ok(resolveAccount(ev("wrong"), "openai").error);
  });
  await withEnv({}, async () => {
    const { resolveAccount } = await fresh();
    const open = resolveAccount(ev(), "openai");
    assert.ok(open.error, "no OPENAI_API_KEY set at all must still fail cleanly");
  });
})();

console.log("✓ USER_ACCOUNTS: 사람별 키 분리, 오코드 거부, DeepL 미허용 사용자 차단, 우회 불가, 설정 오류 시 차단, 예전 공용 코드 하위호환");
