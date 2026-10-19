#!/usr/bin/env python3
"""DossierLens command-line helper (standard library only; PDF reading uses pypdf when installed).

Subcommands
  extract FILE...  [--numbered] [--split]     text from .docx/.pdf/.txt/.md/.zip; line numbers; split a combined packet
  check   FILE     [--type T] [--jd FILE] [--json]   deterministic checks (writing, AI artifacts, uncited claims,
                                               acronyms, tortured phrases, citation cross-check, job-ad echo)
  clean   FILE     -o OUT                      strip hidden characters, chat markers, AI-link tags, stray Markdown
  budget  CONFIG.json [--csv OUT] | --example  grant budget by year with F&A on MTDC and a split by aim
  docx    FILE     -o OUT.docx [--title T] [--original ORIG]   write a Word file; [brackets] highlighted;
                                               with --original, changes appear as Word tracked changes

Parts of the checks are adapted from Academic Research Skills by Cheng-I Wu
(https://github.com/Imbad0202/academic-research-skills, CC BY-NC 4.0): the uncited-assertion rule (D4-c),
the acronym rules, the title-similarity method, the tortured-phrase rule format, the post-2024 preprint heuristic
and the AI-typical word list. They are simplified here. See NOTICE.md.
"""
from __future__ import annotations
import argparse, csv, difflib, io, json, math, os, re, string, sys, unicodedata, zipfile
from xml.etree import ElementTree as ET

# ---------------------------------------------------------------- text extraction
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
LIG = {"ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st"}

def _docx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    paras = []
    for p in root.iter(W + "p"):
        parts = []
        for node in p.iter():
            if node.tag == W + "t" and node.text:
                parts.append(node.text)
            elif node.tag == W + "tab":
                parts.append("\t")
            elif node.tag in (W + "br", W + "cr"):
                parts.append("\n")
        paras.append("".join(parts))
    return "\n".join(paras)

def _pdf_text(path_or_bytes) -> str:
    try:
        from pypdf import PdfReader  # optional
    except ImportError:
        sys.exit("Reading PDFs needs pypdf: run  pip install pypdf  (or give the .docx, or paste the text).")
    reader = PdfReader(io.BytesIO(path_or_bytes) if isinstance(path_or_bytes, bytes) else path_or_bytes)
    pages = []
    for page in reader.pages:
        t = page.extract_text() or ""
        lines = [l for l in t.splitlines() if not re.fullmatch(r"\s*(page\s*)?\d{1,3}(\s*(of|/)\s*\d{1,3})?\s*", l, re.I)]
        pages.append("\n".join(lines))
    text = "\n".join(pages)
    text = re.sub(r"([A-Za-z]+)-\n([a-z]+)", lambda m: m.group(1) + ("-" if re.search(r"\b%s-%s\b" % (m.group(1), m.group(2)), text) else "") + m.group(2), text)
    text = re.sub(r"\b(?:[A-Za-z] ){3,}[A-Za-z]\b", lambda m: m.group(0).replace(" ", ""), text)
    return text

def read_any(path: str) -> list[tuple[str, str]]:
    """Return [(name, text)] — a .zip yields one entry per supported file inside."""
    low = path.lower()
    if low.endswith(".zip"):
        out = []
        with zipfile.ZipFile(path) as z:
            for n in sorted(z.namelist()):
                b = os.path.basename(n)
                if n.endswith("/") or "__MACOSX" in n or b.startswith((".", "~$")):
                    continue
                data = z.read(n)
                if b.lower().endswith(".docx"):
                    out.append((b, _docx_text(data)))
                elif b.lower().endswith(".pdf"):
                    out.append((b, _pdf_text(data)))
                elif b.lower().endswith((".txt", ".md")):
                    out.append((b, data.decode("utf-8", "replace")))
        return out
    if low.endswith(".docx"):
        return [(os.path.basename(path), _docx_text(open(path, "rb").read()))]
    if low.endswith(".pdf"):
        return [(os.path.basename(path), _pdf_text(path))]
    if low.endswith(".doc"):
        sys.exit(f"{path}: old .doc files are not supported. Save as .docx or PDF.")
    return [(os.path.basename(path), open(path, encoding="utf-8", errors="replace").read())]

def fix_text(t: str) -> str:
    return "".join(LIG.get(c, c) for c in t)

# ---------------------------------------------------------------- packet splitting (headings)
HEADS = [
    ("skip", r"\bcurriculum vitae\b|^\s*(cv|vita)\b|\b(diversity|dei|inclusion|equity|belonging)\b.*\b(statement|contributions?)\b"),
    ("extension", r"\bextension\b.*\b(philosophy|statement|plan|program|vision|approach)\b"),
    ("outreach", r"\b(outreach|service|engagement)\b.*\b(statement|philosophy|plan)\b|\b(outreach and service|service and outreach)\b"),
    ("teaching", r"\bteaching\b.*\b(statement|philosophy|plan|interests)\b|\bstatement of teaching\b|\bphilosophy of teaching\b"),
    ("research", r"\bresearch\b.*\b(statement|plan|interests|vision|program|proposal|agenda)\b|\bstatement of research\b"),
    ("cover", r"\bcover letter\b|\bletter of (application|interest)\b"),
]

def head_type(line: str):
    l = line.strip().lower()
    if not l or len(l) > 110 or len(l.split()) > 14 or (re.search(r"[.;,]$", l) and not l.endswith(":")):
        return None
    for t, rx in HEADS:
        if re.search(rx, l):
            return t
    return None

def split_packet(name: str, text: str):
    secs, cur = [], {"type": None, "heading": "", "lines": []}
    for ln in [x.strip() for x in text.splitlines() if x.strip()]:
        h = head_type(ln)
        if h:
            if h == cur["type"]:
                continue
            if cur["lines"]:
                secs.append(cur)
            cur = {"type": h, "heading": ln, "lines": []}
            continue
        if re.match(r"dear\b", ln, re.I) and cur["type"] != "cover":
            if cur["type"]:
                secs.append(cur)
                cur = {"type": "cover", "heading": ln, "lines": []}
            else:
                cur.update(type="cover", heading=ln)
        cur["lines"].append(ln)
    if cur["lines"]:
        secs.append(cur)
    return [{"source": name, "type": s["type"] or "unrecognized", "heading": s["heading"], "text": "\n".join(s["lines"])} for s in secs]

# ---------------------------------------------------------------- sentence splitting
ABBR = re.compile(r"\b(e\.g|i\.e|et al|Dr|Mr|Mrs|Ms|Prof|vs|Fig|Figs|No|approx|St|Jr|Sr|cf|ca|Inc|Ltd|Co|Dept|Univ|U\.S|Ph\.D|M\.S|B\.S|M\.Sc|B\.Sc)\.")

def sentences(text: str):
    out = []
    for pi, para in enumerate([p.strip() for p in text.splitlines() if p.strip()]):
        prot = ABBR.sub(lambda m: m.group(0).replace(".", "․"), re.sub(r"\s+", " ", para))
        for s in re.split(r"(?<=[.!?])[\"”’')\]]?\s+(?=[\"“‘(\[]?[A-Z0-9])", prot):
            s = s.replace("․", ".").strip()
            if s:
                out.append({"p": pi, "t": s})
    return out

def words(t: str):
    return re.findall(r"[a-z][a-z'’-]*[a-z]|[a-z]", t.lower())

STOP = set("a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours out over own same she should so some such than that the their theirs them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours within across using use used via including include includes well may might must one two three new also however thus therefore etc".split())
stem = lambda w: re.sub(r"(ing|ed|es|s|ly)$", "", re.sub(r"['’]s$", "", w))[:8]

# ---------------------------------------------------------------- writing checks
HYPE = ["revolutionize", "revolutionary", "transformative", "groundbreaking", "unprecedented", "paradigm shift", "game-changing", "cutting-edge", "world-class", "first-ever", "eliminate", "guarantee", "will ensure"]
VAGUE = ["various", "several", "many aspects", "things", "a lot of", "very", "really", "numerous", "passionate", "passion"]

def writing_checks(text: str, jd: str | None):
    sents = sentences(text); ws = words(text); n = len(ws)
    content = [w for w in ws if len(w) > 3 and w not in STOP]
    counts = {}
    for w in content:
        k = stem(w); counts.setdefault(k, [w, 0]); counts[k][1] += 1
    thr = max(4, round(n / 180))
    overused = sorted([(w, c) for w, c in counts.values() if c >= thr], key=lambda x: -x[1])[:14]
    doubled = [m.group(0) for m in re.finditer(r"\b([A-Za-z]+)\s+\1\b", text, re.I) if m.group(1).lower() not in ("had", "that")]
    openers = {}
    for s in sents:
        m = re.match(r"[“\"(]?([A-Za-z']+)", s["t"])
        if m:
            openers[m.group(1).lower()] = openers.get(m.group(1).lower(), 0) + 1
    rep_open = [(k, v) for k, v in openers.items() if v >= 3 and v / max(1, len(sents)) >= .15]
    long_s = [i + 1 for i, s in enumerate(sents) if len(words(s["t"])) > 38]
    low = text.lower()
    out = {"words": n, "sentences": len(sents), "overused": overused, "threshold": thr, "doubled": doubled,
           "repeated_openers": rep_open, "long_sentences": long_s, "hype": [h for h in HYPE if h in low],
           "vague": [v for v in VAGUE if re.search(r"\b" + v.replace(" ", r"\s+") + r"\b", low)],
           "i_share": round(ws.count("i") / max(1, n) * 100, 1)}
    if jd:
        generic = set("candidate candidates position applications application applicants university department required preferred qualifications include including ability experience demonstrated successful responsibilities duties appointment tenure track assistant professor faculty submit please".split())
        jw = [w for w in words(jd) if len(w) > 3 and w not in STOP and w not in generic]
        jc = {}
        for w in jw:
            jc.setdefault(stem(w), [w, 0]); jc[stem(w)][1] += 1
        terms = sorted(jc.values(), key=lambda x: -x[1])[:30]
        have = {stem(w) for w in content}
        ad4 = set()
        jtoks = words(jd)
        for i in range(len(jtoks) - 3):
            g = jtoks[i:i + 4]
            if sum(1 for w in g if w not in STOP and len(w) > 3) >= 2:
                ad4.add(" ".join(g))
        echo = sorted({" ".join(ws[i:i + 4]) for i in range(len(ws) - 3) if " ".join(ws[i:i + 4]) in ad4})
        out["job_ad"] = {"terms_used": [t for t, _ in terms if stem(t) in have], "terms_missing": [t for t, _ in terms if stem(t) not in have], "copied_phrases": echo}
    return out

# ---------------------------------------------------------------- AI copy-paste artifacts + AI-typical wording
INVIS = {"​": "zero-width space", "‌": "zero-width non-joiner", "‍": "zero-width joiner", "⁠": "word joiner", "﻿": "zero-width no-break space",
         " ": "narrow no-break space", "­": "soft hyphen", " ": "thin space", "‎": "left-to-right mark", "‏": "right-to-left mark"}
ARTIFACTS = [
    (r":?contentReference\[oaicite:\d+\]\{index=\d+\}", "ChatGPT citation placeholder (oaicite)"),
    (r"【\d+(?::\d+)?†[^】]{0,60}】", "ChatGPT source marker"),
    (r"\b(?:cite)?turn\d+(?:search|news|view|fetch|file)\d+\b", "ChatGPT search citation token"),
    (r"[?&]utm_source=(?:chatgpt\.com|openai|perplexity(?:\.ai)?|copilot\.com|claude\.ai|gemini)[^\s)\]>\"]*", "Link copied from an AI chat (utm_source)"),
    (r"\bAs an AI(?: language model)?\b", "Chatbot disclaimer"),
    (r"\bI hope this helps\b|\bLet me know if you(?:'d| would)? like\b", "Chatbot closing line"),
    (r"\bHere(?:'s| is) (?:a|an|the|your) (?:revised|polished|refined|improved|draft|rewritten|updated)\b", "Chatbot hand-off phrase"),
    (r"(?m)^[ \t]{0,3}#{1,6}[ \t]+\S", "Markdown heading left in text"),
    (r"\*\*[^*\n]{1,80}\*\*", "Markdown bold left in text"),
]
# from ARS academic-paper/references/writing_quality_check.md
FLAGGED = {"delve": "examine, investigate", "tapestry": "network, interplay", "landscape": "field, context", "pivotal": "important, central", "crucial": "essential",
           "foster": "promote, develop", "showcase": "demonstrate, present", "testament": "evidence", "navigate": "manage, address", "leverage": "use, apply",
           "realm": "field, area", "embark": "begin", "underscore": "emphasize", "multifaceted": "complex", "nuanced": "subtle", "comprehensive": "thorough",
           "robust": "reliable, rigorous", "intricate": "complex", "cornerstone": "foundation", "paradigm": "framework", "synergy": "combined effect",
           "holistic": "integrated", "streamline": "simplify", "cutting-edge": "recent, advanced", "groundbreaking": "novel"}
THROAT = ["in the realm of", "it's important to note that", "it is important to note that", "it is worth mentioning that", "in today's rapidly evolving",
          "serves as a testament to", "it goes without saying", "in order to", "it should be noted that", "when it comes to", "at the end of the day"]

def ai_scan(text: str):
    low = text.lower(); n = max(1, len(words(text)))
    invis = [{"char": name, "count": text.count(ch)} for ch, name in INVIS.items() if ch in text]
    arts = []
    for rx, label in ARTIFACTS:
        m = re.findall(rx, text, re.I)
        if m:
            arts.append({"label": label, "count": len(m), "example": (m[0] if isinstance(m[0], str) else m[0][0])[:60]})
    flagged = [{"term": t, "count": len(re.findall(r"\b" + re.escape(t) + r"\w*", text, re.I)), "try": a} for t, a in FLAGGED.items() if re.search(r"\b" + re.escape(t), text, re.I)]
    return {"hidden_characters": invis, "nbsp": text.count(" "), "chat_artifacts": arts, "ai_typical_terms": flagged,
            "throat_clearing": [t for t in THROAT if t in low], "em_dash_per_1000": round(text.count("—") / n * 1000, 1)}

def clean_text(t: str) -> str:
    t = re.sub(r":?contentReference\[oaicite:\d+\]\{index=\d+\}", "", t)
    t = re.sub(r"【\d+(?::\d+)?†[^】]{0,60}】", "", t)
    t = re.sub(r"\b(?:cite)?turn\d+(?:search|news|view|fetch|file)\d+\b", "", t)
    t = re.sub(r"([?&])utm_source=[^\s&)\]>\"]*&?", lambda m: m.group(1), t)
    t = re.sub(r"[?&](?=[\s)\]>\"]|$)", "", t)
    t = re.sub("[​‌‍⁠﻿­‎‏]", "", t)
    t = re.sub("[   ]", " ", t)
    t = re.sub(r"\*\*([^*\n]{1,80})\*\*", r"\1", t)
    t = re.sub(r"(?m)^[ \t]{0,3}#{1,6}[ \t]+", "", t)
    return re.sub(r"[ \t]{2,}", " ", t)

# ---------------------------------------------------------------- ARS-adapted integrity checks
EMP_VERBS = {"showed", "demonstrated", "observed", "proved", "confirmed"}
FUZZY = {"most", "several", "two-thirds"}
DEF_PHRASES = ("refers to", "is defined as", "we define", "for the purposes of")
RE_NUM = re.compile(r"\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s+of\s+\d+\b|\b\d+(?:\.\d+)*\b")
RE_CUE = re.compile(r"(?:section|chapter|figure|table|fig\.|tbl\.|step|appendix|aim|§)\s*$", re.I)
RE_CITE = re.compile(r"\[\d{1,3}(?:\s*[,–\-]\s*\d{1,3})*\]|\([A-Z][A-Za-z'’\-]+[^()]{0,60}?(?:1[89]|20)\d{2}[a-z]?\)|[A-Z][A-Za-z'’\-]+(?:\s+et\s+al\.?)?\s+\((?:1[89]|20)\d{2}[a-z]?\)")

def uncited(sentence: str):
    """ARS rule D4-c: quantifier or empirical verb, no citation in the sentence, not definitional."""
    low = sentence.lower()
    if any(p in low for p in DEF_PHRASES) or RE_CITE.search(sentence):
        return None
    hits = []
    for m in RE_NUM.finditer(sentence):
        t = m.group(0)
        if "%" not in t and " of " not in t:
            left = sentence[max(0, m.start() - 24):m.start()]
            if re.fullmatch(r"(19|20)\d{2}", t) or re.fullmatch(r"\d+(?:\.\d+){2,}", t) or RE_CUE.search(left) or (re.fullmatch(r"\d+\.\d+", t) and re.search(r"v\s*$", left, re.I)):
                continue
        hits.append((m.start(), t))
    for m in re.finditer(r"[A-Za-z][A-Za-z-]*", sentence):
        if m.group(0).lower() in EMP_VERBS | FUZZY:
            hits.append((m.start(), m.group(0).lower()))
    return list(dict.fromkeys(t for _, t in sorted(hits))) or None

ACR_ALLOW = set("AIDS DNA HIV IQ RNA mRNA EU UK UN US USA BA BSc MA MD MSc PhD AM PM DOI ISBN ISSN ORCID PDF URL GHz GPa MHz MPa SD SE CI II III IV".split())

def _spells(words_before, acr):
    L = re.sub(r"[^A-Z]", "", acr.rstrip("s").upper())
    if len(L) < 2:
        return False
    for start in range(len(words_before) - 1, max(-1, len(words_before) - len(L) * 2 - 4), -1):
        run = words_before[start:]
        if not run or run[0][0].upper() != L[0]:
            continue
        k = 0
        for c in "".join(w[0].upper() for w in run):
            if k < len(L) and c == L[k]:
                k += 1
        if k == len(L):
            return True
    return False

def acronyms(text: str):
    """Simplified ARS check_acronyms.py: undefined / defined_after_use / defined_again (body scope)."""
    defs, uses = {}, {}
    for m in re.finditer(r"\b([A-Z][A-Za-z]*[A-Z][A-Za-z0-9]*s?|[A-Z]{2,}s?)\b", text):
        a = m.group(1)[:-1] if m.group(1).endswith("s") and m.group(1)[:-1].isupper() else m.group(1)
        if a in ACR_ALLOW or not (2 <= len(a) <= 8):
            continue
        is_def = False
        if text[max(0, m.start() - 1):m.start()] == "(" and text[m.end():m.end() + 1] == ")":
            pre = text[max(0, m.start() - 160):m.start() - 1].split("\n")[-1]
            if not re.search(r"(?:e\.g\.,?|see|cf\.|such as|including|for example)\s*$", pre, re.I) and _spells(re.findall(r"[A-Za-z][A-Za-z-]*", pre), a):
                is_def = True
        (defs if is_def else uses).setdefault(a, []).append(m.start())
    out = []
    for a in sorted(set(defs) | set(uses)):
        d, u = defs.get(a, []), uses.get(a, [])
        line = lambda pos: text.count("\n", 0, pos) + 1
        if not d:
            out.append({"acronym": a, "rule": "undefined", "line": line(u[0]), "message": f"{a} is used {len(u)}x but never defined."})
        else:
            if u and u[0] < d[0]:
                out.append({"acronym": a, "rule": "defined_after_use", "line": line(u[0]), "message": f"{a} is used before its definition."})
            if len(d) > 1:
                out.append({"acronym": a, "rule": "defined_again", "line": line(d[1]), "message": f"{a} is defined {len(d)} times."})
    return out

# Tortured-phrase starter list: examples published in Cabanac, Labbé & Magazinov (2021), arXiv:2107.06751
TORTURED = {"counterfeit consciousness": "artificial intelligence", "man-made consciousness": "artificial intelligence", "profound learning": "deep learning",
            "profound neural organization": "deep neural network", "neural organization": "neural network", "colossal information": "big data", "huge information": "big data",
            "irregular woodland": "random forest", "arbitrary woodland": "random forest", "choice tree": "decision tree", "backing vector machine": "support vector machine",
            "uphold vector machine": "support vector machine", "straight relapse": "linear regression", "strategic relapse": "logistic regression",
            "characteristic language handling": "natural language processing", "pc vision": "computer vision", "cloud figuring": "cloud computing",
            "web of things": "internet of things", "remote organization": "wireless network", "flag to commotion": "signal to noise", "mean square blunder": "mean square error",
            "subterranean insect state": "ant colony", "bosom malignant growth": "breast cancer", "bosom peril": "breast cancer", "kidney disappointment": "kidney failure",
            "parcel misfortune": "packet loss", "vitality utilization": "energy consumption", "fake neural organization": "artificial neural network",
            "hereditary calculation": "genetic algorithm", "molecule swarm enhancement": "particle swarm optimization", "inquiry motor": "search engine"}

def tortured(text: str):
    toks = " " + " ".join(re.findall(r"[a-z0-9][a-z0-9'-]*", unicodedata.normalize("NFKC", text).casefold())) + " "
    return [{"phrase": p, "usually": e, "count": toks.count(" " + p + " ")} for p, e in TORTURED.items() if (" " + p + " ") in toks]

def norm_title(s: str) -> str:
    s = re.sub(r"\b(?:[A-Za-z]\.){2,}", lambda m: m.group(0).replace(".", ""), s or "")
    s = s.translate(str.maketrans({c: " " for c in string.punctuation})).lower()
    return re.sub(r"\s+", " ", s).strip()

def title_similarity(a: str, b: str) -> float:  # ARS scripts/_text_similarity.py method
    return difflib.SequenceMatcher(None, norm_title(a), norm_title(b)).ratio()

PREPRINT = re.compile(r"\b(arxiv|biorxiv|medrxiv|ssrn|research square|preprints\.org|chemrxiv|eartharxiv|osf preprints|socarxiv|psyarxiv|techrxiv)\b", re.I)
REF_HEAD = re.compile(r"^\s*(references(?: cited)?|bibliography|works cited|literature cited|citations)\s*:?\s*$", re.I | re.M)

def parse_refs(text: str):
    heads = list(REF_HEAD.finditer(text))
    if not heads:
        return text, []
    body, tail = text[:heads[-1].start()], text[heads[-1].end():]
    start = re.compile(r"^(\[\d+\]|\d{1,3}[.)]\s|[A-Z][A-Za-z'’\-]+(?:\s[A-Z][a-z]+)?,\s*(?:[A-Z]\.|[A-Z][a-z]+)|[A-Z][A-Za-z'’\-]+\s[A-Z]{1,3}[,.])")
    refs = []
    for l in [x.strip() for x in tail.splitlines() if x.strip()]:
        if not refs or start.match(l) or len(refs[-1]) > 400:
            refs.append(l)
        else:
            refs[-1] += " " + l
    out = []
    for i, r in enumerate([r for r in refs if len(r) > 15][:200], 1):
        num = re.match(r"^\[?(\d{1,3})[\].)]", r)
        clean = re.sub(r"^\[?\d{1,3}[\].)]\s*", "", r)
        ym = re.search(r"\b(1[89]\d{2}|20\d{2})[a-z]?\b", r)
        tm = re.search(r"\(?(?:1[89]\d{2}|20\d{2})[a-z]?\)?[.,]\s*([^.?!]{8,250}[.?!])", clean)
        doi = re.search(r"\b10\.\d{4,9}/[^\s\"<>]+", r)
        out.append({"n": i, "num": int(num.group(1)) if num else i, "text": r, "year": int(ym.group(1)) if ym else None,
                    "surname": (re.match(r"^([A-Z][A-Za-z'’\-]+)", clean) or [None, ""])[1] if re.match(r"^([A-Z][A-Za-z'’\-]+)", clean) else "",
                    "title": (tm.group(1) if tm else clean[:200]).rstrip("."), "doi": doi.group(0).rstrip(".,;)]") if doi else ""})
    return body, out

def citation_check(text: str):
    body, refs = parse_refs(text)
    if not refs:
        return {"found_reference_list": False}
    cites = []
    for m in re.finditer(r"\[(\d{1,3}(?:\s*[,–\-]\s*\d{1,3})*)\]", body):
        nums = []
        for p in re.split(r"\s*,\s*", m.group(1)):
            r = [int(x) for x in re.split(r"\s*[–-]\s*", p)]
            nums += list(range(r[0], r[1] + 1)) if len(r) == 2 and 0 <= r[1] - r[0] < 60 else [r[0]]
        cites.append(("num", m.group(0), nums, None, None, m.start()))
    name = r"([A-Z][A-Za-z'’\-]+)(?:\s+et\s+al\.?|\s+(?:and|&)\s+[A-Z][A-Za-z'’\-]+)?"
    for m in re.finditer(r"\(([^()]{3,400}?)\)", body):
        for part in m.group(1).split(";"):
            mm = re.search(name + r",?\s+((?:1[89]|20)\d{2})([a-z]?)", part)
            if mm and mm.group(1) not in ("Figure", "Table", "Section", "See", "In"):
                cites.append(("ay", part.strip(), None, mm.group(1), int(mm.group(2)), m.start()))
    for m in re.finditer(r"\b" + name + r"\s+\(((?:1[89]|20)\d{2})[a-z]?\)", body):
        cites.append(("ay", m.group(0), None, m.group(1), int(m.group(2)), m.start()))
    used, missing = set(), {}
    for kind, label, nums, sur, yr, pos in cites:
        if kind == "num":
            for n in nums:
                r = next((x for x in refs if x["num"] == n), None)
                if r: used.add(r["n"])
                else: missing.setdefault(f"[{n}]", body.count("\n", 0, pos) + 1)
        else:
            r = next((x for x in refs if x["year"] == yr and sur.lower() in re.sub(r"^\[?\d{1,3}[\].)]\s*", "", x["text"])[:90].lower()), None)
            if r: used.add(r["n"])
            else: missing.setdefault(label, body.count("\n", 0, pos) + 1)
    flags = {}
    now = 2026
    for r in refs:
        f = []
        if not r["year"]: f.append("no year")
        elif r["year"] > now + 1: f.append(f"year {r['year']} is in the future")
        if r["doi"] and re.match(r"^10\.(1234|1000|5555|0000|9999)/", r["doi"]): f.append("placeholder-style DOI")
        if r["year"] and r["year"] >= 2024 and PREPRINT.search(r["text"]): f.append("post-2024 preprint: confirm it was published")
        if re.search(r"utm_source=(chatgpt|openai|perplexity|copilot|claude|gemini)", r["text"], re.I): f.append("link copied from an AI chat")
        for o in refs:
            if o["n"] < r["n"] and len(r["title"]) > 15 and title_similarity(o["title"], r["title"]) >= 0.9:
                f.append(f"near-duplicate of #{o['n']}"); break
        if cites and r["n"] not in used: f.append("never cited in the text")
        if f: flags[r["n"]] = f
    return {"found_reference_list": True, "references": len(refs), "in_text_citations": len(cites), "references_cited": len(used),
            "cited_but_not_listed": [{"citation": k, "line": v} for k, v in missing.items()],
            "listed_but_never_cited": [{"n": r["n"], "reference": r["text"][:160]} for r in refs if cites and r["n"] not in used],
            "reference_warnings": {str(k): v for k, v in flags.items()},
            "verify_links": {str(r["n"]): f"https://search.crossref.org/search/works?q={re.sub(r'[^A-Za-z0-9]+', '+', r['title'][:150])}" for r in refs}}

def run_checks(text: str, jd: str | None, kind: str):
    body, _ = parse_refs(text)
    res = {"writing": writing_checks(body, jd), "ai_scan": ai_scan(text),
           "uncited_claims": [{"line": i + 1, "sentence": s["t"][:220], "triggers": t} for i, s in enumerate(sentences(body)) if (t := uncited(s["t"]))],
           "acronyms": acronyms(body), "tortured_phrases": tortured(text)}
    if kind in ("refs", "grant", "research") or REF_HEAD.search(text):
        res["citations"] = citation_check(text)
    return res

# ---------------------------------------------------------------- budget
BUDGET_EXAMPLE = {"years": 3, "escalation_pct": 3, "fa_rate_pct": 50, "cap": 750000,
                  "fringe_pct": {"faculty": 28, "postdoc": 30, "grad": 10, "undergrad": 2, "staff": 35},
                  "personnel": [{"role": "PI summer salary", "type": "faculty", "count": 1, "rate": 12200, "unit": "month", "amount": 1, "from_year": 1, "to_year": 3},
                                {"role": "Graduate research assistant", "type": "grad", "count": 2, "rate": 30000, "unit": "year", "amount": 1, "from_year": 1, "to_year": 3, "tuition": 15000},
                                {"role": "Undergraduate researchers", "type": "undergrad", "count": 2, "rate": 15, "unit": "hour", "amount": 400, "from_year": 1, "to_year": 3}],
                  "equipment": [{"item": "Gas chromatograph", "link": "", "unit_cost": 45000, "qty": 1, "year": 1}, {"item": "Sensor kits", "link": "", "unit_cost": 250, "qty": 6, "year": 1}],
                  "other_per_year": {"supplies": 6000, "trips": 2, "cost_per_trip": 2200, "publication": 3000, "participant_support": 0, "computing": 1500, "other": 0},
                  "subawards": [], "aims": [{"name": "Aim 1", "pct": 40}, {"name": "Aim 2", "pct": 35}, {"name": "Aim 3", "pct": 25}]}

def budget(cfg: dict):
    Y = int(cfg.get("years", 3)); g = 1 + cfg.get("escalation_pct", 0) / 100
    rows = {}
    def add(k, y, v): rows.setdefault(k, [0.0] * Y)[y] += v
    for p in cfg.get("personnel", []):
        for y in range(Y):
            if not (p.get("from_year", 1) <= y + 1 <= p.get("to_year", Y)): continue
            sal = p.get("count", 0) * p.get("rate", 0) * p.get("amount", 0) * g ** y
            add("Salaries & wages", y, sal); add("Fringe benefits", y, sal * cfg.get("fringe_pct", {}).get(p.get("type"), 0) / 100)
            if p.get("type") == "grad": add("Tuition remission", y, p.get("count", 0) * p.get("tuition", 0) * g ** y)
    for e in cfg.get("equipment", []):
        y = min(Y, max(1, e.get("year", 1))) - 1
        add("Equipment (>= $5,000/unit)" if e.get("unit_cost", 0) >= 5000 else "Materials & supplies", y, e.get("unit_cost", 0) * e.get("qty", 0))
    o = cfg.get("other_per_year", {})
    for y in range(Y):
        f = g ** y
        add("Materials & supplies", y, o.get("supplies", 0) * f); add("Travel", y, o.get("trips", 0) * o.get("cost_per_trip", 0) * f)
        add("Publication & dissemination", y, o.get("publication", 0) * f); add("Participant support", y, o.get("participant_support", 0))
        add("Computing & services", y, o.get("computing", 0) * f); add("Other direct", y, o.get("other", 0) * f)
    sub_fa = [0.0] * Y
    for s in cfg.get("subawards", []):
        left = 25000
        for y in range(Y):
            v = s.get("amount", 0) / Y; add("Subawards", y, v); x = min(left, v); sub_fa[y] += x; left -= x
    direct = [sum(r[y] for r in rows.values()) for y in range(Y)]
    excl = [sum(rows.get(k, [0] * Y)[y] for k in ("Equipment (>= $5,000/unit)", "Tuition remission", "Participant support", "Subawards")) - sub_fa[y] for y in range(Y)]
    mtdc = [direct[y] - excl[y] for y in range(Y)]; fa = [m * cfg.get("fa_rate_pct", 0) / 100 for m in mtdc]
    total = [direct[y] + fa[y] for y in range(Y)]; T = sum(total)
    return {"rows": rows, "direct": direct, "mtdc": mtdc, "fa": fa, "total": total, "grand_total": T,
            "aims": [{"name": a["name"], "pct": a["pct"], "amount": T * a["pct"] / 100} for a in cfg.get("aims", [])],
            "over_cap": max(0, T - cfg["cap"]) if cfg.get("cap") else 0}

def budget_markdown(cfg, b):
    Y = len(b["total"]); m = lambda v: f"${v:,.0f}"
    lines = ["| Category | " + " | ".join(f"Y{y+1}" for y in range(Y)) + " | Total |", "|---|" + "---:|" * (Y + 1)]
    for k, a in b["rows"].items():
        if any(a): lines.append(f"| {k} | " + " | ".join(m(v) for v in a) + f" | {m(sum(a))} |")
    for k, a in (("**Total direct**", b["direct"]), ("MTDC base", b["mtdc"]), (f"F&A ({cfg.get('fa_rate_pct', 0)}%)", b["fa"]), ("**TOTAL**", b["total"])):
        lines.append(f"| {k} | " + " | ".join(m(v) for v in a) + f" | {m(sum(a))} |")
    lines += ["", "| Aim | Share | Amount |", "|---|---:|---:|"] + [f"| {a['name']} | {a['pct']}% | {m(a['amount'])} |" for a in b["aims"]]
    if b["over_cap"]: lines += ["", f"**Over the cap by {m(b['over_cap'])}.**"]
    return "\n".join(lines)

# ---------------------------------------------------------------- docx writer
def _tokens(text: str):
    out = []
    for i, p in enumerate([p.strip() for p in text.splitlines() if p.strip()]):
        if i:
            out.append("\n")
        out += [t for t in re.split(r"(\s+)", p) if t]
    return out

def _tracked_body(base: str, text: str, run, esc) -> str:
    """Word tracked changes: unchanged words as normal runs, insertions in <w:ins>, deletions in <w:del>."""
    a, b = _tokens(base), _tokens(text)
    ops = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal":
            ops += [("=", t) for t in a[i1:i2]]
        else:
            ops += [("-", t) for t in a[i1:i2]] + [("+", t) for t in b[j1:j2]]
    paras, cur = [], []
    for t, v in ops:
        if v == "\n":
            if t != "-":
                paras.append(cur); cur = []
            continue
        if cur and cur[-1][0] == t:
            cur[-1][1] += v
        else:
            cur.append([t, v])
    paras.append(cur)
    date = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rid = [0]
    def nid():
        rid[0] += 1; return rid[0]
    def tidy(segs):  # absorb tiny unchanged pieces between changes; one deletion then one insertion per stretch
        out, d, ins, open_ = [], "", "", False
        for i, (t, v) in enumerate(segs):
            if t == "=":
                nxt = segs[i + 1] if i + 1 < len(segs) else None
                if open_ and nxt and nxt[0] != "=" and len(v.split()) <= 2 and len(v) <= 14:
                    d += v; ins += v; continue
                if d: out.append(["-", d])
                if ins: out.append(["+", ins])
                d, ins, open_ = "", "", False; out.append([t, v]); continue
            open_ = True
            if t == "-": d += v
            else: ins += v
        if d: out.append(["-", d])
        if ins: out.append(["+", ins])
        return out
    xml = []
    for segs in [tidy(p) for p in paras if p]:
        final = "".join(v for t, v in segs if t != "-").strip()
        head = len(final) < 90 and not re.search(r"[.,;:]$", final) and bool(head_type(final) or (re.fullmatch(r"[A-Z][A-Za-z ,&/-]{2,60}", final) and len(final.split()) <= 8))
        inner = []
        for t, v in segs:
            if t == "-":
                inner.append(f'<w:del w:id="{nid()}" w:author="DossierLens" w:date="{date}"><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>{"<w:b/>" if head else ""}<w:sz w:val="22"/></w:rPr><w:delText xml:space="preserve">{esc(v)}</w:delText></w:r></w:del>')
                continue
            runs = "".join(run(p, head, i % 2 == 1) for i, p in enumerate(re.split(r"(\[[^\]\n]{1,80}\])", v)) if p)
            inner.append(f'<w:ins w:id="{nid()}" w:author="DossierLens" w:date="{date}">{runs}</w:ins>' if t == "+" else runs)
        xml.append(f'<w:p><w:pPr><w:spacing w:after="{80 if head else 160}"/></w:pPr>{"".join(inner)}</w:p>')
    return "".join(xml)

def write_docx(text: str, out: str, title: str | None = None, base: str | None = None):
    esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    def run(t, b=False, hl=False):
        return (f'<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>{"<w:b/>" if b else ""}{"<w:highlight w:val=\"yellow\"/>" if hl else ""}'
                f'<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">{esc(t)}</w:t></w:r>')
    def para(line):
        head = len(line) < 90 and not re.search(r"[.,;:]$", line) and (head_type(line) or (re.fullmatch(r"[A-Z][A-Za-z ,&/-]{2,60}", line) and len(line.split()) <= 8))
        parts = re.split(r"(\[[^\]\n]{1,80}\])", line)
        return f'<w:p><w:pPr><w:spacing w:after="{80 if head else 160}"/></w:pPr>' + "".join(run(p, bool(head), i % 2 == 1) for i, p in enumerate(parts) if p) + "</w:p>"
    tracked = bool(base and base.strip() and base.strip() != text.strip())
    if tracked:
        body = (f'<w:p>{run(title, True)}</w:p>' if title else "") + _tracked_body(base, text, run, esc)
    else:
        body = (f'<w:p>{run(title, True)}</w:p>' if title else "") + "".join(para(l.strip()) for l in text.splitlines() if l.strip())
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>')
        z.writestr("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        z.writestr("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>')
        z.writestr("word/settings.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + ("<w:trackRevisions/>" if tracked else "") + "</w:settings>")
        z.writestr("word/document.xml", f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>')

# ---------------------------------------------------------------- CLI
def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(prog="dossierlens", description="DossierLens helper: extract, check, clean, budget, docx.")
    sp = ap.add_subparsers(dest="cmd", required=True)
    e = sp.add_parser("extract"); e.add_argument("files", nargs="+"); e.add_argument("--numbered", action="store_true"); e.add_argument("--split", action="store_true")
    c = sp.add_parser("check"); c.add_argument("file"); c.add_argument("--type", default="auto", choices=["auto", "faculty", "resume", "grant", "refs", "research"]); c.add_argument("--jd"); c.add_argument("--json", action="store_true")
    cl = sp.add_parser("clean"); cl.add_argument("file"); cl.add_argument("-o", "--out", required=True)
    b = sp.add_parser("budget"); b.add_argument("config", nargs="?"); b.add_argument("--csv"); b.add_argument("--example", action="store_true")
    d = sp.add_parser("docx"); d.add_argument("file"); d.add_argument("-o", "--out", required=True); d.add_argument("--title"); d.add_argument("--original", help="original file: accepted changes become Word tracked changes")
    a = ap.parse_args(argv)

    if a.cmd == "extract":
        for f in a.files:
            for name, text in read_any(f):
                text = fix_text(text)
                if a.split:
                    print(json.dumps(split_packet(name, text), ensure_ascii=False, indent=1)); continue
                print(f"===== {name} =====")
                if a.numbered:
                    for i, line in enumerate([l for l in text.splitlines() if l.strip()], 1):
                        print(f"{i:4d}  {line}")
                else:
                    print(text)
    elif a.cmd == "check":
        text = fix_text("\n".join(t for _, t in read_any(a.file)))
        jd = fix_text("\n".join(t for _, t in read_any(a.jd))) if a.jd else None
        res = run_checks(text, jd, a.type)
        print(json.dumps(res, ensure_ascii=False, indent=1) if a.json else _report(res))
    elif a.cmd == "clean":
        text = "\n".join(t for _, t in read_any(a.file))
        cleaned = clean_text(text)
        (write_docx(cleaned, a.out) if a.out.lower().endswith(".docx") else open(a.out, "w", encoding="utf-8").write(cleaned))
        print(f"Cleaned text written to {a.out}")
    elif a.cmd == "budget":
        if a.example or not a.config:
            print(json.dumps(BUDGET_EXAMPLE, indent=1)); return
        cfg = json.load(open(a.config, encoding="utf-8")); res = budget(cfg)
        print(budget_markdown(cfg, res))
        if a.csv:
            with open(a.csv, "w", newline="", encoding="utf-8") as fh:
                w = csv.writer(fh); Y = len(res["total"])
                w.writerow(["Category"] + [f"Year {y+1}" for y in range(Y)] + ["Total"])
                for k, arr in list(res["rows"].items()) + [("Total direct", res["direct"]), ("MTDC", res["mtdc"]), ("F&A", res["fa"]), ("TOTAL", res["total"])]:
                    w.writerow([k] + [round(v) for v in arr] + [round(sum(arr))])
            print(f"\nCSV written to {a.csv}")
    elif a.cmd == "docx":
        base = fix_text("\n".join(t for _, t in read_any(a.original))) if a.original else None
        write_docx(fix_text("\n".join(t for _, t in read_any(a.file))), a.out, a.title, base)
        print(f"Word file written to {a.out}" + (" with tracked changes against " + a.original if base else ""))

def _report(r):
    w = r["writing"]; s = r["ai_scan"]; out = [f"## Instant checks\n\n{w['words']} words, {w['sentences']} sentences."]
    if w["overused"]: out.append("**Overused words:** " + ", ".join(f"{x} ({n})" for x, n in w["overused"]))
    if w["doubled"]: out.append("**Doubled words:** " + ", ".join(w["doubled"]))
    if w["repeated_openers"]: out.append("**Repeated sentence openers:** " + ", ".join(f"“{k}…” ×{v}" for k, v in w["repeated_openers"]))
    if w["long_sentences"]: out.append("**Sentences over 38 words:** #" + ", #".join(map(str, w["long_sentences"])))
    if w["hype"]: out.append("**Hype / overpromising words:** " + ", ".join(w["hype"]))
    if w["vague"]: out.append("**Vague words:** " + ", ".join(w["vague"]))
    if "job_ad" in w:
        j = w["job_ad"]; out.append(f"**Job-ad terms used:** {len(j['terms_used'])} · **missing:** " + ", ".join(j["terms_missing"][:14]))
        if j["copied_phrases"]: out.append("**Phrases copied from the ad:** " + "; ".join(f"“{p}”" for p in j["copied_phrases"][:10]))
    out.append("\n## AI and copy-paste signals")
    for h in s["hidden_characters"]: out.append(f"- {h['count']} × {h['char']}")
    for x in s["chat_artifacts"]: out.append(f"- {x['count']} × {x['label']} (e.g. “{x['example']}”)")
    if s["ai_typical_terms"]: out.append("- AI-typical words: " + ", ".join(f"{t['term']} ({t['count']}; try {t['try']})" for t in s["ai_typical_terms"]))
    if s["throat_clearing"]: out.append("- Filler openers: " + ", ".join(s["throat_clearing"]))
    out.append(f"- Em dashes per 1,000 words: {s['em_dash_per_1000']}")
    out.append("\n## Integrity checks (adapted from Academic Research Skills)")
    out.append(f"**Claims without a citation:** {len(r['uncited_claims'])}")
    for u in r["uncited_claims"][:12]: out.append(f"- sentence {u['line']}: “{u['sentence'][:140]}” ({', '.join(u['triggers'])})")
    out.append(f"**Acronym issues:** {len(r['acronyms'])}")
    for x in r["acronyms"][:14]: out.append(f"- line {x['line']}: {x['message']}")
    out.append(f"**Tortured phrases:** {len(r['tortured_phrases'])}")
    for t in r["tortured_phrases"]: out.append(f"- “{t['phrase']}” → usually “{t['usually']}”")
    c = r.get("citations")
    if c:
        if not c["found_reference_list"]: out.append("\n## Citations\nNo “References” heading found.")
        else:
            out.append(f"\n## Citations\n{c['in_text_citations']} in-text citations · {c['references_cited']} of {c['references']} references cited.")
            out.append("**Cited but not in References:** " + (", ".join(f"{m['citation']} (line {m['line']})" for m in c["cited_but_not_listed"]) or "none"))
            out.append("**In References but never cited:** " + (", ".join(f"#{m['n']}" for m in c["listed_but_never_cited"]) or "none"))
            for n, f in c["reference_warnings"].items(): out.append(f"- #{n}: {'; '.join(f)}")
    return "\n".join(out)

if __name__ == "__main__":
    main()
