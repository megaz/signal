import numpy as np

from app.services.analysis.similarity_tree import (
    TEXT_DIM,
    VISUAL_DIM,
    assign_families,
    combine,
    compute_clusters,
)


def test_combine_text_only():
    text_vec = np.ones(TEXT_DIM)
    result = combine(text_vec, None)
    assert result.shape == (TEXT_DIM + VISUAL_DIM,)
    assert np.isclose(np.linalg.norm(result), 1.0)


def test_combine_with_visual():
    text_vec = np.ones(TEXT_DIM)
    visual_vec = np.ones(VISUAL_DIM) * 2
    result = combine(text_vec, visual_vec)
    expected = np.concatenate([text_vec * 0.4, visual_vec * 0.6])
    expected = expected / np.linalg.norm(expected)
    assert np.allclose(result, expected)


def test_compute_clusters_identical_embeddings():
    vec = np.array([1.0, 0.0, 0.0])
    embeddings = [vec, vec.copy(), vec.copy()]
    labels = compute_clusters(embeddings)
    assert len(set(labels)) == 1
    assert labels[0] >= 0


def test_compute_clusters_dissimilar_embeddings():
    embeddings = [
        np.array([1.0, 0.0, 0.0]),
        np.array([0.0, 1.0, 0.0]),
        np.array([0.0, 0.0, 1.0]),
    ]
    labels = compute_clusters(embeddings, eps=0.25)
    assert all(label == -1 for label in labels)


def test_compute_clusters_single_ad():
    labels = compute_clusters([np.array([1.0, 0.0, 0.0])])
    assert labels == [-1]


def test_assign_families_clustered_and_standalone():
    labels = [0, 0, -1]
    family_ids, counts = assign_families(labels)
    assert family_ids[0] == family_ids[1]
    assert family_ids[0] != family_ids[2]
    assert counts[family_ids[0]] == 2
    assert counts[family_ids[2]] == 1
