import numpy as np
from simple_lama_inpainting import SimpleLama
from PIL import Image
import io
import torch

# Check for CUDA
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🚀 Using device: {device}")
if device.type == "cuda":
    print(f"   GPU: {torch.cuda.get_device_name(0)}")
    print(f"   VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

# Initialize LaMa model
lama = SimpleLama(device=device)
print("✅ LaMa model loaded successfully!")


def inpaint_with_mask(image_bytes: bytes, mask_bytes: bytes) -> bytes:
    """
    Inpaint an image using a user-provided mask.
    White areas in the mask will be removed/filled by AI.
    """
    # Load image and mask
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    mask = Image.open(io.BytesIO(mask_bytes)).convert("L")
    
    orig_w, orig_h = image.size
    print(f"DEBUG: Image: {orig_w}x{orig_h}, Mask: {mask.size}")
    
    # Ensure mask matches image size
    if mask.size != image.size:
        mask = mask.resize(image.size, Image.NEAREST)
    
    # Run LaMa inpainting
    result = lama(image, mask)
    
    # Fix padding: SimpleLama pads to multiples of 8
    if result.size != (orig_w, orig_h):
        result = result.crop((0, 0, orig_w, orig_h))
    
    # Save as JPEG
    output_buffer = io.BytesIO()
    result.save(output_buffer, format="JPEG", quality=95)
    print(f"DEBUG: Done! Output: {len(output_buffer.getvalue())} bytes")
    return output_buffer.getvalue()
