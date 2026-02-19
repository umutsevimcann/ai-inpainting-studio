import cv2
img = cv2.imread('test_image.jpg')
if img is not None:
    print(f"IMAGE_SHAPE: {img.shape}")
else:
    print("FAILED_TO_LOAD")
