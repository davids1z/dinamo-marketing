"""Lightweight URL scraper for extracting text content from web pages."""

import logging
import re

import httpx

logger = logging.getLogger(__name__)

# Tags whose content should be stripped entirely
_STRIP_TAGS = {"script", "style", "nav", "footer", "header", "aside", "noscript", "svg", "iframe"}

_MAX_TEXT_LENGTH = 10_000


async def scrape_url(url: str, *, timeout: float = 30.0) -> dict:
    """Fetch a URL and extract text content.

    Returns dict with keys: title, meta_description, text.
    """
    from bs4 import BeautifulSoup

    # Normalise URL
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; ShiftOneZero/1.0; +https://shiftonezero.xyler.ai)",
            "Accept": "text/html,application/xhtml+xml",
        },
    ) as client:
        response = await client.get(url)
        response.raise_for_status()

    content_type = response.headers.get("content-type", "")
    if "html" not in content_type and "text" not in content_type:
        raise ValueError(f"URL did not return HTML (content-type: {content_type})")

    soup = BeautifulSoup(response.text, "lxml")

    # Extract title
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    # Extract meta description
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = meta_tag["content"].strip()

    # Strip unwanted tags
    for tag_name in _STRIP_TAGS:
        for tag in soup.find_all(tag_name):
            tag.decompose()

    # Extract visible text
    raw_text = soup.get_text(separator="\n", strip=True)

    # Clean up: collapse whitespace, remove empty lines
    lines = [re.sub(r"\s+", " ", line).strip() for line in raw_text.splitlines()]
    text = "\n".join(line for line in lines if line)

    # Cap length
    if len(text) > _MAX_TEXT_LENGTH:
        text = text[:_MAX_TEXT_LENGTH]

    logger.info("Scraped %s: title=%r, text_len=%d", url, title[:60], len(text))

    return {
        "title": title,
        "meta_description": meta_desc,
        "text": text,
    }
