# -*- coding: utf-8 -*-
"""端到端验证：真实抽取文本 → 真实 prompt → 真实 AI → 结构化 JSON。
复刻 ResumeParserServiceImpl 的调用参数（temperature 0.1、max_tokens 8192、json_object）。"""
import json, os, sys, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
for line in open(os.path.join(ROOT, ".env"), encoding="utf-8"):
    m = re.match(r"^([A-Z_]+)=(.*)$", line.strip())
    if m:
        env[m.group(1)] = m.group(2)

# --- 解析 prompt YAML（key: | 块风格，两段多行字符串） ---
raw = open(os.path.join(ROOT, "config", "resume-parse-prompt.yml"), encoding="utf-8").read()
def grab(key):
    m = re.search(rf"^{key}:\s*\|[^\n]*\n((?:[ \t]*\S[^\n]*\n|[ \t]*\n)*)", raw, re.M)
    block = m.group(1)
    ind = min((len(l) - len(l.lstrip()) for l in block.splitlines() if l.strip()), default=0)
    return "\n".join(l[ind:] if l.strip() else "" for l in block.splitlines()).rstrip()
system_prompt = grab("systemPrompt")
parse_prompt = grab("parsePrompt")

def call(text):
    user = parse_prompt.replace("{{resumeText}}", text)
    body = json.dumps({
        "model": env["AI_ANALYSIS_MODEL"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user},
        ],
        "temperature": 0.1,
        "max_tokens": 8192,
        "response_format": {"type": "json_object"},
    })
    proc = subprocess.run(
        ["curl", "-sS", "--max-time", "180",
         env["AI_BASE_URL"].rstrip("/") + "/chat/completions",
         "-H", "Authorization: Bearer " + env["AI_API_KEY"],
         "-H", "Content-Type: application/json",
         "-d", body],
        capture_output=True, text=True)
    resp = json.loads(proc.stdout)
    return resp["choices"][0]["message"]["content"], resp["choices"][0].get("finish_reason")

for pdf_name in sys.argv[1:]:
    text = open(f"/tmp/extract-{pdf_name}.txt", encoding="utf-8").read()
    content, finish = call(text)
    print(f"\n########## {pdf_name} (finish_reason={finish}) ##########")
    try:
        data = json.loads(content)
        open(f"/tmp/ai-out-{pdf_name}.json", "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, indent=1))
        print("basicInfo:", json.dumps(data.get("basicInfo"), ensure_ascii=False))
        print(json.dumps(data, ensure_ascii=False, indent=1)[:3000])
        # 关键字段检查
        print("---- 检查 ----")
        print("educations:", [(e.get("school"), e.get("department"), e.get("startDate"), e.get("endDate")) for e in data.get("educations", [])])
        print("experiences:", [(e.get("company"), e.get("position"), e.get("employmentType"), e.get("startDate"), e.get("endDate")) for e in data.get("experiences", [])])
        print("awards:", data.get("awards"))
        print("papers:", data.get("papers"))
        print("researches:", data.get("researches"))
        print("skills:", data.get("skills"))
        bi = data.get("basicInfo") or {}
        print("basicInfo.targetCity:", bi.get("targetCity"), "| hometown:", bi.get("hometown"), "| desiredPosition:", bi.get("desiredPosition"))
    except Exception as e:
        print("JSON PARSE FAIL:", e)
        print(content[:1500])
