/* glossary/glossary.js(번역어를 얹은 최종 목록)를 JSON으로 출력한다 — tools/glossary_xlsx.py가 사용 */
import { GLOSSARY } from "../glossary/glossary.js";
process.stdout.write(JSON.stringify(GLOSSARY));
