from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from core.remover import inpaint_with_mask

app = FastAPI(title="AI Inpainting API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "AI Inpainting API is running"}

@app.post("/inpaint")
async def inpaint(
    image: UploadFile = File(...),
    mask: UploadFile = File(...)
):
    """Accept an image and a mask, return the inpainted result."""
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        image_bytes = await image.read()
        mask_bytes = await mask.read()
        
        result = inpaint_with_mask(image_bytes, mask_bytes)
        
        return Response(content=result, media_type="image/jpeg")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
