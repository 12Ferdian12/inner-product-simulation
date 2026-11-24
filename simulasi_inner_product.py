"""
Simulasi Inner Product (Dot Product) Vektor - CLI / Python
Menghitung inner product standar maupun terbobot, norma vektor,
sudut antar vektor, cosine similarity, dan proyeksi ortogonal.
"""

import math
from typing import List, Optional


def inner_product(u: List[float], v: List[float], weights: Optional[List[float]] = None) -> float:
    """Menghitung inner product <u, v> (standar atau terbobot)."""
    if len(u) != len(v):
        raise ValueError("Dimensi vektor u dan v harus sama.")
    if weights is None:
        weights = [1.0] * len(u)
    return sum(w * ui * vi for w, ui, vi in zip(weights, u, v))


def vector_norm(u: List[float], weights: Optional[List[float]] = None) -> float:
    """Menghitung panjang/norma vektor ||u|| = sqrt(<u, u>)."""
    return math.sqrt(inner_product(u, u, weights))


def simulate_vectors(u: List[float], v: List[float], weights: Optional[List[float]] = None) -> None:
    """Menampilkan hasil lengkap simulasi inner product dua vektor."""
    ip = inner_product(u, v, weights)
    norm_u = vector_norm(u, weights)
    norm_v = vector_norm(v, weights)

    if norm_u > 1e-9 and norm_v > 1e-9:
        cos_theta = max(-1.0, min(1.0, ip / (norm_u * norm_v)))
        angle_deg = math.degrees(math.acos(cos_theta))
    else:
        cos_theta = 0.0
        angle_deg = 0.0

    if norm_v > 1e-9:
        scalar_proj = ip / norm_v
        factor = ip / (norm_v ** 2)
        vector_proj = [round(factor * vi, 4) for vi in v]
    else:
        scalar_proj = 0.0
        vector_proj = [0.0] * len(v)

    if abs(ip) < 1e-6:
        kategori = "Ortogonal / Tegak Lurus (θ = 90°)"
    elif ip > 0:
        kategori = "Sudut Lancip / Searah (θ < 90°)"
    else:
        kategori = "Sudut Tumpul / Berlawanan Arah (θ > 90°)"

    print("=" * 55)
    print(f"Vektor u            : {u}")
    print(f"Vektor v            : {v}")
    if weights:
        print(f"Bobot W             : {weights}")
    print("-" * 55)
    print(f"Inner Product <u,v> : {ip:.4f}")
    print(f"Norma ||u||         : {norm_u:.4f}")
    print(f"Norma ||v||         : {norm_v:.4f}")
    print(f"Cosine Similarity   : {cos_theta:.4f}")
    print(f"Sudut θ             : {angle_deg:.2f}°")
    print(f"Hubungan Geometris  : {kategori}")
    print(f"Proyeksi Skalar     : {scalar_proj:.4f}")
    print(f"Proyeksi Vektor u→v : {vector_proj}")
    print("=" * 55)
    print()


if __name__ == "__main__":
    print("\n--- SIMULASI INNER PRODUCT VEKTOR ---\n")

    # Skenario 1: Sudut Lancip (<u, v> > 0)
    print("[Skenario 1: Sudut Lancip]")
    simulate_vectors([4, 3, 0], [5, 0, 0])

    # Skenario 2: Ortogonal (<u, v> = 0)
    print("[Skenario 2: Vektor Ortogonal]")
    simulate_vectors([0, 4, 0], [5, 0, 0])

    # Skenario 3: Sudut Tumpul (<u, v> < 0)
    print("[Skenario 3: Sudut Tumpul]")
    simulate_vectors([-4, 3, 0], [5, 0, 0])

    # Skenario 4: Inner Product Terbobot di R^3
    print("[Skenario 4: Weighted Inner Product di R^3]")
    simulate_vectors([2, 1, 3], [1, 4, -1], weights=[2.0, 1.0, 0.5])
