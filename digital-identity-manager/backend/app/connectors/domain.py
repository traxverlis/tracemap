"""Domain connector: WHOIS, DNS, passive subdomains and TLS certificate.

Everything here queries public infrastructure only:

* WHOIS over port 43 following the IANA referral chain;
* DNS resolution through the container resolver;
* passive subdomain listing from the public crt.sh certificate transparency API;
* the TLS certificate presented by the host itself.
"""

from __future__ import annotations

import socket
import ssl
from typing import Any

import httpx

from app.config import get_settings
from app.connectors.base import Connector, ConnectorDisabled, ScanRecord
from app.services.normalization import NormalizationError, normalize_domain

IANA_WHOIS = "whois.iana.org"
WHOIS_PORT = 43
WHOIS_TIMEOUT = 10
CRTSH_URL = "https://crt.sh/"
MAX_SUBDOMAINS = 200


def whois_query(domain: str, server: str = IANA_WHOIS, depth: int = 0) -> str:
    """Perform a raw WHOIS query, following at most two referrals."""
    try:
        with socket.create_connection((server, WHOIS_PORT), timeout=WHOIS_TIMEOUT) as sock:
            sock.sendall(f"{domain}\r\n".encode())
            chunks: list[bytes] = []
            while True:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                chunks.append(chunk)
                if sum(len(part) for part in chunks) > 200_000:
                    break
    except OSError as exc:
        raise ConnectorDisabled(
            f"WHOIS query failed for {domain}: {exc.__class__.__name__}"
        ) from exc

    body = b"".join(chunks).decode("utf-8", errors="replace")
    if depth < 2:
        for line in body.splitlines():
            key, _, value = line.partition(":")
            if key.strip().lower() in {"refer", "whois server", "registrar whois server"}:
                referral = value.strip()
                if referral and referral != server:
                    try:
                        return whois_query(domain, referral, depth + 1)
                    except ConnectorDisabled:
                        return body
    return body


def resolve_dns(domain: str) -> dict[str, list[str]]:
    """Resolve A/AAAA records with the standard resolver."""
    records: dict[str, list[str]] = {"A": [], "AAAA": []}
    try:
        for family, _, _, _, sockaddr in socket.getaddrinfo(domain, None):
            address = sockaddr[0]
            if family == socket.AF_INET and address not in records["A"]:
                records["A"].append(address)
            elif family == socket.AF_INET6 and address not in records["AAAA"]:
                records["AAAA"].append(address)
    except socket.gaierror:
        pass
    return records


def tls_certificate(domain: str) -> dict[str, Any] | None:
    """Read the certificate presented by ``domain`` on port 443."""
    context = ssl.create_default_context()
    try:
        with socket.create_connection((domain, 443), timeout=WHOIS_TIMEOUT) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as tls:
                cert = tls.getpeercert()
    except (OSError, ssl.SSLError):
        return None
    if not cert:
        return None
    return {
        "subject": cert.get("subject"),
        "issuer": cert.get("issuer"),
        "not_before": cert.get("notBefore"),
        "not_after": cert.get("notAfter"),
        "subject_alt_names": [
            value for key, value in cert.get("subjectAltName", []) if key == "DNS"
        ],
    }


def passive_subdomains(domain: str) -> list[str]:
    """List known subdomains from certificate transparency logs (crt.sh)."""
    settings = get_settings()
    if not settings.allow_outbound_http:
        return []
    try:
        response = httpx.get(
            CRTSH_URL,
            params={"q": f"%.{domain}", "output": "json"},
            timeout=30,
            headers={"user-agent": settings.http_user_agent},
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError):
        return []
    names: set[str] = set()
    for entry in payload if isinstance(payload, list) else []:
        for name in str(entry.get("name_value", "")).splitlines():
            name = name.strip().lstrip("*.").lower()
            if name.endswith(domain):
                names.add(name)
    return sorted(names)[:MAX_SUBDOMAINS]


class DomainConnector(Connector):
    tool = "domain"
    scan_types = ("domain",)
    description = "WHOIS, DNS, TLS certificate and passive subdomain enumeration for your domains."
    requires = ("outbound access to WHOIS (tcp/43) and DNS",)

    @property
    def enabled(self) -> bool:
        return True

    def run(self, target: str, parameters: dict[str, Any] | None = None) -> list[ScanRecord]:
        parameters = parameters or {}
        try:
            domain = normalize_domain(target)
        except NormalizationError as exc:
            raise ConnectorDisabled(str(exc)) from exc

        records: list[ScanRecord] = []

        if parameters.get("whois", True):
            try:
                body = whois_query(domain)
            except ConnectorDisabled:
                body = ""
            if body:
                records.append(
                    ScanRecord(
                        result_type="whois",
                        value=domain,
                        url=None,
                        confidence=90,
                        raw={"domain": domain, "whois": body[:20_000], "tool": "whois"},
                    )
                )

        if parameters.get("dns", True):
            dns_records = resolve_dns(domain)
            if any(dns_records.values()):
                records.append(
                    ScanRecord(
                        result_type="dns",
                        value=domain,
                        confidence=90,
                        raw={"domain": domain, "records": dns_records, "tool": "dns"},
                    )
                )

        if parameters.get("certificate", True):
            certificate = tls_certificate(domain)
            if certificate:
                records.append(
                    ScanRecord(
                        result_type="certificate",
                        value=domain,
                        url=f"https://{domain}",
                        confidence=90,
                        raw={"domain": domain, "certificate": certificate, "tool": "tls"},
                    )
                )

        if parameters.get("subdomains", True):
            for subdomain in passive_subdomains(domain):
                records.append(
                    ScanRecord(
                        result_type="subdomain",
                        value=subdomain,
                        url=f"https://{subdomain}",
                        confidence=60,
                        raw={"domain": domain, "subdomain": subdomain, "tool": "crt.sh"},
                    )
                )

        return records
