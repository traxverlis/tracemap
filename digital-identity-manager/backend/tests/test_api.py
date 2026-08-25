"""End-to-end API behaviour on SQLite (no external service is contacted)."""

from __future__ import annotations

from pathlib import Path

from app.config import get_settings


def test_health_is_public(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_requires_authentication(client):
    assert client.get("/api/identities").status_code in {401, 403}


def test_bootstrap_can_only_run_once(client):
    payload = {"email": "owner@example.com", "password": "correct horse battery staple"}
    assert client.post("/api/auth/bootstrap", json=payload).status_code == 201
    assert client.post("/api/auth/bootstrap", json=payload).status_code == 409


def test_bootstrap_rejects_weak_passwords(client):
    response = client.post(
        "/api/auth/bootstrap", json={"email": "owner@example.com", "password": "short"}
    )
    assert response.status_code == 422


def test_login_returns_a_token_and_never_the_hash(client):
    client.post(
        "/api/auth/bootstrap",
        json={"email": "owner@example.com", "password": "correct horse battery staple"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "OWNER@example.com", "password": "correct horse battery staple"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert "password_hash" not in body["user"]

    bad = client.post(
        "/api/auth/login", json={"email": "owner@example.com", "password": "wrong password"}
    )
    assert bad.status_code == 401


def test_identifier_lifecycle_normalizes_and_deduplicates(auth_client, identity):
    created = auth_client.post(
        "/api/identifiers",
        json={
            "identity_id": identity["id"],
            "type": "email",
            "value": "  John.DOE@Example.com ",
            "is_active": True,
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["value"] == "  John.DOE@Example.com "
    assert body["normalized_value"] == "john.doe@example.com"

    duplicate = auth_client.post(
        "/api/identifiers",
        json={"identity_id": identity["id"], "type": "email", "value": "john.doe@example.com"},
    )
    assert duplicate.status_code == 409

    invalid = auth_client.post(
        "/api/identifiers",
        json={"identity_id": identity["id"], "type": "email", "value": "nope"},
    )
    assert invalid.status_code == 422

    listed = auth_client.get("/api/identifiers", params={"identity_id": identity["id"]})
    assert len(listed.json()) == 1

    assert auth_client.delete(f"/api/identifiers/{body['id']}").status_code == 204


def test_phone_is_normalized_to_e164(auth_client, identity):
    response = auth_client.post(
        "/api/identifiers",
        json={
            "identity_id": identity["id"],
            "type": "phone",
            "value": "06 12 34 56 78",
            "country": "FR",
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["normalized_value"] == "+33612345678"


def test_scan_requires_authorization_acknowledgement(auth_client):
    identity = auth_client.post("/api/identities", json={"label": "Unconfirmed"}).json()
    response = auth_client.post(
        "/api/scans",
        json={
            "identity_id": identity["id"],
            "tool": "maigret",
            "scan_type": "username",
            "target": "johndoe",
        },
    )
    assert response.status_code == 403
    assert "authorised" in response.json()["detail"] or "authoris" in response.json()["detail"]


def test_scan_rejects_unknown_tool(auth_client, identity):
    response = auth_client.post(
        "/api/scans",
        json={
            "identity_id": identity["id"],
            "tool": "not-a-tool",
            "scan_type": "username",
            "target": "johndoe",
        },
    )
    assert response.status_code == 422


def test_completeness_is_explainable(auth_client, identity):
    auth_client.post(
        "/api/identifiers",
        json={"identity_id": identity["id"], "type": "email", "value": "a@example.com"},
    )
    response = auth_client.get(f"/api/identities/{identity['id']}/completeness")
    assert response.status_code == 200
    body = response.json()
    assert 0 <= body["score"] <= 100
    assert body["categories"], "every category must be explained"
    for category in body["categories"]:
        assert {"category", "label", "known", "expected", "missing"} <= set(category)
    assert body["explanation"]


def test_completeness_targets_are_editable(auth_client, identity):
    response = auth_client.put(
        f"/api/identities/{identity['id']}/completeness-targets",
        json={"targets": [{"category": "email", "expected_count": 4}]},
    )
    assert response.status_code == 200
    emails = next(item for item in response.json()["categories"] if item["category"] == "email")
    assert emails["expected"] == 4

    invalid = auth_client.put(
        f"/api/identities/{identity['id']}/completeness-targets",
        json={"targets": [{"category": "nope", "expected_count": 1}]},
    )
    assert invalid.status_code == 422


def test_correlation_rules_are_public_to_authenticated_users(auth_client):
    response = auth_client.get("/api/correlation/rules")
    assert response.status_code == 200
    body = response.json()
    assert body["max_auto_score"] <= 95
    assert any(rule["key"] == "same_email" for rule in body["rules"])


def test_relationship_decision_is_recorded(auth_client, identity):
    relationship = auth_client.post(
        "/api/relationships",
        json={
            "identity_id": identity["id"],
            "source_entity_type": "identity",
            "source_entity_id": identity["id"],
            "target_entity_type": "account",
            "target_entity_id": "does-not-exist",
            "relationship_type": "POSSIBLY_SAME_PERSON",
            "confidence": 70,
            "status": "SUGGESTED",
        },
    ).json()

    queue = auth_client.get("/api/relationships/review").json()
    assert any(item["relationship"]["id"] == relationship["id"] for item in queue)

    decided = auth_client.post(
        f"/api/relationships/{relationship['id']}/decision",
        json={"decision": "CONFIRM", "reason": "It is my account"},
    )
    assert decided.status_code == 200
    body = decided.json()
    assert body["status"] == "CONFIRMED"
    assert body["relationship_type"] == "CONFIRMED_SAME_PERSON"
    assert body["decided_at"]

    timeline = auth_client.get("/api/timeline", params={"identity_id": identity["id"]}).json()
    assert any(event["action"] == "relationship.confirmed" for event in timeline)


def test_dashboard_and_graph(auth_client, identity):
    auth_client.post(
        "/api/identifiers",
        json={"identity_id": identity["id"], "type": "username", "value": "johndoe"},
    )
    summary = auth_client.get("/api/dashboard/summary", params={"identity_id": identity["id"]})
    assert summary.status_code == 200
    body = summary.json()
    assert body["usernames"] == 1
    assert body["identifiers"] == 1
    assert "completeness" in body

    graph = auth_client.get(
        "/api/relationships/graph", params={"identity_id": identity["id"]}
    ).json()
    assert any(node["type"] == "identity" for node in graph["nodes"])
    assert any(node["type"] == "username" for node in graph["nodes"])


def test_ai_is_disabled_by_default(auth_client, identity):
    status = auth_client.get("/api/ai/status").json()
    assert status["enabled"] is False
    assert status["provider"] == "disabled"
    assert status["minimization"]["allow_addresses"] is False

    response = auth_client.post(
        "/api/ai/suggest", json={"identity_id": identity["id"], "task": "correlations"}
    )
    assert response.status_code == 409


def test_settings_never_expose_secrets(auth_client):
    body = auth_client.get("/api/settings").json()
    serialised = str(body)
    assert "secret" not in serialised.lower()
    assert get_settings().secret_key not in serialised
    assert body["correlation"]["max_auto_score"] <= 95
    assert isinstance(body["tools"], list)


def test_export_and_erase(auth_client, identity):
    auth_client.post(
        "/api/identifiers",
        json={"identity_id": identity["id"], "type": "email", "value": "a@example.com"},
    )
    export = auth_client.get("/api/settings/export", params={"identity_id": identity["id"]})
    assert export.status_code == 200
    assert "attachment" in export.headers["content-disposition"]
    assert export.json()["identity"]["id"] == identity["id"]

    refused = auth_client.post(
        "/api/settings/erase", json={"identity_id": identity["id"], "confirm": "nope"}
    )
    assert refused.status_code == 400

    erased = auth_client.post(
        "/api/settings/erase", json={"identity_id": identity["id"], "confirm": "ERASE"}
    )
    assert erased.status_code == 200
    assert auth_client.get("/api/identifiers", params={"identity_id": identity["id"]}).json() == []


def test_data_broker_optout_url_is_never_invented(auth_client):
    broker = auth_client.post(
        "/api/data-brokers", json={"name": "Example Broker", "domain": "example.test"}
    ).json()
    assert broker["optout_url"] is None
    assert broker["search_url"] is None


def test_data_broker_catalog_import_is_idempotent(auth_client):
    catalog = Path(get_settings().data_dir) / "data_brokers.csv"
    catalog.parent.mkdir(parents=True, exist_ok=True)
    catalog.write_text(
        "name,domain,country,category,search_url,optout_url,optout_method,"
        "requires_email,requires_phone,requires_identity_document,"
        "automation_possible,notes\n"
        "Catalog Broker,catalog.test,FR,people-search,,https://catalog.test/optout,"
        "form,yes,no,no,no,verified manually\n"
        ",,,,,,,,,,,skipped because the name is empty\n",
        encoding="utf-8",
    )

    first = auth_client.post("/api/data-brokers/import")
    assert first.status_code == 200, first.text
    assert first.json() == {"imported": 1, "skipped": 1}

    second = auth_client.post("/api/data-brokers/import")
    assert second.status_code == 200
    assert second.json() == {"imported": 0, "skipped": 2}

    brokers = auth_client.get("/api/data-brokers").json()
    assert [broker["name"] for broker in brokers] == ["Catalog Broker"]
    assert brokers[0]["optout_url"] == "https://catalog.test/optout"

    catalog.unlink()
    missing = auth_client.post("/api/data-brokers/import")
    assert missing.status_code == 404
