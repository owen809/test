"""
convert.py — TripoSR wrapper
Usage: python convert.py <input_image> <output_glb>

Install deps first:
    pip install torch torchvision
    pip install git+https://github.com/VAST-AI-Research/TripoSR.git
    pip install Pillow trimesh

The first run downloads ~1 GB of model weights automatically.
"""

import sys
import os

def main():
    if len(sys.argv) != 3:
        print("Usage: python convert.py <input_image> <output_glb>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(f"Error: input file not found: {input_path}")
        sys.exit(1)

    print(f"Loading image: {input_path}")

    try:
        from tsr.system import TSR
        from PIL import Image
        import torch
    except ImportError as e:
        print(f"Missing dependency: {e}")
        print("Run: pip install torch torchvision Pillow git+https://github.com/VAST-AI-Research/TripoSR.git")
        sys.exit(1)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    print("Loading TripoSR model (first run downloads ~1 GB)…")
    model = TSR.from_pretrained(
        "stabilityai/TripoSR",
        config_name="config.yaml",
        weight_name="model.ckpt",
    )
    model.renderer.set_chunk_size(131072)
    model.to(device)

    image = Image.open(input_path).convert("RGB")

    print("Running inference…")
    with torch.no_grad():
        scene_codes = model([image], device=device)

    print("Extracting mesh…")
    model.set_marching_cubes_resolution(256)
    meshes = model.extract_mesh(scene_codes, has_vertex_color=False)

    meshes[0].export(output_path)
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    main()
