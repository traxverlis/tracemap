"""Connector registry."""

from __future__ import annotations

from typing import Any

from app.connectors.base import Connector, ConnectorDisabled, ConnectorError, ScanRecord
from app.connectors.breaches import BreachConnector
from app.connectors.domain import DomainConnector
from app.connectors.holehe import HoleheConnector
from app.connectors.maigret import MaigretConnector
from app.connectors.openosint import OpenOSINTConnector
from app.connectors.sherlock import SherlockConnector
from app.connectors.whatsmyname import WhatsMyNameConnector

CONNECTOR_CLASSES: tuple[type[Connector], ...] = (
    MaigretConnector,
    SherlockConnector,
    HoleheConnector,
    WhatsMyNameConnector,
    OpenOSINTConnector,
    DomainConnector,
    BreachConnector,
)


def build_connectors() -> dict[str, Connector]:
    """Instantiate every connector (settings are read at instantiation time)."""
    return {connector_class.tool: connector_class() for connector_class in CONNECTOR_CLASSES}


def get_connector(tool: str) -> Connector:
    connectors = build_connectors()
    connector = connectors.get(tool)
    if connector is None:
        raise ConnectorDisabled(f"unknown tool: {tool!r}")
    return connector


def describe_connectors() -> list[dict[str, Any]]:
    return [connector.describe() for connector in build_connectors().values()]


__all__ = [
    "CONNECTOR_CLASSES",
    "Connector",
    "ConnectorDisabled",
    "ConnectorError",
    "ScanRecord",
    "build_connectors",
    "describe_connectors",
    "get_connector",
]
