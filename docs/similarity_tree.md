# Similarity Tree — Technical Specification

The Similarity Tree groups a brand's ads into **creative families**: clusters of ads that share the same underlying creative concept (same hook, same visual language, same product angle). These families are what drive the linked node structure in the Web screen and the `variant_count` signal in fatigue scoring.

This module does not exist yet — this doc is the build spec.

---

## What it produces

For each brand, the tree assigns every ad a `creative_family_id` (a shared string UUID for ads in the same family) and updates `variant_count` on each ad to reflect how many siblings it has.

```
Ad A ──┐
Ad B ──┤  creative_family_id: "family-abc"  (variant_count: 3)
Ad C ──┘

Ad D ───  creative_family_id: "family-xyz"  (variant_count: 1, standalone)
```

In the Web screen, ads in the same family are visually linked. A high `variant_count` is a fatigue signal — brands spin up variants when a creative is dying.

---

## File to create

```
backend/app/services/analysis/similarity_tree.py
```

Trigger it from the ingestor after sync, and expose it via a router endpoint.

---

## Algorithm

### Step 1 — Embed each ad

Generate a single embedding vector per ad that captures both its **visual** and **textual** identity.

#### Text embedding

Use the ad's `title` field (already in the DB). Embed with a sentence transformer:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")  # fast, 384-dim

def embed_text(title: str) -> list[float]:
    return model.encode(title).tolist()
```

`all-MiniLM-L6-v2` runs on CPU and is fast enough for hundreds of ads. For thousands, batch the encode call.

#### Visual embedding (thumbnail)

Fetch the `thumbnail_url` and embed with CLIP:

```python
from PIL import Image
import httpx
import io
import torch
from transformers import CLIPProcessor, CLIPModel

clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

async def embed_thumbnail(url: str) -> list[float]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
    image = Image.open(io.BytesIO(resp.content))
    inputs = clip_processor(images=image, return_tensors="pt")
    with torch.no_grad():
        features = clip_model.get_image_features(**inputs)
    return features[0].numpy().tolist()
```

#### Combined embedding

Concatenate and normalise:

```python
import numpy as np

def combine_embeddings(text_vec: list[float], visual_vec: list[float]) -> np.ndarray:
    text = np.array(text_vec)
    visual = np.array(visual_vec)
    # weight visual slightly higher — ads are primarily visual
    combined = np.concatenate([text * 0.4, visual * 0.6])
    return combined / np.linalg.norm(combined)  # L2 normalise
```

If an ad has no thumbnail (common for Meta text ads), use text embedding only, zero-padded to the combined length.

---

### Step 2 — Compute pairwise cosine similarity

```python
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def build_similarity_matrix(embeddings: list[np.ndarray]) -> np.ndarray:
    matrix = np.array(embeddings)
    return cosine_similarity(matrix)
```

For N ads, this is an N×N matrix. For N < 1000, this is fast in-memory. For N > 1000, use approximate nearest-neighbours (see Scaling section below).

---

### Step 3 — Cluster into families

Use **DBSCAN** — it doesn't require specifying the number of clusters in advance, handles noise (standalone ads that don't belong to any family), and works well on cosine distance.

```python
from sklearn.cluster import DBSCAN

def cluster_ads(similarity_matrix: np.ndarray, eps: float = 0.25, min_samples: int = 2):
    # DBSCAN on distance = 1 - similarity
    distance_matrix = 1 - similarity_matrix
    db = DBSCAN(eps=eps, min_samples=min_samples, metric="precomputed")
    labels = db.fit_predict(distance_matrix)
    return labels  # -1 = noise (standalone ad), 0+ = family index
```

**Tuning `eps`:**

| eps | Effect |
|---|---|
| 0.15 | Tight clusters — only nearly identical ads grouped together |
| 0.25 | Recommended default — same concept, different cuts |
| 0.40 | Loose clusters — any ads with shared visual style |

Start at 0.25. If clusters are too large (unrelated ads grouped), lower it. If too fragmented, raise it.

**`min_samples: 2`** means a family needs at least 2 ads — single ads get label `-1` (standalone, assigned their own unique family ID).

---

### Step 4 — Persist results

```python
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.ad import Ad

async def cluster_brand_families(brand_id: str):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ad).where(Ad.brand_id == brand_id))
        ads = result.scalars().all()

        if not ads:
            return

        # 1. Build embeddings
        embeddings = []
        for ad in ads:
            text_vec = embed_text(ad.title or "")
            visual_vec = await embed_thumbnail(ad.thumbnail_url) if ad.thumbnail_url else None
            embeddings.append(combine_embeddings(text_vec, visual_vec or [0.0] * 512))

        # 2. Similarity + cluster
        sim_matrix = build_similarity_matrix(embeddings)
        labels = cluster_ads(sim_matrix)

        # 3. Map cluster labels to family UUIDs
        label_to_family: dict[int, str] = {}
        for label in set(labels):
            if label == -1:
                continue  # standalone — gets unique ID below
            label_to_family[label] = str(uuid.uuid4())

        # 4. Write back to ads
        family_member_counts: dict[str, int] = {}
        for ad, label in zip(ads, labels):
            if label == -1:
                ad.creative_family_id = str(uuid.uuid4())  # standalone family
            else:
                ad.creative_family_id = label_to_family[label]
            family_member_counts[ad.creative_family_id] = family_member_counts.get(ad.creative_family_id, 0) + 1

        for ad in ads:
            ad.variant_count = family_member_counts.get(ad.creative_family_id, 1)

        await db.commit()
```

---

## Full module skeleton

Create this file at `backend/app/services/analysis/similarity_tree.py`:

```python
"""
Clusters a brand's ads into creative families using visual + text embeddings.
Assigns creative_family_id and variant_count to each Ad row.

Dependencies (add to requirements.txt):
  sentence-transformers==3.0.1
  transformers==4.41.0
  torch==2.3.0
  Pillow==10.3.0
  scikit-learn==1.5.0
"""
import uuid
import numpy as np
import httpx
import io
from PIL import Image
import torch
from sentence_transformers import SentenceTransformer
from transformers import CLIPProcessor, CLIPModel
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import DBSCAN
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.ad import Ad

# Load models once at module level (expensive to reload per call)
_text_model = SentenceTransformer("all-MiniLM-L6-v2")
_clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
_clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

TEXT_DIM = 384   # all-MiniLM-L6-v2 output size
VISUAL_DIM = 512  # CLIP vit-base output size
COMBINED_DIM = TEXT_DIM + VISUAL_DIM


def embed_text(text: str) -> np.ndarray:
    return _text_model.encode(text or "")  # 384-dim


async def embed_thumbnail(url: str) -> np.ndarray | None:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
        image = Image.open(io.BytesIO(resp.content)).convert("RGB")
        inputs = _clip_processor(images=image, return_tensors="pt")
        with torch.no_grad():
            features = _clip_model.get_image_features(**inputs)
        return features[0].numpy()  # 512-dim
    except Exception:
        return None  # thumbnail unavailable — fall back to text-only


def combine(text_vec: np.ndarray, visual_vec: np.ndarray | None) -> np.ndarray:
    if visual_vec is None:
        visual_vec = np.zeros(VISUAL_DIM)
    combined = np.concatenate([text_vec * 0.4, visual_vec * 0.6])
    norm = np.linalg.norm(combined)
    return combined / norm if norm > 0 else combined


def compute_clusters(embeddings: list[np.ndarray], eps: float = 0.25) -> list[int]:
    matrix = np.array(embeddings)
    sim = cosine_similarity(matrix)
    dist = 1 - sim
    np.fill_diagonal(dist, 0)
    labels = DBSCAN(eps=eps, min_samples=2, metric="precomputed").fit_predict(dist)
    return labels.tolist()


async def cluster_brand_families(brand_id: str, eps: float = 0.25):
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ad).where(Ad.brand_id == brand_id))
        ads = result.scalars().all()
        if not ads:
            return

        embeddings: list[np.ndarray] = []
        for ad in ads:
            t = embed_text(ad.title or "")
            v = await embed_thumbnail(ad.thumbnail_url) if ad.thumbnail_url else None
            embeddings.append(combine(t, v))

        labels = compute_clusters(embeddings, eps)

        label_to_family: dict[int, str] = {}
        for label in set(labels):
            if label >= 0:
                label_to_family[label] = str(uuid.uuid4())

        counts: dict[str, int] = {}
        for ad, label in zip(ads, labels):
            fid = label_to_family.get(label, str(uuid.uuid4()))
            ad.creative_family_id = fid
            counts[fid] = counts.get(fid, 0) + 1

        for ad in ads:
            ad.variant_count = counts.get(ad.creative_family_id, 1)

        await db.commit()
```

---

## New requirements to add

Add to `backend/requirements.txt`:

```
sentence-transformers==3.0.1
transformers==4.41.0
torch==2.3.0
Pillow==10.3.0
scikit-learn==1.5.0
```

These are large packages (~2GB for torch + transformers). For production, consider loading models only when the worker starts rather than on every import.

---

## API endpoint to expose

Add to `backend/app/api/v1/routers/brands.py`:

```python
from app.services.analysis.similarity_tree import cluster_brand_families

@router.post("/{brand_id}/cluster")
async def trigger_clustering(brand_id: str, background_tasks: BackgroundTasks):
    """Re-cluster all ads for a brand into creative families."""
    background_tasks.add_task(cluster_brand_families, brand_id)
    return {"queued": True}
```

---

## How families appear in the Web screen

The Web screen (`BrandWeb.tsx`) receives ad nodes from `GET /api/v1/brands/{brandId}/web`. Each node already has `creative_family_id`. The frontend uses this to draw edges between related nodes.

In [frontend/src/components/web/BrandWeb.tsx](../frontend/src/components/web/BrandWeb.tsx), after the D3 circles are drawn, add a link layer:

```typescript
// Group nodes by family
const families = d3.group(allNodes, d => d.creative_family_id);

// Draw edges between siblings
families.forEach((members) => {
  if (members.length < 2) return;
  for (let i = 0; i < members.length - 1; i++) {
    svg.append("line")
      .attr("stroke", "#374151")  // gray-700
      .attr("stroke-width", 1)
      .attr("opacity", 0.4)
      .attr("x1", members[i].x).attr("y1", members[i].y)
      .attr("x2", members[i + 1].x).attr("y2", members[i + 1].y);
  }
});
```

Draw lines before circles so they render behind the nodes.

---

## Scaling beyond ~500 ads

DBSCAN on a full N×N distance matrix is O(N²) in memory. For larger portfolios:

**Option A — FAISS approximate nearest neighbours**

```python
import faiss

def build_faiss_index(embeddings: list[np.ndarray]) -> faiss.Index:
    dim = len(embeddings[0])
    index = faiss.IndexFlatIP(dim)  # inner product = cosine on normalised vecs
    matrix = np.array(embeddings).astype("float32")
    index.add(matrix)
    return index

# Query: for each ad, find its k nearest neighbours
def find_neighbours(index, embeddings, k=10) -> list[list[int]]:
    matrix = np.array(embeddings).astype("float32")
    scores, indices = index.search(matrix, k)
    return indices.tolist()
```

Then build a graph from the neighbour lists and use connected-components instead of DBSCAN.

**Option B — Batch by platform first**

Run clustering separately per platform (Meta ads vs TikTok ads) since cross-platform families are rare. Halves the matrix size.

---

## Failure modes and edge cases

| Scenario | How to handle |
|---|---|
| Ad has no title and no thumbnail | Embed empty string; zero visual vector. It will cluster loosely with other title-less ads. Acceptable for demo. |
| Thumbnail URL returns 404 | `embed_thumbnail` catches the exception and returns `None` — falls back to text-only. |
| Brand has only 1 ad | `DBSCAN` with `min_samples=2` returns `-1` for it — it gets a unique family ID. `variant_count = 1`. |
| Two brands accidentally get the same `creative_family_id` | Can't happen — family IDs are UUIDs generated fresh per clustering run. |
| Models fail to load (no internet, no GPU) | Wrap model loading in `try/except` and degrade gracefully — skip clustering, leave `creative_family_id = None`. |

---

## Suggested implementation order

1. Install dependencies (`sentence-transformers`, `scikit-learn`, `Pillow`)
2. Implement text-only clustering first (no CLIP) — faster to test, still meaningful
3. Add `cluster_brand_families` router endpoint
4. Seed some test ads into the DB and verify families are assigned correctly
5. Add CLIP visual embeddings once text-only is confirmed working
6. Wire the trigger into `sync_brand_ads` so it runs automatically post-ingestion
7. Update `BrandWeb.tsx` to draw family edges using the `creative_family_id` field
