# Gemini Logo Temizleyici - Taşıma ve Kurulum Rehberi

Bu projeyi başka bir bilgisayara taşımak için izlemeniz gereken adımlar aşağıdadır. Sistem **NVIDIA GPU (CUDA)** gerektirir.

## 1. Kurulum Yöntemi (GitHub'dan)

En kolay yöntem budur. Yeni bilgisayarda şu komutu çalıştırarak projeyi indir:

```powershell
git clone https://github.com/umutsevimcann/ai-inpainting-studio.git
cd ai-inpainting-studio
```

*(Eğer Git kurulu değilse, projeyi GitHub sayfasından "Download ZIP" diyerek indirip klasöre çıkartabilirsin.)*

**`start.bat` (Otomatik Başlatıcı)** dosyasını çalıştırarak kurulumu ve başlatmayı tek tıkla yapabilirsin.

Eğer manuel kurulum yapmak istersen aşağıdaki adımları takip et.

---

## 2. Yeni Bilgisayar Gereksinimleri
Yeni bilgisayarda şunların kurulu olması gerekir:

1.  **Python 3.10 veya üzeri**: (Kurarken "Add Python to PATH" işaretlemeyi unutma)
2.  **Node.js**: (Frontend bağımlılıkları için)
3.  **NVIDIA Sürücüleri**: (Güncel ekran kartı sürücüsü)
4.  **CUDA Toolkit 12.1** (Önerilen) veya uyumlu sürüm.

---

## 3. Kurulum Adımları (Sırasıyla Yapın)

### Adım A: Backend (Python) Kurulumu
1.  CMD veya PowerShell'i açın ve `backend` klasörüne gidin:
    ```powershell
    cd gemini-watermark-remover/backend
    ```
2.  Sanal ortam (venv) oluşturun:
    ```powershell
    python -m venv venv
    ```
3.  Sanal ortamı aktif edin:
    ```powershell
    .\venv\Scripts\activate
    ```
4.  PyTorch (CUDA destekli) yükleyin:
    ```powershell
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
    ```
5.  Diğer gereksinimleri yükleyin:
    ```powershell
    pip install fastapi uvicorn python-multipart opencv-python-headless numpy pillow simple-lama-inpainting
    ```

### Adım B: Frontend (React) Kurulumu
1.  Yeni bir terminal açın ve `frontend` klasörüne gidin:
    ```powershell
    cd gemini-watermark-remover/frontend
    ```
2.  Bağımlılıkları yükleyin:
    ```powershell
    npm install
    ```

---

## 4. Uygulamayı Çalıştırma

Her seferinde projeyi başlatmak için iki ayrı terminalde şu komutları çalıştırın:

**Terminal 1 (Backend):**
```powershell
cd gemini-watermark-remover/backend
.\venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*(İlk çalıştırmada yapay zeka modeli internetten indirilir, biraz sürebilir)*

**Terminal 2 (Frontend):**
```powershell
cd gemini-watermark-remover/frontend
npm run dev
```

Tarayıcıda **http://localhost:5173** adresine gidin.
