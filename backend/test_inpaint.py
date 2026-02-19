"""Test with user's actual image from artifacts."""
import torch
from simple_lama_inpainting import SimpleLama
from PIL import Image, ImageDraw
import numpy as np

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {device}")
lama = SimpleLama(device=device)

# Load user's actual image
img_path = r"C:\Users\UmutS\.gemini\antigravity\brain\29ed64a3-dd94-4173-8f07-b92d1c21f994\media__1771108213894.jpg"
img = Image.open(img_path).convert("RGB")
w, h = img.size
print(f"Image size: {w}x{h}")

# Create mask
mask = Image.new("L", (w, h), 0)
draw = ImageDraw.Draw(mask)

logo_w = int(w * 0.18)
logo_h = int(h * 0.08)
left = w - logo_w
top = h - logo_h
print(f"Mask: ({left},{top}) -> ({w},{h}), size={logo_w}x{logo_h}")

draw.rectangle([left, top, w, h], fill=255)

# Run inpainting
print("Running inpainting...")
result = lama(img, mask)
print(f"Result size: {result.size}")

# Check result quality in mask area
result_np = np.array(result)
mask_region = result_np[top:h, left:w]
print(f"Mask region mean: {mask_region.mean():.1f}")
print(f"Mask region max: {mask_region.max()}")
print(f"Is white? {mask_region.mean() > 240}")

# Check a specific pixel
center_y = (top + h) // 2
center_x = (left + w) // 2
print(f"Center pixel of mask: {result_np[center_y, center_x]}")

result.save("user_test_result.jpg", quality=95)
print("Saved user_test_result.jpg")
