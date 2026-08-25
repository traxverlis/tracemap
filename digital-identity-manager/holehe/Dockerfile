# Holehe runner — https://github.com/megadose/holehe (GPL-3.0)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    RUNNER_TOOL=holehe \
    RUNNER_PORT=8080

WORKDIR /opt/runner

RUN pip install --no-cache-dir "holehe==1.61" \
    && groupadd --system runner \
    && useradd --system --gid runner --home /opt/runner runner

COPY osint/runner/runner.py /opt/runner/runner.py

RUN mkdir -p /reports && chown -R runner:runner /opt/runner /reports

USER runner

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=4).status == 200 else 1)"

CMD ["python", "/opt/runner/runner.py"]
