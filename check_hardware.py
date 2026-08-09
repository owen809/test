"""
check_hardware.py — Run this first to verify your setup before starting the app.
Usage: python check_hardware.py

Prints GPU info, VRAM, the settings convert.py will use, and runs a tiny
test conversion if you pass an image path as an optional argument:
    python check_hardware.py test_photo.jpg
"""

import sys


def main():
    print("=" * 60)
    print("  Hardware Check for 2D→3D Converter")
    print("=" * 60)

    # --- PyTorch ---
    try:
        import torch
        print(f"\n✅ PyTorch {torch.__version__} installed")
    except ImportError:
        print("\n❌ PyTorch not found.")
        print("   Install for your platform — see README.md")
        sys.exit(1)

    # --- GPU ---
    if torch.cuda.is_available():
        count = torch.cuda.device_count()
        for i in range(count):
            props = torch.cuda.get_device_properties(i)
            vram_gb = props.total_memory / (1024 ** 3)
            print(f"\n✅ GPU {i}: {props.name}")
            print(f"   VRAM: {vram_gb:.1f} GB")

            if vram_gb >= 16:
                print("   Profile: HIGH-END  (resolution=256, chunk=131072)")
                print("   Expected conversion time: ~10–30 seconds")
            elif vram_gb >= 4:
                print("   Profile: LOW-END   (resolution=128, chunk=8192)")
                print("   Expected conversion time: ~60–120 seconds")
                print("   ⚠️  4 GB VRAM is the minimum. Close other GPU apps while converting.")
            else:
                print("   Profile: CPU fallback (< 4 GB VRAM)")
                print("   Expected conversion time: 5–15 minutes")
    else:
        print("\n⚠️  No CUDA GPU detected → will use CPU")
        print("   AMD 7900XTX users: make sure you installed the ROCm PyTorch build.")
        print("   See README.md → 'Install Python deps (7900XTX / AMD ROCm)'")
        print("   Expected conversion time: 5–15 minutes on CPU")

    # --- TripoSR ---
    try:
        from tsr.system import TSR  # noqa: F401
        print("\n✅ TripoSR library found")
    except ImportError:
        print("\n❌ TripoSR not installed.")
        print("   pip install git+https://github.com/VAST-AI-Research/TripoSR.git")
        sys.exit(1)

    # --- Pillow ---
    try:
        from PIL import Image  # noqa: F401
        import PIL
        print(f"✅ Pillow {PIL.__version__} found")
    except ImportError:
        print("❌ Pillow not installed — run: pip install Pillow")
        sys.exit(1)

    # --- trimesh ---
    try:
        import trimesh  # noqa: F401
        print(f"✅ trimesh found")
    except ImportError:
        print("❌ trimesh not installed — run: pip install trimesh")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("  All checks passed! ✅")
    print("=" * 60)

    # Optional test conversion
    if len(sys.argv) == 2:
        test_image = sys.argv[1]
        import os
        if not os.path.exists(test_image):
            print(f"\n⚠️  Test image not found: {test_image}")
            sys.exit(1)
        print(f"\nRunning test conversion on: {test_image}")
        import subprocess
        result = subprocess.run(
            [sys.executable, "convert.py", test_image, "test_output.glb"],
            capture_output=False,
        )
        if result.returncode == 0:
            print("\n✅ Test conversion succeeded → test_output.glb")
        else:
            print("\n❌ Test conversion failed (see output above)")
    else:
        print("\nTip: run  python check_hardware.py some_photo.jpg  to do a full test conversion.")


if __name__ == "__main__":
    main()
