"""Identity graph projection (nodes + typed, scored edges)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Account,
    Company,
    DataBroker,
    Domain,
    Finding,
    Identifier,
    Identity,
    Photo,
    Profile,
    Relationship,
)
from app.services.normalization import mask_phone

ENTITY_TYPE_BY_IDENTIFIER = {
    "email": "email",
    "phone": "phone",
    "username": "username",
    "name": "name",
    "address": "address",
    "domain": "domain",
}


def _identifier_label(identifier: Identifier) -> str:
    if identifier.type == "phone":
        return mask_phone(identifier.value)
    if identifier.type == "address":
        # Addresses are highly sensitive: only the city (or a placeholder) is
        # rendered on the graph.
        city = (identifier.attributes or {}).get("city")
        return str(city) if city else "address"
    return identifier.value


def build_graph(db: Session, identity: Identity) -> dict[str, Any]:
    nodes: list[dict[str, Any]] = [
        {
            "id": f"identity:{identity.id}",
            "type": "identity",
            "label": identity.label,
            "sublabel": identity.description,
        }
    ]
    edges: list[dict[str, Any]] = []

    def add_edge(
        edge_id: str,
        source: str,
        target: str,
        edge_type: str,
        status: str,
        confidence: int,
        reason: str | None = None,
    ) -> None:
        edges.append(
            {
                "id": edge_id,
                "source": source,
                "target": target,
                "type": edge_type,
                "status": status,
                "confidence": confidence,
                "reason": reason,
            }
        )

    for identifier in db.scalars(select(Identifier).where(Identifier.identity_id == identity.id)):
        node_id = f"{ENTITY_TYPE_BY_IDENTIFIER.get(identifier.type, 'identifier')}:{identifier.id}"
        nodes.append(
            {
                "id": node_id,
                "type": ENTITY_TYPE_BY_IDENTIFIER.get(identifier.type, "identifier"),
                "label": _identifier_label(identifier),
                "sublabel": identifier.subtype or ("active" if identifier.is_active else "former"),
            }
        )
        add_edge(
            f"owns:{identifier.id}",
            f"identity:{identity.id}",
            node_id,
            "OWNS" if identifier.is_active else "USED",
            "CONFIRMED",
            identifier.confidence,
        )

    for profile in db.scalars(select(Profile).where(Profile.identity_id == identity.id)):
        node_id = f"profile:{profile.id}"
        nodes.append(
            {
                "id": node_id,
                "type": "profile",
                "label": f"{profile.platform}: {profile.username or ''}".strip(": "),
                "sublabel": profile.url,
            }
        )
        add_edge(
            f"owns-profile:{profile.id}",
            f"identity:{identity.id}",
            node_id,
            "OWNS",
            "CONFIRMED",
            100,
        )

    for company in db.scalars(select(Company).where(Company.identity_id == identity.id)):
        node_id = f"company:{company.id}"
        nodes.append(
            {
                "id": node_id,
                "type": "company",
                "label": company.name,
                "sublabel": company.position,
            }
        )
        add_edge(
            f"assoc-company:{company.id}",
            f"identity:{identity.id}",
            node_id,
            "ASSOCIATED_WITH",
            "CONFIRMED",
            80,
        )

    for domain in db.scalars(select(Domain).where(Domain.identity_id == identity.id)):
        node_id = f"domain:{domain.id}"
        nodes.append(
            {"id": node_id, "type": "domain", "label": domain.domain, "sublabel": domain.status}
        )
        add_edge(
            f"owns-domain:{domain.id}",
            f"identity:{identity.id}",
            node_id,
            "OWNS",
            "CONFIRMED",
            90,
        )

    for photo in db.scalars(select(Photo).where(Photo.identity_id == identity.id)):
        node_id = f"photo:{photo.id}"
        nodes.append(
            {
                "id": node_id,
                "type": "photo",
                "label": photo.filename,
                "sublabel": photo.platform,
            }
        )
        add_edge(
            f"owns-photo:{photo.id}",
            f"identity:{identity.id}",
            node_id,
            "OWNS",
            "CONFIRMED",
            100,
        )

    for account in db.scalars(select(Account).where(Account.identity_id == identity.id)):
        nodes.append(
            {
                "id": f"account:{account.id}",
                "type": "account",
                "label": f"{account.platform}: {account.username or account.email or ''}".strip(
                    ": "
                ),
                "sublabel": account.status,
            }
        )

    broker_ids: set[str] = set()
    for finding in db.scalars(select(Finding).where(Finding.identity_id == identity.id)):
        node_id = f"finding:{finding.id}"
        nodes.append(
            {
                "id": node_id,
                "type": "finding",
                "label": finding.title,
                "sublabel": f"{finding.category} / {finding.status}",
            }
        )
        if finding.account_id:
            add_edge(
                f"found-on:{finding.id}",
                f"account:{finding.account_id}",
                node_id,
                "FOUND_ON",
                finding.status,
                finding.confidence,
            )
        else:
            add_edge(
                f"mentioned:{finding.id}",
                f"identity:{identity.id}",
                node_id,
                "MENTIONED_ON",
                finding.status,
                finding.confidence,
            )
        if finding.broker_id:
            broker_ids.add(finding.broker_id)
            add_edge(
                f"broker:{finding.id}",
                node_id,
                f"data_broker:{finding.broker_id}",
                "LINKED_TO",
                finding.status,
                finding.confidence,
            )

    if broker_ids:
        for broker in db.scalars(select(DataBroker).where(DataBroker.id.in_(broker_ids))):
            nodes.append(
                {
                    "id": f"data_broker:{broker.id}",
                    "type": "data_broker",
                    "label": broker.name,
                    "sublabel": broker.domain,
                }
            )

    known_ids = {node["id"] for node in nodes}
    for relationship in db.scalars(
        select(Relationship).where(Relationship.identity_id == identity.id)
    ):
        source = f"{relationship.source_entity_type}:{relationship.source_entity_id}"
        target = f"{relationship.target_entity_type}:{relationship.target_entity_id}"
        if source not in known_ids or target not in known_ids:
            continue
        add_edge(
            relationship.id,
            source,
            target,
            relationship.relationship_type,
            relationship.status,
            relationship.confidence,
            relationship.reason,
        )

    return {"nodes": nodes, "edges": edges}
