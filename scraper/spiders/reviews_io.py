"""Scrapy spider for a public Reviews.io store page. Prints a JSON list of reviews to stdout.

It reads only schema.org JSON-LD (<script type="application/ld+json">) Review objects, a standard
format, instead of site-specific CSS. Reviews.io returned HTTP 403 to anonymous requests when this
was written, so expect an empty list unless the page is reachable; use the Reviews.io API
(REVIEWS_IO_API_KEY + REVIEWS_IO_STORE) for reliable data.

REVIEWS_IO_PUBLIC_URL is a template such as https://www.reviews.io/company-reviews/store/{slug}
where {slug} is the brand lower-cased with spaces replaced by hyphens.
"""
import json
import os
import re
import sys

import scrapy
from scrapy.crawler import CrawlerProcess

TEMPLATE = os.environ.get("REVIEWS_IO_PUBLIC_URL", "https://www.reviews.io/company-reviews/store/{slug}")


def iter_reviews(node):
    """Yield every schema.org Review object nested anywhere in a JSON-LD document."""
    if isinstance(node, list):
        for item in node:
            yield from iter_reviews(item)
    elif isinstance(node, dict):
        kind = node.get("@type")
        kinds = kind if isinstance(kind, list) else [kind]
        if "Review" in kinds:
            yield node
        for value in node.values():
            if isinstance(value, (list, dict)):
                yield from iter_reviews(value)


class ReviewsIoSpider(scrapy.Spider):
    name = "reviews_io"
    custom_settings = {
        "ROBOTSTXT_OBEY": True,
        "DOWNLOAD_DELAY": 1.0,
        "LOG_ENABLED": False,
        "USER_AGENT": "SentimentAnalyzerBot/1.0 (public review aggregation)",
    }

    def __init__(self, brand, sink, **kwargs):
        super().__init__(**kwargs)
        slug = re.sub(r"[^a-z0-9]+", "-", brand.lower()).strip("-")
        self.start_urls = [TEMPLATE.format(slug=slug)]
        self.sink = sink

    def parse(self, response):
        for block in response.xpath("//script[@type='application/ld+json']/text()").getall():
            try:
                document = json.loads(block)
            except json.JSONDecodeError:
                continue
            for index, review in enumerate(iter_reviews(document)):
                text = str(review.get("reviewBody") or "").strip()
                if not text:
                    continue
                author = review.get("author")
                rating = (review.get("reviewRating") or {}).get("ratingValue")
                self.sink.append({
                    "id": f"{response.url}#{index}",
                    "author": author.get("name") if isinstance(author, dict) else author,
                    "rating": float(rating) if rating is not None else None,
                    "text": text,
                    "publishedAt": review.get("datePublished"),
                })


if __name__ == "__main__":
    collected = []
    process = CrawlerProcess()
    process.crawl(ReviewsIoSpider, brand=sys.argv[1], sink=collected)
    process.start()
    print(json.dumps(collected))
