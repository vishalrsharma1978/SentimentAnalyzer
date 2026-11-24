"""Scrapy-backed HTTP service: GET /scrape?source=<name>&brand=<brand> -> {"reviews": [...]}.

Only public pages are fetched, robots.txt is obeyed, and requests are throttled. LinkedIn, Facebook
and X block anonymous scraping and forbid it in their terms, so those sources return an empty list
here and rely on the official APIs configured in the Node backend. Reviews.io public store pages
are supported through a configurable URL template.
"""
import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

PORT = int(os.environ.get("SCRAPY_SERVICE_PORT", "8001"))
SUPPORTED = {"Reviews.io"}


def run_spider(source: str, brand: str) -> list:
    if source not in SUPPORTED:
        return []
    here = os.path.dirname(os.path.abspath(__file__))
    result = subprocess.run(
        [sys.executable, os.path.join(here, "spiders", "reviews_io.py"), brand],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        return []
    try:
        return json.loads(result.stdout or "[]")
    except json.JSONDecodeError:
        return []


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/health":
            return self._send(200, {"status": "ok"})
        if url.path != "/scrape":
            return self._send(404, {"error": "not found"})
        query = parse_qs(url.query)
        source = (query.get("source") or [""])[0]
        brand = (query.get("brand") or [""])[0].strip()
        if not brand:
            return self._send(400, {"error": "brand is required"})
        self._send(200, {"source": source, "brand": brand, "reviews": run_spider(source, brand)})

    def _send(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print(f"Scrapy service listening on http://localhost:{PORT}")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
