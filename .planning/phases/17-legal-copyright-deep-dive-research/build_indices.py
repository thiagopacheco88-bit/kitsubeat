"""Build the Pre-Monetization Legal Review index and Phase 18 Requirements Checklist
and append them to 17-ANALYSIS.md. Idempotent-ish: only run once per consolidation;
re-running appends duplicates."""
import re
import sys
import io
from pathlib import Path
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

p = Path("17-ANALYSIS.md")
text = p.read_text(encoding="utf-8")

# Guard: skip if already appended
if "<a id=\"lawyer-index\"></a>" in text:
    print("Indices already present — aborting to avoid duplicate append.")
    sys.exit(0)

lines = text.splitlines()

section_re = re.compile(r'<a id="section-(\d)"')
current = None
line_section = []
for ln in lines:
    m = section_re.search(ln)
    if m:
        current = m.group(1)
    line_section.append(current)

# ---- LAWYER MARKERS ----
marker_re = re.compile(r"\{#lawyer-([a-z]+-\d+)\}")
definition_re = re.compile(r"\U0001F6A9\s*LAWYER-REQUIRED")

lawyer_defs = {}
for i, ln in enumerate(lines):
    for mm in marker_re.finditer(ln):
        lid = mm.group(1)
        sec = line_section[i] or "?"
        is_def = bool(definition_re.search(ln))
        if lid not in lawyer_defs:
            lawyer_defs[lid] = (ln.strip(), sec, is_def)
        elif is_def and not lawyer_defs[lid][2]:
            lawyer_defs[lid] = (ln.strip(), sec, True)


def clean_concern(line, lid):
    idx = line.find("{#lawyer-" + lid + "}")
    tail = line[idx + len("{#lawyer-" + lid + "}"):].strip() if idx >= 0 else line
    tail = re.sub(r"^[\s\u2014\-:\.]+", "", tail)
    if not tail:
        head = line[:idx].strip() if idx >= 0 else ""
        head = re.sub(r"\U0001F6A9\s*LAWYER-REQUIRED$", "", head).strip()
        head = re.sub(r"\U0001F6A9.*$", "", head).strip()
        tail = head
    tail = re.sub(r"^[\*\-]+\s*", "", tail)
    tail = re.sub(r"^\*\*[^*]+\*\*\s*[\u2014:]?\s*", "", tail)
    sent = re.split(r"(?<=[\.?!])\s+", tail)[0] if tail else ""
    sent = sent.strip()
    if len(sent) > 280:
        sent = sent[:277] + "..."
    sent = sent.replace("|", "\\|")
    return sent


urgency_map = {
    "priv-03": "Pre-launch",
    "priv-05": "Pre-launch",
    "priv-06": "Pre-launch",
    "priv-09": "Pre-launch",
    "minors-01": "Pre-launch",
    "minors-02": "Pre-launch",
    "ai-01": "Pre-launch",
    "ai-02": "Pre-launch",
    "eaa-01": "Pre-launch",
    "priv-01": "Pre-launch",
    "priv-04": "Pre-launch",
    "priv-07": "Pre-launch",
    "priv-08": "Pre-launch",
    "priv-02": "Pre-launch",
    "lyrics-01": "Pre-launch",
    "yt-01": "Pre-monetization",
    "cons-01": "Pre-monetization",
    "cons-02": "Monitor",
    "tax-01": "Pre-monetization",
    "anime-01": "Pre-Phase-21",
    "ai-03": "Monitor",
}

topic_map = {
    "yt": "YouTube embed ToS",
    "lyrics": "Lyrics licensing & WhisperX derivative",
    "anime": "Anime clip liability (Phase 21 gate)",
    "priv": "Privacy & data protection",
    "cons": "Consumer law / withdrawal rights",
    "tax": "Tax & indirect tax",
    "ai": "EU AI Act",
    "eaa": "Accessibility / EAA applicability",
    "minors": "Age gating / AADC",
}

urgency_rank = {"Pre-launch": 1, "Pre-monetization": 2, "Pre-Phase-21": 3, "Monitor": 4}

out = []
out.append("")
out.append('<a id="lawyer-index"></a>')
out.append("## Pre-Monetization Legal Review")
out.append("")
out.append("**Use this section as the lawyer-brief when counsel is engaged before monetization, before any \U0001F534-rated feature ships, or before Phase 21 (anime clips) is planned. Every item below is a question where this document identified a boundary this author should not cross without legal advice.**")
out.append("")
out.append("| ID | Topic | Concern (one-sentence) | Section | Urgency |")
out.append("|----|-------|------------------------|---------|---------|")

sorted_ids = sorted(lawyer_defs.keys(), key=lambda k: (urgency_rank.get(urgency_map.get(k, "Monitor"), 9), k))

for lid in sorted_ids:
    line, sec, is_def = lawyer_defs[lid]
    concern = clean_concern(line, lid)
    topic_prefix = lid.rsplit("-", 1)[0]
    topic = topic_map.get(topic_prefix, topic_prefix)
    urgency = urgency_map.get(lid, "Monitor")
    out.append("| {#lawyer-" + lid + "} | " + topic + " | " + concern + " | [\u00a7" + sec + "](#section-" + sec + ") | " + urgency + " |")

out.append("")
out.append("### How to brief a lawyer")
out.append("")
out.append("Take this table plus the cited sections plus the document's `scope_summary` front-matter. A 1-hour consultation can realistically resolve 3\u20135 rows depending on complexity. **Priority order:** Pre-launch items before Phase 18 ships \u2192 Pre-monetization items before first paid transaction \u2192 Pre-Phase-21 before v4.0 anime-clip planning \u2192 Monitor items during routine legal check-ins.")
out.append("")
out.append("---")
out.append("")

# ---- PHASE 18 CHECKLIST ----
req_re = re.compile(r"(REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+)")

req_defs = {}
for i, ln in enumerate(lines):
    sec = line_section[i] or "?"
    for m in req_re.finditer(ln):
        rid = m.group(1)
        if rid in req_defs:
            continue
        stripped = ln.strip()
        s = re.sub(r"^[\-\*\|]+\s*", "", stripped)
        if stripped.startswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            req_idx = -1
            for ci, c in enumerate(cells):
                if rid in c:
                    req_idx = ci
                    break
            if req_idx >= 0 and req_idx + 1 < len(cells):
                obligation = cells[req_idx + 1]
            else:
                obligation = " | ".join(cells)
            obligation = re.sub(r"\*\*|`", "", obligation).strip()
        else:
            s = re.sub(r"^" + re.escape(rid) + r"[:\.\s\u2014\-]+", "", s)
            s = re.sub(r"^\*\*" + re.escape(rid) + r"\*\*[:\.\s\u2014\-]*", "", s)
            obligation = s
        obligation = re.sub(r"\s+", " ", obligation)
        obligation = obligation.replace("**", "").replace("`", "").strip()
        if len(obligation) > 200:
            obligation = obligation[:197] + "..."
        obligation = obligation.replace("|", "\\|") or "(see section)"
        req_defs[rid] = (obligation, sec)


def categorize(rid):
    parts = rid.split("-")
    top = parts[1]
    if top == "PRIV":
        return "Privacy & Data Protection"
    if top == "CONS":
        return "Consumer Law"
    if top == "TAX":
        return "Tax (activate at monetization)"
    if top == "AI":
        return "EU AI Act Disclosure"
    if top == "A11Y":
        return "Accessibility (WCAG 2.1 AA)"
    if top == "MINORS":
        return "Age Gating & Minor-User Protection"
    return "Other"


groups = defaultdict(list)
for rid in sorted(req_defs.keys()):
    groups[categorize(rid)].append(rid)


def activate_when(rid):
    if rid.startswith("REQ-TAX-"):
        if "STRIPE" in rid:
            return "At monetization"
        if rid.startswith("REQ-TAX-US"):
            return "At scale trigger"
        if rid.startswith("REQ-TAX-UK"):
            return "At scale trigger"
        return "At monetization"
    if rid.startswith("REQ-CONS-"):
        return "At monetization"
    return "Phase 18 launch"


def risk_for(rid):
    if "BREACH" in rid:
        return "\U0001F534"
    return "\U0001F7E1"


out.append("")
out.append('<a id="phase-18-checklist"></a>')
out.append("## Phase 18 Requirements Checklist")
out.append("")
out.append("**Phase 18 implements against this list line-by-line. Each item has an ID, the obligation text (as emitted by the source section), the source section anchor, a risk rating, and an activation trigger.**")
out.append("")
out.append("> **Note on Copyright (\u00a71):** The Copyright & Content-Rights section emits lawyer-flag markers rather than prescriptive `REQ-*` obligations, because copyright compliance is \"don't cross these boundaries\" rather than \"implement these controls.\" Phase 18 obligations for copyright are captured implicitly: keep YouTube embed behavior conformant (see \u00a71.1), do not host or remix lyrics substrate beyond what LRCLIB and WhisperX produce (see \u00a71.2), and gate Phase 21 anime-clip work on `{#lawyer-anime-01}` resolution.")
out.append("")

count_activate = defaultdict(int)
count_risk = defaultdict(int)

group_order_map = {
    "Privacy & Data Protection": "Group 2 \u2014 Privacy & Data Protection",
    "Consumer Law": "Group 3 \u2014 Consumer Law",
    "Tax (activate at monetization)": "Group 4 \u2014 Tax (activate at monetization)",
    "EU AI Act Disclosure": "Group 5 \u2014 EU AI Act Disclosure",
    "Accessibility (WCAG 2.1 AA)": "Group 6 \u2014 Accessibility (WCAG 2.1 AA)",
    "Age Gating & Minor-User Protection": "Group 7 \u2014 Age Gating & Minor-User Protection",
}

out.append("#### Group 1 \u2014 Copyright obligations (lawyer-flag only \u2014 see note above)")
out.append("")
out.append("| # | REQ ID | Obligation | Source | Rating | Activate when |")
out.append("|---|--------|------------|--------|--------|---------------|")
out.append("| \u2014 | (no prescriptive REQs) | Copyright compliance is negative-boundary (see lawyer-flags yt-01, lyrics-01, anime-01) | [\u00a71](#section-1) | \U0001F534 | Continuously |")
out.append("")

global_idx = 0
for cat in ["Privacy & Data Protection", "Consumer Law", "Tax (activate at monetization)", "EU AI Act Disclosure", "Accessibility (WCAG 2.1 AA)", "Age Gating & Minor-User Protection"]:
    ids_in_cat = groups.get(cat, [])
    out.append("#### " + group_order_map[cat] + " (" + str(len(ids_in_cat)) + " items)")
    out.append("")
    out.append("| # | REQ ID | Obligation | Source | Rating | Activate when |")
    out.append("|---|--------|------------|--------|--------|---------------|")
    for rid in ids_in_cat:
        global_idx += 1
        obligation, sec = req_defs[rid]
        rating = risk_for(rid)
        activ = activate_when(rid)
        count_activate[activ] += 1
        count_risk[rating] += 1
        out.append("| " + str(global_idx) + " | " + rid + " | " + obligation + " | [\u00a7" + sec + "](#section-" + sec + ") | " + rating + " | " + activ + " |")
    out.append("")

total = sum(len(v) for v in groups.values())
out.append("### Coverage summary")
out.append("")
out.append("**" + str(total) + " total REQ-* requirements** extracted from the five analysis sections.")
out.append("")
out.append("- Activation: **" + str(count_activate["Phase 18 launch"]) + " at Phase 18 launch**, **" + str(count_activate["At monetization"]) + " at monetization**, **" + str(count_activate["At scale trigger"]) + " at scale trigger**.")
out.append("- Risk: **" + str(count_risk["\U0001F534"]) + " \U0001F534 (red)**, **" + str(count_risk["\U0001F7E1"]) + " \U0001F7E1 (amber)**, **0 \U0001F7E2 (green)**.")
out.append("- Red-rated items also appear in the [Pre-Monetization Legal Review](#lawyer-index) and are gated on legal advice.")
out.append("- Category breakdown: " + ", ".join(cat + "=" + str(len(groups[cat])) for cat in groups))
out.append("")
out.append("### Consumption protocol")
out.append("")
out.append("1. When Phase 18 is planned via `/gsd:plan-phase 18`, this checklist IS the `requirements:` frontmatter input \u2014 every REQ ID should appear in the Phase 18 plan.")
out.append("2. Refund template publication (\u00a73.2) and Stripe Tax config (\u00a73.6) are deliberately created in Phase 18 but activated in Phase 19 / v4.0 Phase 22.")
out.append("3. Items marked \"At scale trigger\" (US sales tax registrations, EU Art. 27 representative if the small-scale exemption fails, UK VAT threshold) require runtime monitoring rather than Phase 18 implementation \u2014 Phase 18 delivers the monitoring hooks, not the registrations.")
out.append("")
out.append("---")
out.append("")
out.append("_End of 17-ANALYSIS.md. Phase 17 deliverable._")
out.append("")

with p.open("a", encoding="utf-8") as f:
    f.write("\n".join(out))

print("Appended lawyer index (" + str(len(lawyer_defs)) + " markers) + Phase 18 checklist (" + str(total) + " REQ IDs) to 17-ANALYSIS.md")
print("Categories: " + ", ".join(k + "=" + str(len(v)) for k, v in groups.items()))
print("Activation: " + ", ".join(k + "=" + str(v) for k, v in count_activate.items()))
print("Risk: " + ", ".join(k + "=" + str(v) for k, v in count_risk.items()))
