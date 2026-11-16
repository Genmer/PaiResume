#!/usr/bin/env python3
# 字段级命中率评测：后端真实抽取文本 + 与后端一致的 GLM 参数 → 逐字段对比 ground truth
# 用法: python3 score_accuracy.py   (依赖 /tmp/score/text-*.txt 已由 DumpText 生成)
# ground truth 与 gen_pdfs.py 同源 —— 生成脚本即标准答案（合成语料的唯一真值来源）
import json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
TEXT_DIR = "/tmp/score"
OUT_DIR = "/tmp/score"

GROUND_TRUTH = {
    "resume-single-column": {
        "basicInfo": {"name": "张伟明", "phone": "13800138000", "location": "上海", "jobIntention": "后端开发工程师"},
        "educations": [{"school": "浙江大学", "degree": "本科"}],
        "experiences": [{"company": "阿里巴巴", "employmentType": "internship"}, {"company": "字节跳动", "employmentType": "internship"}],
        "projects": [{"projectName": "高并发秒杀系统"}],
        "awards": ["数学建模竞赛", "ACM", "软件设计师"],
        "skills": ["Java", "Spring", "MySQL", "Redis"],
    },
    "resume-two-column": {
        "basicInfo": {"name": "李思远", "phone": "13911223344", "location": "北京", "jobIntention": "数据分析师"},
        "educations": [{"school": "中国人民大学", "degree": "本科"}],
        "experiences": [{"company": "美团", "employmentType": "internship"}, {"company": "京东", "employmentType": "internship"}],
        "projects": [{"projectName": "城市交通流量预测系统"}],
        "awards": ["CET-6", "FRM"],
        "skills": ["SQL", "Python", "Pandas", "Tableau", "Hive", "Spark"],
    },
    "resume-table": {
        "basicInfo": {"name": "王建国", "phone": "13666889999", "jobIntention": "前端开发工程师"},
        "educations": [{"school": "武汉大学", "department": "计算机学院"}, {"school": "复旦大学", "department": "计算机科学技术学院"}],
        "experiences": [{"company": "拼多多", "employmentType": "full-time"}, {"company": "小红书", "employmentType": "internship"}],
        "skills": ["React", "TypeScript"],
    },
    "resume-three-column": {
        "basicInfo": {"name": "周雨桐", "phone": "13911112222", "location": "深圳"},
        "skills": ["React", "Vue", "Node", "Java", "Docker", "K8s"],
        "projects": [{"projectName": "简历生成器"}, {"projectName": "开源博客引擎"}, {"projectName": "AI 聚合搜索"}],
    },
    "resume-right-sidebar": {
        "basicInfo": {"name": "吴天", "phone": "13666667777", "jobIntention": "数据分析师"},
        "educations": [{"school": "武大"}],
        "experiences": [{"company": "字节跳动", "employmentType": "internship"}],
        "projects": [{"projectName": "电商用户流失预警模型"}],
        "skills": ["SQL", "Python", "Tableau"],
    },
    "resume-multipage-header": {
        "basicInfo": {"name": "陈晓", "jobIntention": "后端开发工程师"},
        "educations": [{"school": "华中科技大学"}],
        "experiences": [{"company": "美团", "employmentType": "internship"}],
        "projects": [{"projectName": "智能简历解析系统"}],
    },
    "resume-scanned": {"__expect_reject__": True},
}


def load_env():
    env = {}
    with open(os.path.join(HERE, "..", ".env")) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def grab_yaml_block(path, key):
    """从 resume-parse-prompt.yml 抓多行块（容忍空行），去掉 2 空格缩进"""
    src = open(path, encoding="utf-8").read()
    m = re.search(key + r":[^\n]*\n((?:[ \t]*\S[^\n]*\n|[ \t]*\n)*)", src)
    if not m:
        raise RuntimeError(f"yaml block {key} not found")
    lines = []
    for ln in m.group(1).splitlines():
        lines.append("" if ln.strip() == "" else re.sub(r"^ {2}", "", ln))
    return "\n".join(lines).rstrip() + "\n"


def call_glm(env, system_prompt, user_prompt):
    payload = {
        "model": env.get("AI_ANALYSIS_MODEL", "GLM-5.1"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 8192,
        "response_format": {"type": "json_object"},
    }
    cmd = ["curl", "-s", "-X", "POST", env["AI_BASE_URL"] + "/chat/completions",
           "-H", "Authorization: Bearer " + env["AI_API_KEY"],
           "-H", "Content-Type: application/json",
           "-d", json.dumps(payload, ensure_ascii=False)]
    resp = json.loads(subprocess.run(cmd, capture_output=True, text=True).stdout)
    return resp["choices"][0]["message"]["content"]


def clean_json_payload(raw):
    s = raw.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z]*\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    first, last = s.find("{"), s.rfind("}")
    return s[first:last + 1] if first >= 0 and last > first else s


def normalize_phone(v):
    return re.sub(r"[^\d]", "", str(v or ""))


def match_list(pred_items, key, want):
    """want 出现在任一元素对应字段（包含匹配，短串 2 字以上可反向）"""
    for it in pred_items or []:
        v = str((it or {}).get(key) or "")
        if v and (want in v or (len(v) >= 2 and v in want)):
            return True
    return False


def collect_hits(pred, truth):
    """返回 [(字段描述, 是否命中)]，标量精确/包含匹配，电话先归一"""
    res = []

    bi_p = pred.get("basicInfo") or {}
    for k, want in (truth.get("basicInfo") or {}).items():
        got = bi_p.get(k)
        if k == "phone":
            res.append((f"basicInfo.phone[{want}]", normalize_phone(got) == normalize_phone(want)))
        elif k == "jobIntention":
            res.append((f"basicInfo.jobIntention[{want}]",
                        want in str(got or "") or str(got or "") in want and len(str(got or "")) >= 2))
        else:
            res.append((f"basicInfo.{k}[{want}]", str(got or "").strip() == str(want).strip()))

    for sec, name_key in [("educations", "school"), ("experiences", "company"), ("projects", "projectName")]:
        for item in truth.get(sec, []):
            want = item[name_key]
            res.append((f"{sec}.{name_key}[{want}]", match_list(pred.get(sec), name_key, want)))
            for extra in ("degree", "department"):
                if extra in item:
                    res.append((f"{sec}.{extra}[{item[extra]}]", match_list(pred.get(sec), extra, item[extra])))
            if "employmentType" in item:
                hit = False
                for it in pred.get(sec) or []:
                    if item["company"] in str(it.get("company") or ""):
                        got = str(it.get("employmentType") or "").strip().lower()
                        hit = (got == item["employmentType"])
                        break
                res.append((f"{sec}.employmentType[{item['company']}={item['employmentType']}]", hit))

    for aw in truth.get("awards", []):
        res.append((f"awards[{aw}]", match_list(pred.get("awards"), "awardName", aw)))

    flat = []
    for cat in pred.get("skills") or []:
        if isinstance(cat, dict):
            flat.append(str(cat.get("name") or ""))
            flat.extend(str(x) for x in (cat.get("items") or []))
        else:
            flat.append(str(cat))
    blob = "\n".join(flat)
    for sk in truth.get("skills", []):
        res.append((f"skills[{sk}]", sk in blob))

    return res


def flatten_truth(truth):
    fields = [f"basicInfo.{k}" for k in (truth.get("basicInfo") or {})]
    for sec in ("educations", "experiences", "projects"):
        for item in truth.get(sec, []):
            fields.extend(f"{sec}.{k}" for k in item)
    fields += [f"awards[{a}]" for a in truth.get("awards", [])]
    fields += [f"skills[{s}]" for s in truth.get("skills", [])]
    return fields


def main():
    env = load_env()
    yml = os.path.join(HERE, "..", "config", "resume-parse-prompt.yml")
    system_prompt = grab_yaml_block(yml, "systemPrompt")
    parse_prompt = grab_yaml_block(yml, "parsePrompt")

    all_results, per_pdf = [], {}
    for name in sorted(GROUND_TRUTH):
        truth = GROUND_TRUTH[name]
        text = open(os.path.join(TEXT_DIR, f"text-{name}.txt"), encoding="utf-8").read()
        text = "\n".join(ln for ln in text.splitlines() if "Commons Logging" not in ln)

        if truth.get("__expect_reject__"):
            near_empty = len(re.sub(r"\s", "", text)) < 30
            per_pdf[name] = (1, 1, [] if near_empty else ["<扫描件未拒收!>"])
            all_results.append((f"{name}:扫描件拒收", near_empty))
            continue

        raw = call_glm(env, system_prompt, parse_prompt.replace("{{resumeText}}", text))
        try:
            pred = json.loads(clean_json_payload(raw))
            results = collect_hits(pred, truth)
        except Exception as e:
            results = [(f, False) for f in flatten_truth(truth)]
            results.append((f"<JSON解析失败: {e}>", False))
            pred = {"__raw__": raw[:500]}

        ok = sum(1 for _, hit in results if hit)
        misses = [f for f, hit in results if not hit]
        per_pdf[name] = (ok, len(results), misses)
        all_results.extend((f"{name}:{f}", hit) for f, hit in results)
        json.dump(pred, open(os.path.join(OUT_DIR, f"pred-{name}.json"), "w"), ensure_ascii=False, indent=2)

    print("=" * 76)
    total_ok = total_n = 0
    for name, (ok, n, misses) in per_pdf.items():
        total_ok += ok
        total_n += n
        line = f"{name:30s} {ok:2d}/{n:2d}  {ok / n * 100:5.1f}%"
        if misses:
            line += "  miss: " + "; ".join(misses[:8])
        print(line)
    print("-" * 76)
    print(f"TOTAL: {total_ok}/{total_n} = {total_ok / total_n * 100:.1f}%")
    print("=" * 76)


if __name__ == "__main__":
    main()
