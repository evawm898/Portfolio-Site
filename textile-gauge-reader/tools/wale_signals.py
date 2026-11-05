"""
Diagnostic (NOT a test, not in CI): does any signal the detector ALREADY computes tell a right
all-uncertain wale reading from a wrong one?

Background. After "Consensus status respects each area's own doubt" the app calls a wale axis
`confident` only when more than half of its areas are individually confident, which is almost
never: of the 67 app-path wale runs in which every area said uncertain, 56 were right and 11
wrong (README: "Consensus status respects each area's own doubt"). The wrong ones are two photos
-- teal (about -13%) and knit_02 (+12.5%). This tool asks whether restoring wale confidence is
possible WITHOUT new measurement: it collects every per-area wale signal the API returns over the
scorecard's run set (each fixture at the correct scale, six jitter scales, 0.5x and 2x) and tests
each for separation.

    python tools/wale_signals.py                  # collect (about 90 s) and analyse
    python tools/wale_signals.py --out runs.json  # keep the collected runs
    python tools/wale_signals.py --from runs.json # analyse a kept collection

What it reports, per feature: the run-level AUC (right > wrong), the ranges of each class, and a
per-photo AUC (the honest unit: the wrong class is two photos). Then the best near-separator's
threshold, and the leave-one-photo-out test of it.

CONCLUSION (recorded in README, "Wale confidence: no existing signal separates the bias"): none
does. Every feature's ranges overlap; the leg-slant signal (#338) names the selected candidate as
the stitch pitch on 100% of runs, right and wrong, because the remaining error is a continuous
~12-13% bias in the period estimate, not a half/double harmonic -- and #338, the loop-count
corroboration (#441) and the template-walk score were all built to catch harmonics, so they agree
with the biased reading. `orientation_dipole` is the one near-miss: a threshold of -0.049 keeps
zero wrong runs and 43 of 57 right ones, but it sits 0.003 from teal's own value, and held out of
the fit it lets teal through on 8 of 8 runs. With two wrong photos and ~30 features tested, one
feature separating by chance is expected (about 1 in 36 per feature at photo level).
"""
from __future__ import annotations

import collections
import json
import os
import sys
import warnings

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tests"))
sys.path.insert(0, os.path.join(HERE, ".."))

import app_path_scorecard as sc  # noqa: E402


def collect() -> list:
    """Every fixture with a wale truth x {correct scale, six jitter scales, 0.5x, 2x}, every proposal accepted."""
    from fastapi.testclient import TestClient
    from backend.main import app
    client = TestClient(app)
    runs = []
    for fx in sc.FIXTURES:
        if fx.true_wpi is None:
            continue
        specs = [("truth", sc.calibration_for_scale(fx.request_ppi), 1.0)]
        specs += [(f"jitter{j:+.3f}", sc.calibration_for_scale(fx.request_ppi * (1 + j)), 1.0) for j in sc.JITTERS]
        specs += [(f"res{s}", sc.calibration_for_scale(fx.request_ppi * s), s) for s in (0.5, 2.0)]
        for tag, cal, scale in specs:
            pr = client.post("/propose-rois", files=sc._files(fx.name, scale), data=cal).json()
            rois = [{"label": r["label"], "x": r["x"], "y": r["y"], "width": r["width"], "height": r["height"],
                     "source": "auto"} for r in (pr.get("rois") or [])]
            if not rois:
                continue
            body = client.post("/analyze-multi", files=sc._files(fx.name, scale),
                               data=dict(cal, rois_json=json.dumps(rois), orientation="vertical", structure="unknown")).json()
            if not body.get("success") or not body["wale"]["spacing_px"]:
                continue
            # error against the TRUE scale of the (resampled) photo, not the jittered typed one: the reading, not the calibration
            true_ppi = fx.px_per_inch_wale * (scale if tag.startswith("res") else 1.0)
            pred = true_ppi / body["wale"]["spacing_px"]
            errs = [(pred - fx.true_wpi) / fx.true_wpi * 100]
            if fx.alt_wpi:
                errs.append((pred - fx.alt_wpi) / fx.alt_wpi * 100)
            runs.append({"fixture": fx.name, "tag": tag, "err": min(errs, key=abs), "pred": pred,
                         "status": body["wale"]["status"], "consensus": body["multi_roi"]["wale_consensus"],
                         "areas": body["multi_roi"]["per_roi"]})
        print(fx.name, "collected", file=sys.stderr, flush=True)
    return runs


def _selected(area):
    cds = area["wale"]["candidate_details"]
    s = [c for c in cds if c["selected"]]
    return (s[0] if s else None), cds


def area_features(area: dict) -> dict:
    s, cds = _selected(area)
    f = {}
    if s is None:
        return f
    for k in ("evidence_score", "final_score", "autocorr_score", "support_2d", "structural_score", "patch_consensus",
              "harmonic_penalty", "phase_consistency", "alternating_phase_score", "template_match_score",
              "orientation_repeat", "orientation_contrast", "orientation_dipole", "fold_consistency"):
        if s.get(k) is not None:
            f["sel." + k] = s[k]
    others = [c["evidence_score"] for c in cds if not c["selected"] and c.get("evidence_score") is not None]
    if others and s.get("evidence_score") is not None:
        f["margin_evidence"] = s["evidence_score"] - max(others)
    if s.get("orientation_fundamental") is not None:
        f["orient_fundamental_is_selected"] = float(bool(s["orientation_fundamental"]))
    else:
        f["orient_named_nobody"] = 1.0
    f["selected_harmonic_1x"] = float(s["harmonic"] == "1x")
    f["area_confidence"] = area["wale"]["confidence"]
    f["roi_quality"] = area["quality_score"]
    f["count_corroborated"] = float(area["wale_source"] == "loop_count")
    f["count_conf"] = area["wale_count_confidence"]
    f["count_note_present"] = float(bool(area.get("wale_count_note")))
    ll = area.get("loop_lattice_debug")
    if ll:
        f["lattice_consistency"] = ll["lattice_consistency"]
        f["lattice_columns"] = float(ll["column_count"])
        f["lattice_direct_centers"] = float(ll["direct_center_count"])
        if ll.get("wale_spacing_px") and area["wale"].get("spacing_px"):
            f["count_vs_period_ratio"] = abs(ll["wale_spacing_px"] / area["wale"]["spacing_px"] - 1)
    return f


def run_features(run: dict) -> dict:
    per = [area_features(a) for a in run["areas"]]
    out = {}
    for k in set().union(*[p.keys() for p in per]):
        v = [p[k] for p in per if k in p]
        out[k] = sum(v) / len(v)
    sp, med = run["consensus"].get("regional_spread_px"), run["consensus"].get("regional_median_px")
    if sp is not None and med:
        out["spread_frac"] = sp / med
    return out


def auc(pos, neg) -> float:
    n = t = 0
    for p in pos:
        for q in neg:
            t += 1
            n += (p > q) + 0.5 * (p == q)
    return n / t


def analyse(runs: list) -> None:
    sub = [r for r in runs if all(a["wale"]["status"] == "uncertain" for a in r["areas"])]
    for r in sub:
        r["F"], r["right"] = run_features(r), abs(r["err"]) <= sc.CONFIDENT_WRONG_PCT
    right, wrong = [r for r in sub if r["right"]], [r for r in sub if not r["right"]]
    print(f"all-uncertain wale runs: {len(sub)} (right {len(right)}, wrong {len(wrong)}); "
          f"wrong photos {sorted(set(r['fixture'] for r in wrong))}; right photos {sorted(set(r['fixture'] for r in right))}")
    keys = sorted(set().union(*[r["F"].keys() for r in sub]))
    rows = []
    for k in keys:
        a = [r["F"][k] for r in right if k in r["F"]]
        b = [r["F"][k] for r in wrong if k in r["F"]]
        if len(a) < 5 or len(b) < 3:
            continue

        def photo_means(rs):
            d = collections.defaultdict(list)
            for r in rs:
                if k in r["F"]:
                    d[r["fixture"]].append(r["F"][k])
            return {f: sum(v) / len(v) for f, v in d.items()}

        pr, pw = photo_means(right), photo_means(wrong)
        rows.append((k, auc(a, b), min(a), max(a), min(b), max(b), auc(list(pr.values()), list(pw.values()))))
    print(f"\n{'feature':32s} runAUC(right>wrong)  right[min..max]   wrong[min..max]   photoAUC")
    for k, au, a0, a1, b0, b1, pa in sorted(rows, key=lambda x: -abs(x[1] - 0.5)):
        print(f"{k:32s} {au:5.2f}   [{a0:7.3f}..{a1:7.3f}]  [{b0:7.3f}..{b1:7.3f}]   {pa:4.2f}")
    # the near-separator, honestly
    k = "sel.orientation_dipole"
    if any(k in r["F"] for r in sub):
        print(f"\n{k}: 'confident' iff value < t, the largest t that keeps zero wrong runs, then leave-one-photo-out")
        best = None
        for t in sorted(set(r["F"][k] for r in sub)):
            conf = [r for r in sub if r["F"][k] < t]
            if conf and all(r["right"] for r in conf):
                best = (t, len(conf))
        print(f"  all photos: t = {best[0]:+.4f} keeps {best[1]} of {len(right)} right runs, 0 wrong" if best else "  no zero-wrong threshold")
        by_photo = collections.defaultdict(list)
        for r in sub:
            by_photo[r["fixture"]].append(r)
        for p in sorted(by_photo):
            train = [r for r in sub if r["fixture"] != p]
            t = None
            for v in sorted(set(r["F"][k] for r in train)):
                tr = [r for r in train if r["F"][k] < v]
                if tr and all(r["right"] for r in tr):
                    t = v
            if t is None:
                print(f"  hold out {p:13s}: no zero-wrong threshold on the rest")
                continue
            conf = [r for r in by_photo[p] if r["F"][k] < t]
            print(f"  hold out {p:13s}: t = {t:+.4f} -> confident on {len(conf)}/{len(by_photo[p])} of its runs, "
                  f"{sum(not r['right'] for r in conf)} of them wrong")


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--from" in args:
        data = json.load(open(args[args.index("--from") + 1]))
    else:
        data = collect()
        if "--out" in args:
            json.dump(data, open(args[args.index("--out") + 1], "w"))
    analyse(data)
