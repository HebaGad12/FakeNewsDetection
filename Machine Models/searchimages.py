"""
SerpAPI Google Lens reverse image search + web-based similarity comparison.

Flow:
    raw image bytes → upload to temp host → public URL → SerpAPI → similar images

Extended flow (check_web_similarity):
    uploaded image → SerpAPI (get N thumbnails) → download each → embed → compare → verdict
"""

import os
import io
import httpx
from fastapi import HTTPException
from PIL import Image


def _prepare_image(image_bytes: bytes) -> bytes:
    """Resize and normalize image to JPEG before uploading."""
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    if max(img.size) > 1600:
        img.thumbnail((1600, 1600), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


async def upload_to_temp_host(image_bytes: bytes) -> str:
    """
    Upload image to a temporary public host and return its URL.
    Tries 0x0.st first, falls back to litterbox.catbox.moe.
    """
    jpeg_bytes = _prepare_image(image_bytes)

    async with httpx.AsyncClient(timeout=30) as client:
        # Primary: 0x0.st
        try:
            resp = await client.post(
                "https://0x0.st",
                files={"file": ("image.jpg", jpeg_bytes, "image/jpeg")},
            )
            if resp.status_code == 200 and resp.text.strip().startswith("http"):
                return resp.text.strip()
        except Exception:
            pass

        # Fallback: litterbox.catbox.moe (72-hour temp host)
        try:
            resp = await client.post(
                "https://litterbox.catbox.moe/resources/internals/api.php",
                data={"reqtype": "fileupload", "time": "72h"},
                files={"fileToUpload": ("image.jpg", jpeg_bytes, "image/jpeg")},
            )
            if resp.status_code == 200 and resp.text.strip().startswith("http"):
                return resp.text.strip()
        except Exception:
            pass

    raise HTTPException(
        status_code=502,
        detail="Could not upload image to a temporary host. Both 0x0.st and litterbox.catbox.moe failed.",
    )


async def search_similar_images(image_bytes: bytes, limit: int = 10) -> list[dict]:
    """
    Given raw image bytes, return a list of visually similar images from the web.

    Args:
        image_bytes: Raw bytes of any image format (JPEG, PNG, WEBP, etc.)
        limit:       Max number of results to return (1–50)

    Returns:
        List of dicts with keys: title, link, thumbnail, source, position
    """
    api_key = os.environ.get("SERPAPI_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="SERPAPI_KEY is not set. Add it to your .env file.",
        )

    public_url = await upload_to_temp_host(image_bytes)

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            "https://serpapi.com/search",
            params={"engine": "google_lens", "url": public_url, "api_key": api_key},
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"SerpAPI error: {resp.text[:300]}",
        )

    results = []
    for item in resp.json().get("visual_matches", [])[:limit]:
        results.append({
            "title":     item.get("title", ""),
            "link":      item.get("link", ""),
            "thumbnail": item.get("thumbnail", ""),
            "source":    item.get("source", ""),
            "position":  item.get("position"),
        })

    return results


async def _download_image_bytes(url: str) -> bytes | None:
    """Download image from a URL and return raw bytes, or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200 and "image" in resp.headers.get("content-type", ""):
                return resp.content
    except Exception:
        pass
    return None


async def check_web_similarity(
    image_bytes: bytes,
    embed_fn,
    threshold: float,
    web_limit: int = 3,
) -> tuple[bool, list[dict]]:
    """
    Search the web for similar images and compare them against the uploaded image
    using the same embedding model used for the local DB.

    Args:
        image_bytes: Raw bytes of the uploaded image.
        embed_fn:    ImageDuplicateStore._embed_from_bytes — embeds raw bytes directly.
        threshold:   Cosine similarity threshold (same as local DB threshold).
        web_limit:   How many web thumbnails to download and compare (default: 3).

    Returns:
        (is_duplicate, matches)
        matches: list of dicts with keys: url, source, title, similarity
    """
    # Step 1: get web candidates via SerpAPI
    web_results = await search_similar_images(image_bytes, limit=web_limit)
    if not web_results:
        return False, []

    # Step 2: embed the uploaded image once
    uploaded_embedding = embed_fn(image_bytes)

    # Step 3: download each web thumbnail, embed, compare
    matches = []
    for item in web_results:
        thumbnail_url = item.get("thumbnail", "")
        if not thumbnail_url:
            continue

        web_img_bytes = await _download_image_bytes(thumbnail_url)
        if web_img_bytes is None:
            continue

        try:
            web_embedding = embed_fn(web_img_bytes)
        except Exception:
            continue

        # Embeddings are L2-normalized → dot product == cosine similarity
        similarity = sum(a * b for a, b in zip(uploaded_embedding, web_embedding))

        if similarity >= threshold:
            matches.append({
                "url":        thumbnail_url,
                "source":     item.get("source", ""),
                "title":      item.get("title", ""),
                "similarity": round(similarity, 4),
            })

    return len(matches) > 0, matches