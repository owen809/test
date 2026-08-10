"""
convert.py — TripoSR wrapper with automatic hardware detection
Usage: python convert.py <input_image> <output_glb>

Automatically adjusts quality settings based on available GPU VRAM:
  ≥ 16 GB VRAM  (e.g. 7900XTX 24 GB)  → resolution 256, chunk 131072  (best quality, fast)
  4–15 GB VRAM  (e.g. GTX 1650 4 GB)   → resolution 128, chunk 8192    (safe for 4 GB)
  No GPU / CPU only                     → resolution 64,  chunk 4096    (slow but works)

Install deps — see README.md for platform-specific (ROCm vs CUDA) instructions.
"""

import sys
import os


def detect_settings():
    """Return (device, marching_cubes_resolution, chunk_size) based on available VRAM."""
    try:
        import torch
    except ImportError:
        return "cpu", 64, 4096

    if torch.cuda.is_available():
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        name = torch.cuda.get_device_name(0)
        print(f"GPU detected: {name}  ({vram_gb:.1f} GB VRAM)")
        if vram_gb >= 16:
            # High-end: 7900XTX (24 GB), 3090, 4090, etc.
            return "cuda", 256, 131072
        elif vram_gb >= 4:
            # Mid/low: GTX 1650 (4 GB), GTX 1660, RTX 3050, etc.
            # Lower resolution + smaller chunks avoids OOM on 4 GB cards
            return "cuda", 128, 8192
        else:
            # < 4 GB — fall back to CPU to avoid crash
            print("Warning: < 4 GB VRAM detected. Falling back to CPU.")
            return "cpu", 64, 4096

    # ROCm (AMD) reports as CUDA-compatible when using the ROCm PyTorch build
    # If torch.cuda.is_available() is False on a ROCm system, torch.device("hip") won't
    # exist in older builds, so we just use CPU as a safe default.
    print("No CUDA/ROCm GPU detected. Using CPU (this will be slow).")
    return "cpu", 64, 4096


def main():
    if len(sys.argv) != 3:
        print("Usage: python convert.py <input_image> <output_glb>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(f"Error: input file not found: {input_path}")
        sys.exit(1)

    try:
        from tsr.system import TSR
        from PIL import Image
        import torch
    except ImportError as e:
        print(f"Missing dependency: {e}")
        print(
            "Run the correct install command for your hardware — see README.md "
            "(ROCm section for 7900XTX, CUDA section for GTX 1650)."
        )
        sys.exit(1)

    device, mc_resolution, chunk_size = detect_settings()
    print(f"Settings → device={device}  resolution={mc_resolution}  chunk={chunk_size}")

    print("Loading TripoSR model (first run downloads ~1 GB of weights)…")
    model = TSR.from_pretrained(
        "stabilityai/TripoSR",
        config_name="config.yaml",
        weight_name="model.ckpt",
    )
    model.renderer.set_chunk_size(chunk_size)
    model.to(device)

    print(f"Loading image: {input_path}")
    image = Image.open(input_path).convert("RGB")

    print("Running inference…")
    with torch.no_grad():
        scene_codes = model([image], device=device)

    print(f"Extracting mesh at resolution {mc_resolution}…")
    model.set_marching_cubes_resolution(mc_resolution)
    meshes = model.extract_mesh(scene_codes, has_vertex_color=False)

    meshes[0].export(output_path)
    print(f"Done → {output_path}")


if __name__ == "__main__":
    main()
