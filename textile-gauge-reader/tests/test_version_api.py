"""
Tests for GET /version -- added so "what commit is actually deployed" is
answerable from outside without guessing. See README's "How to tell what's
actually deployed" section for why this exists: three separate live-site
bug reports (a frontend crash, a missing field, a 405 on a route that
exists in the repo) all traced back to the same unprovable suspicion that
the deployed backend was running older code than `main`, with nothing
short of a Render dashboard login to confirm it.

This suite can't reach the real Render env vars from a test run (nothing
here IS the Render deployment), so it exercises both branches of
_detect_deployed_commit() directly: the RENDER_GIT_COMMIT/RENDER_GIT_BRANCH
env-var path (monkeypatched, since that's what proves the endpoint reads
them correctly) and the git-fallback path (the real one active in this
test environment, since no RENDER_* vars are set here -- this also proves
the fallback actually resolves to a real, non-None commit rather than
silently going to "unavailable").
"""
import importlib

import pytest
from fastapi.testclient import TestClient


def _reload_main():
    """
    _DEPLOYED_COMMIT_INFO is computed once at import time (deliberately --
    see its comment in main.py: it can't change without a new process, and
    the git fallback shouldn't run a subprocess per request). Tests that
    need to observe a different environment have to reload the module
    after setting env vars, not just call the route function again.
    """
    from backend import main as main_module

    return importlib.reload(main_module)


def test_version_reads_render_env_vars_when_present(monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc1234567890abc1234567890abc1234567890")
    monkeypatch.setenv("RENDER_GIT_BRANCH", "main")
    main_module = _reload_main()
    client = TestClient(main_module.app)

    resp = client.get("/version")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "render_env"
    assert data["commit"] == "abc1234567890abc1234567890abc1234567890"
    assert data["commit_short"] == "abc1234"
    assert data["branch"] == "main"
    assert data["algorithm_version"]  # non-empty, whatever cv-vX.Y is current
    assert data["app_version"]


def test_version_falls_back_to_git_when_no_render_env_vars(monkeypatch):
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    monkeypatch.delenv("RENDER_GIT_BRANCH", raising=False)
    main_module = _reload_main()
    client = TestClient(main_module.app)

    resp = client.get("/version")
    assert resp.status_code == 200
    data = resp.json()
    # This test environment is a real git checkout with no RENDER_* vars
    # set, so this proves the fallback actually resolves a real commit --
    # not just that it doesn't crash.
    assert data["source"] == "git_fallback"
    assert data["commit"] is not None
    assert len(data["commit"]) == 40  # full SHA
    assert data["commit_short"] == data["commit"][:7]


@pytest.fixture(autouse=True)
def _restore_main_module():
    """Reload main.py back to a clean state after each test, since the
    tests above intentionally mutate its module-level _DEPLOYED_COMMIT_INFO
    via monkeypatched env vars + importlib.reload."""
    yield
    _reload_main()
