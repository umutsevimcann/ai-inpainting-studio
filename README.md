# AI Inpainting Studio 🎨

![AI Inpainting Studio](https://raw.githubusercontent.com/username/repo/main/screenshot.png)

**AI Inpainting Studio** is a powerful, self-hosted web application for removing objects, watermarks, and defects from images using the state-of-the-art **LaMa (Large Mask Inpainting)** AI model.

It runs entirely locally on your machine with **GPU acceleration (CUDA)**, offering a professional Photoshop-like interface for manual masking and instant AI cleaning. No cloud subscriptions, no data limits.

## ✨ Features

- **🚀 GPU Accelerated**: Powered by PyTorch & CUDA for lightning-fast inpainting.
- **🖌️ Interactive Canvas**: Photoshop-style brush and eraser tools.
- **🔍 Zoom & Pan**: Precision control with zoom, pan, and navigation support.
- **History System**: Full Undo/Redo support (`Ctrl+Z`, `Ctrl+Y`).
- **Comparing**: Before/After toggle to see the magic.
- **Privacy Focused**: 100% offline. Your images never leave your computer.
- **High Quality**: Uses the LaMa model for high-resolution, coherent inpainting results.

## 🛠️ Installation

### Prerequisites
- **NVIDIA GPU** (Required for CUDA acceleration)
- **Python 3.10+**
- **Node.js 18+**
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/umutsevimcann/ai-inpainting-studio.git
cd ai-inpainting-studio
```

### 2. Backend Setup (Python)
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # Mac/Linux

# Install PyTorch with CUDA 12.1
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup (React)
```bash
cd ../frontend
npm install
```

## 🚀 Running the App (One-Click)

Just run the `start.bat` file! It will automatically:
1. Check dependencies.
2. Install Python/Node packages if missing.
3. Start both Backend and Frontend.
4. Open your browser.

---

### Manual Start (Alternative)
If you prefer manual control:

### Start Backend
```bash
cd backend
.\venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Start Frontend
```bash
cd frontend
npm run dev
```

Open your browser at **http://localhost:5173**.

## 🎮 Controls

| Key | Action |
| :--- | :--- |
| **B** | Brush Tool |
| **E** | Eraser Tool |
| **[ / ]** | Decrease / Increase Brush Size |
| **Ctrl + Z** | Undo |
| **Ctrl + Y** | Redo |
| **Scroll** | Zoom In / Out |
| **Middle Click / Alt + Drag** | Pan Canvas |

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📄 License

MIT License.
