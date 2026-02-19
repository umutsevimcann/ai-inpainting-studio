@echo off
title AI Inpainting Studio Launcher
cls

:: Calisma dizinini bat dosyasinin oldugu yer yap
cd /d "%~dp0"

echo ==============================================================================
echo   AI INPAINTING STUDIO - OTO-KURULUM VE BASLATICI
echo ==============================================================================
echo.

:: 1. KONTROLLER
echo [1/4] Sistem kontrolleri yapiliyor...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [UYARI] 'python' komutu bulunamadi. 'py' deneniyor...
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [HATA] Python bulunamadi!
        echo Lutfen Python 3.10 veya uzerini kurun ve "Add to PATH" secenegini isaretleyin.
        pause
        exit /b
    ) else (
        set PYTHON_CMD=py
        echo   * Python py mevcut.
    )
) else (
    set PYTHON_CMD=python
    echo   * Python mevcut.
)

call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Node.js ^(npm^) bulunamadi!
    echo Lutfen Node.js ^(LTS surumu^) kurun: https://nodejs.org/
    pause
    exit /b
)
echo   * Node.js mevcut.

:: 2. BACKEND KURULUMU
echo.
echo [2/4] Backend (Yapay Zeka Servisi) hazirlaniyor...

if not exist "backend\venv" (
    echo   ! Ilk kurulum tespit edildi. Sanal ortam olusturuluyor...
    cd backend
    %PYTHON_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo [HATA] Sanal ortam olusturulamadi.
        pause
        exit /b
    )
    
    echo   ! Kutuphaneler yukleniyor...
    call venv\Scripts\activate
    
    echo     - PyTorch ^(CUDA^) yukleniyor...
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
    
    echo     - Diger gereksinimler yukleniyor...
    pip install -r requirements.txt
    
    cd ..
    echo   * Backend kurulumu tamamlandi.
) else (
    echo   * Backend zaten kurulu. Geciliyor.
)

:: 3. FRONTEND KURULUMU
echo.
echo [3/4] Frontend (Arayuz) hazirlaniyor...

if not exist "frontend\node_modules" (
    echo   ! Ilk kurulum tespit edildi. Paketler yukleniyor ^(npm install^)...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo [HATA] npm install basarisiz oldu.
        cd ..
        pause
        exit /b
    )
    cd ..
    echo   * Frontend kurulumu tamamlandi.
) else (
    echo   * Frontend zaten kurulu. Geciliyor.
)

:: 4. BASLATMA
echo.
echo [4/4] Uygulama baslatiliyor...
echo.
echo   --------------------------------------------------------
echo   Backend ve Frontend yeni pencerelerde acilacak.
echo   Lutfen o pencereleri KAPATMAYIN.
echo   Tarayici otomatik olarak acilacaktir...
echo   --------------------------------------------------------
echo.

:: Backend
start "AI Inpainting Backend" cmd /k "cd backend && venv\Scripts\activate && %PYTHON_CMD% -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Frontend
start "AI Inpainting Frontend" cmd /k "cd frontend && npm run dev"

:: Tarayıcıyı Aç
timeout /t 5 >nul
start http://localhost:5173

echo.
echo Baslatma islemi tamamlandi. Iyi calismalar!
echo (Bu pencereyi kapatabilirsiniz)
timeout /t 10
