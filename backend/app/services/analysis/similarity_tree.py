"""
Clusters a brand's ads into creative families using visual + text embeddings.
Assigns creative_family_id and variant_count to each Ad row.
"""
import io
import logging
import uuid

import httpx
import numpy as np
from PIL import Image
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.ad import Ad

logger = logging.getLogger(__name__)

TEXT_DIM = 384
VISUAL_DIM = 512

_text_model = None
_clip_model = None
_clip_processor = None
_models_available: bool | None = None


def _get_text_model():
    global _text_model, _models_available
    if _models_available is False:
        return None
    if _text_model is None:
        try:
            from sentence_transformers import SentenceTransformer

            _text_model = SentenceTransformer("all-MiniLM-L6-v2")
            _models_available = True
        except Exception:
            logger.warning("Failed to load sentence-transformers model", exc_info=True)
            _models_available = False
            return None
    return _text_model


def _get_clip_models():
    global _clip_model, _clip_processor, _models_available
    if _models_available is False:
        return None, None
    if _clip_model is None:
        try:
            import torch
            from transformers import CLIPModel, CLIPProcessor

            _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            _clip_model.eval()
            _models_available = True
        except Exception:
            logger.warning("Failed to load CLIP model", exc_info=True)
            _models_available = False
            return None, None
    return _clip_model, _clip_processor


def embed_text(text: str) -> np.ndarray:
    model = _get_text_model()
    if model is None:
        return np.zeros(TEXT_DIM)
    return model.encode(text or "")


async def embed_thumbnail(url: str) -> np.ndarray | None:
    clip_model, clip_processor = _get_clip_models()
    if clip_model is None or clip_processor is None:
        return None
    try:
        import torch

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        image = Image.open(io.BytesIO(resp.content)).convert("RGB")
        inputs = clip_processor(images=image, return_tensors="pt")
        with torch.no_grad():
            features = clip_model.get_image_features(**inputs)
        return features[0].numpy()
    except Exception:
        return None


def combine(text_vec: np.ndarray, visual_vec: np.ndarray | None) -> np.ndarray:
    if visual_vec is None:
        visual_vec = np.zeros(VISUAL_DIM)
    combined = np.concatenate([text_vec * 0.4, visual_vec * 0.6])
    norm = np.linalg.norm(combined)
    return combined / norm if norm > 0 else combined


def compute_clusters(embeddings: list[np.ndarray], eps: float = 0.25) -> list[int]:
    if not embeddings:
        return []
    if len(embeddings) == 1:
        return [-1]

    matrix = np.array(embeddings)
    sim = cosine_similarity(matrix)
    dist = 1 - sim
    np.fill_diagonal(dist, 0)
    labels = DBSCAN(eps=eps, min_samples=2, metric="precomputed").fit_predict(dist)
    return labels.tolist()


def assign_families(labels: list[int]) -> tuple[list[str], dict[str, int]]:
    """Map cluster labels to family UUIDs and compute variant counts."""
    label_to_family: dict[int, str] = {}
    for label in set(labels):
        if label >= 0:
            label_to_family[label] = str(uuid.uuid4())

    family_ids: list[str] = []
    counts: dict[str, int] = {}
    for label in labels:
        fid = label_to_family.get(label, str(uuid.uuid4()))
        family_ids.append(fid)
        counts[fid] = counts.get(fid, 0) + 1

    return family_ids, counts


async def cluster_brand_families(brand_id: str, eps: float = 0.25) -> None:
    if _get_text_model() is None:
        logger.warning("Skipping clustering for %s: ML models unavailable", brand_id)
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ad).where(Ad.brand_id == brand_id))
        ads = result.scalars().all()
        if not ads:
            return

        embeddings: list[np.ndarray] = []
        for ad in ads:
            text_vec = embed_text(ad.title or "")
            visual_vec = await embed_thumbnail(ad.thumbnail_url) if ad.thumbnail_url else None
            embeddings.append(combine(text_vec, visual_vec))

        labels = compute_clusters(embeddings, eps)
        family_ids, counts = assign_families(labels)

        for ad, fid in zip(ads, family_ids):
            ad.creative_family_id = fid
            ad.variant_count = counts.get(fid, 1)

        await db.commit()
