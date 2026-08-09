"""
convert_7900xtx.py — TripoSR converter tuned for RX 7900XTX (24 GB VRAM)
Usage: python convert_7900xtx.py <input_image> <output_glb>

Uses maximum quality settings that are only safe on ≥16 GB VRAM cards:
  - Marching cubes resolution: 320  (higher than default 256 = finer mesh detail)
  - Chunk size: 262144              (large chunks = faster rendering pass)
  - Batch inference: supported      (you can pass multiple images)
  - Half-precision (fp16): enabled  (cuts VRAM use in half, faster on AMD)

For multi-image batch usage:
  python convert_7900xtx.py image1.jpg image2.jpg image3.png  (space-separated)
  → produces image1.glb  image2.glb  image3.glb alongside each input

Requires ROCm PyTorch:
  pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.0
  pip install -r requirements_7900xtx.txt
  pip install git+https://github.com/VAST-AI-Research/TripoSR.git
"""

import sys
import os
import time
from pathlib import Path


# --- 7900XTX-tuned constants ---
MC_RESOLUTION = 320      # mesh detail (256 = default, 320 = higher quality)
CHUNK_SIZE    = 262144   # renderer chunk size (131072 = default, bigger = faster)
USE_FP16      = True     # half-precision — halves VRAM, faster on RDNA3
DEVICE        = "cuda"   # ROCm PyTorch exposes AMD GPU as "cuda"


def load_model():
    from tsr.system import TSR
    import torch

    print("Loading TripoSR model (first run downloads ~1 GB)…")
    model = TSR.from_pretrained(
        "stabilityai/TripoSR",
        config_name="config.yaml",
        weight_name="model.ckpt",
    )
    model.renderer.set_chunk_size(CHUNK_SIZE)

    if USE_FP16:
        model = model.half()   # fp16 — safe on 7900XTX, saves ~12 GB VRAM
        print("Using fp16 (half precision) for faster inference")

    model.to(DEVICE)
    print(f"Model loaded on {DEVICE}")
    return model


def convert_one(model, input_path: str, output_path: str):
    from PIL import Image
    import torch

    print(f"\n→ Converting: {input_path}")
    t0 = time.time()

    image = Image.open(input_path).convert("RGB")

    with torch.no_grad():
        scene_codes = model([image], device=DEVICE)

    model.set_marching_cubes_resolution(MC_RESOLUTION)
    meshes = model.extract_mesh(scene_codes, has_vertex_color=False)
    meshes[0].export(output_path)

    elapsed = time.time() - t0
    print(f"   Done in {elapsed:.1f}s → {output_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_7900xtx.py <image1> [image2 image3 …]")
        sys.exit(1)

    import torch

    # Confirm GPU
    if not torch.cuda.is_available():
        print("ERROR: No ROCm/CUDA GPU detected.")
        print("Make sure you installed PyTorch with ROCm support:")
        print("  pip install torch torchvision --index-url https://download.pytorch.org/whl/rocm6.0")
        sys.exit(1)

    gpu_name = torch.cuda.get_device_name(0)
    vram_gb  = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    print(f"GPU: {gpu_name}  ({vram_gb:.1f} GB VRAM)")
    print(f"Settings: resolution={MC_RESOLUTION}  chunk={CHUNK_SIZE}  fp16={USE_FP16}")

    input_paths = sys.argv[1:]
    missing = [p for p in input_paths if not os.path.exists(p)]
    if missing:
        print(f"ERROR: File(s) not found: {', '.join(missing)}")
        sys.exit(1)

    model = load_model()

    for input_path in input_paths:
        p = Path(input_path)
        output_path = str(p.with_suffix(".glb"))
        convert_one(model, input_path, output_path)

    print(f"\nAll done. Converted {len(input_paths)} image(s).")


if __name__ == "__main__":
    main()
