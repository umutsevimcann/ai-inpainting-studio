import { useState, useRef, useCallback, useEffect } from 'react';
import './index.css';

type Tool = 'brush' | 'eraser';
type Point = { x: number; y: number };

interface ImageItem {
  id: string;
  originalFile: File;
  originalImage: string;
  processedImage: string | null;
  history: ImageData[];
  historyIndex: number;
  scale: number;
  position: Point;
  // We keep brush state global for simplicity, or we could per-image. Global is fine.
}

function App() {
  // --- Global State ---
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  // Tools & UI State
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<Point>({ x: 0, y: 0 });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived Active State
  const activeImage = images.find(img => img.id === activeImageId);

  // --- File Handling (Multi) ---
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) loadImages(Array.from(files));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files) loadImages(Array.from(files));
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const loadImages = async (files: File[]) => {
    setError(null);
    const validFiles = files.filter(f => f.type.startsWith('image/'));

    if (validFiles.length === 0) {
      setError('Invalid image file(s).');
      return;
    }

    const newImages: ImageItem[] = [];

    for (const file of validFiles) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      newImages.push({
        id: crypto.randomUUID(),
        originalFile: file,
        originalImage: base64,
        processedImage: null,
        history: [],
        historyIndex: -1,
        scale: 1,
        position: { x: 0, y: 0 }
      });
    }

    setImages(prev => {
      const combined = [...prev, ...newImages];
      if (!activeImageId && combined.length > 0) {
        setActiveImageId(combined[0].id);
      }
      return combined;
    });
  };

  // Switch image view
  const switchImage = (id: string) => {
    setActiveImageId(id);
  };

  // --- Canvas Setup (Context Switching) ---
  const onImageLoad = useCallback(() => {
    if (!activeImage) return;
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    // Only configure canvas on first load of this specific image's lifecycle
    if (activeImage.history.length === 0) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        setImages(prev => prev.map(item =>
          item.id === activeImage.id
            ? { ...item, history: [initialData], historyIndex: 0 }
            : item
        ));
      }

      const container = containerRef.current?.parentElement;
      if (container) {
        const fitScale = Math.min(
          (container.clientWidth - 80) / img.naturalWidth,
          (window.innerHeight - 200) / img.naturalHeight // Leave room for thumb bar
        );

        setImages(prev => prev.map(item =>
          item.id === activeImage.id
            ? { ...item, scale: Math.min(fitScale, 1) }
            : item
        ));
      }
    } else {
      // We are restoring a previously loaded image, restore its canvas state
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      const currentData = activeImage.history[activeImage.historyIndex];
      if (ctx && currentData) {
        ctx.putImageData(currentData, 0, 0);
      }
    }
  }, [activeImage]);

  // --- History Management ---
  const saveHistory = () => {
    if (!activeImage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = activeImage.history.slice(0, activeImage.historyIndex + 1);
    newHistory.push(data);
    if (newHistory.length > 20) newHistory.shift();

    setImages(prev => prev.map(item =>
      item.id === activeImage.id
        ? { ...item, history: newHistory, historyIndex: newHistory.length - 1 }
        : item
    ));
  };

  const undo = () => {
    if (!activeImage || activeImage.historyIndex <= 0) return;
    const newIndex = activeImage.historyIndex - 1;

    setImages(prev => prev.map(item =>
      item.id === activeImage.id ? { ...item, historyIndex: newIndex } : item
    ));

    restoreHistory(activeImage, newIndex);
  };

  const redo = () => {
    if (!activeImage || activeImage.historyIndex >= activeImage.history.length - 1) return;
    const newIndex = activeImage.historyIndex + 1;

    setImages(prev => prev.map(item =>
      item.id === activeImage.id ? { ...item, historyIndex: newIndex } : item
    ));

    restoreHistory(activeImage, newIndex);
  };

  const restoreHistory = (imgDef: ImageItem, idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imgDef.history[idx]) return;
    ctx.putImageData(imgDef.history[idx], 0, 0);
  };

  // --- Interaction Logic ---
  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

    if (tool === 'brush') {
      ctx.fillStyle = 'rgba(226, 255, 70, 0.7)';
      ctx.strokeStyle = 'rgba(226, 255, 70, 0.7)';
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    }

    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!activeImage) return;
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - activeImage.position.x, y: e.clientY - activeImage.position.y });
      return;
    }
    if (e.button === 0) {
      setIsDrawing(true);
      const p = getCanvasPoint(e);
      if (p) draw(p.x, p.y);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!activeImage) return;
    if (isPanning) {
      const newPos = { x: e.clientX - startPan.x, y: e.clientY - startPan.y };
      setImages(prev => prev.map(item => item.id === activeImage.id ? { ...item, position: newPos } : item));
      return;
    }
    if (isDrawing) {
      const p = getCanvasPoint(e);
      if (p) draw(p.x, p.y);
    }
  };

  const onMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (isDrawing) {
      setIsDrawing(false);
      saveHistory();
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!activeImage) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newScale = Math.min(Math.max(0.1, activeImage.scale + delta), 5);
      setImages(prev => prev.map(item => item.id === activeImage.id ? { ...item, scale: newScale } : item));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b') setTool('brush');
      if (e.key.toLowerCase() === 'e') setTool('eraser');
      if (e.key === '[') setBrushSize(s => Math.max(5, s - 5));
      if (e.key === ']') setBrushSize(s => Math.min(200, s + 5));

      if (activeImage) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          if (e.shiftKey) redo();
          else undo();
          e.preventDefault();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          redo();
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImage]);

  // --- API / Workflow ---
  const handleInpaint = async () => {
    if (!activeImage || !activeImage.originalFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const maskBlob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!maskBlob) throw new Error("Mask generation failed");

      const formData = new FormData();
      formData.append('image', activeImage.originalFile);
      formData.append('mask', maskBlob, 'mask.png');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/inpaint`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Inpainting request failed.');

      const blob = await response.blob();
      const objUrl = URL.createObjectURL(blob);

      setImages(prev => prev.map(item =>
        item.id === activeImage.id ? { ...item, processedImage: objUrl } : item
      ));

    } catch (err) {
      setError('Error: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    const processedImages = images.filter(img => img.processedImage !== null);
    if (processedImages.length === 0) return;

    // For simple multi-download we trigger isolated <a> clicks.
    // Alternatively we could zip them, but this is pure frontend.
    processedImages.forEach((img, index) => {
      const a = document.createElement('a');
      a.href = img.processedImage as string;
      a.download = `cleansed_${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-[var(--bg-color)] flex flex-col items-stretch overflow-hidden text-[var(--text-primary)] relative">

      {/* Editorial Header */}
      <header className="flex justify-between items-center px-6 h-20 border-b border-[var(--border-color)] bg-[var(--bg-color)] z-50 shrink-0">
        <div className="flex items-baseline gap-4">
          <h1 className="text-3xl font-display font-bold uppercase tracking-tighter">Inpaint<span className="text-[var(--text-secondary)]">.Studio</span></h1>
          <span className="font-mono text-xs text-[var(--text-secondary)] border border-[var(--border-color)] px-2 py-1 uppercase tracking-widest hidden sm:inline-block">CUDA Activated</span>
        </div>

        <div className="flex items-center gap-4">
          {images.length > 0 && (
            <button
              onClick={() => { setImages([]); setActiveImageId(null); }}
              className="font-mono text-sm text-[var(--text-secondary)] hover:text-white uppercase tracking-wider transition-colors"
            >
              [ Clear All ]
            </button>
          )}

          {images.some(img => img.processedImage) && (
            <button onClick={handleDownloadAll} className="btn-secondary">
              Download All
            </button>
          )}

          {activeImage && activeImage.processedImage && (
            <a
              href={activeImage.processedImage}
              download={`cleansed_${activeImage.originalFile.name}`}
              className="btn-primary"
            >
              Download
            </a>
          )}

          {activeImage && !activeImage.processedImage && (
            <button
              onClick={handleInpaint}
              disabled={isLoading}
              className="btn-primary group"
            >
              {isLoading ? (
                <span className="font-mono uppercase tracking-widest text-xs animate-pulse">Processing...</span>
              ) : (
                <>
                  <span className="font-mono tracking-widest uppercase text-sm font-bold">Generate</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Main Workspace Area */}
        <main
          ref={containerRef}
          className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#050505]"
          onWheel={activeImage && !activeImage.processedImage ? onWheel : undefined}
        >

          {/* Empty State */}
          {images.length === 0 && (
            <div className="w-full h-full p-8 md:p-24 flex items-center justify-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="w-full h-full max-w-4xl border border-[var(--border-color)] border-dashed hover:border-[var(--text-secondary)] flex flex-col items-center justify-center cursor-pointer transition-colors bg-[var(--surface)]/30 hover:bg-[var(--surface)] group relative overflow-hidden"
              >
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />

                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--text-secondary)_1px,_transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

                <div className="z-10 text-center animate-slide-up">
                  <div className="w-20 h-20 mb-8 border border-[var(--border-color)] bg-[var(--bg-color)] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ease-out mx-auto">
                    <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <h2 className="font-display text-4xl font-medium mb-4 tracking-tight">Drop Source Images</h2>
                  <p className="font-mono text-sm text-[var(--text-secondary)] uppercase tracking-widest">Supports multiple batch files (JPG, PNG, WEBP)</p>
                </div>
              </div>
            </div>
          )}

          {/* Editor View */}
          {activeImage && !activeImage.processedImage && (
            <div className="canvas-container w-full h-full overflow-hidden absolute inset-0 bg-[#0a0a0a]">

              {/* Brutalist Tool Palette */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-0 border border-[var(--border-color)] bg-[var(--bg-color)] shadow-2xl p-2 animate-slide-up">
                <button onClick={() => setTool('brush')} className={`icon-btn ${tool === 'brush' ? 'bg-[var(--text-primary)] text-black border-[var(--text-primary)]' : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface)]'}`} title="Brush (B)">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={() => setTool('eraser')} className={`icon-btn ${tool === 'eraser' ? 'bg-[var(--text-primary)] text-black border-[var(--text-primary)]' : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface)]'}`} title="Eraser (E)">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>

                <div className="w-full h-px bg-[var(--border-color)] my-2"></div>

                <button onClick={undo} disabled={activeImage.historyIndex <= 0} className="icon-btn text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface)] disabled:opacity-20 disabled:cursor-not-allowed">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                </button>
                <button onClick={redo} disabled={activeImage.historyIndex >= activeImage.history.length - 1} className="icon-btn text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface)] disabled:opacity-20 disabled:cursor-not-allowed">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                </button>
              </div>

              {/* Top Settings Bar */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--bg-color)] border border-[var(--border-color)] px-6 py-3 flex items-center gap-6 shadow-2xl animate-slide-up">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-secondary)]">Size</span>
                  <input type="range" min="5" max="200" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-32 accent-[var(--accent)] h-1 bg-[var(--surface)] appearance-none cursor-ew-resize" />
                  <span className="font-mono text-xs text-[var(--text-primary)] w-8 text-right">{brushSize}</span>
                </div>
              </div>

              {/* Canvas Transformation Layer */}
              <div
                style={{
                  transform: `translate(${activeImage.position.x}px, ${activeImage.position.y}px) scale(${activeImage.scale})`,
                  transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
                  transformOrigin: '0 0',
                  cursor: isPanning ? 'grabbing' : (tool === 'eraser' ? 'cell' : 'crosshair')
                }}
                className="absolute top-1/2 left-1/2"
              >
                <div style={{ transform: 'translate(-50%, -50%)', position: 'relative' }}>
                  {/* Keying by ID forces React to fresh load when we switch images */}
                  <img key={activeImage.id} ref={imageRef} src={activeImage.originalImage} onLoad={onImageLoad} className="block pointer-events-none shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[var(--border-color)]" style={{ maxWidth: 'none', maxHeight: 'none' }} alt="workspace" />
                  <canvas ref={canvasRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} className="absolute top-0 left-0 w-full h-full opacity-90" />
                </div>
              </div>

              {/* Status Overlay */}
              <div className="absolute bottom-6 left-6 font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-widest leading-relaxed">
                X: {activeImage.position.x.toFixed(0)}  Y: {activeImage.position.y.toFixed(0)} <br />
                ZOOM: {(activeImage.scale * 100).toFixed(0)}% <br />
                PRESS ALT TO PAN
              </div>
            </div>
          )}

          {/* Result View */}
          {activeImage && activeImage.processedImage && (
            <div className="w-full h-full p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center justify-center bg-[var(--bg-color)] animate-slide-up overflow-hidden min-h-0">

              <div className="flex-1 w-full h-full min-h-0 flex flex-col gap-4">
                <div className="flex justify-between items-center font-mono text-xs text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2 shrink-0">
                  <span>Original</span>
                  <span className="truncate ml-4 max-w-[200px] text-right">{activeImage.originalFile.name}</span>
                </div>
                <div className="relative flex-1 min-h-0 bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-center p-4">
                  <img src={activeImage.originalImage} className="max-w-full max-h-full object-contain filter grayscale opacity-50 transition-all hover:grayscale-0 hover:opacity-100" />
                </div>
              </div>

              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-[var(--text-secondary)] rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>

              <div className="flex-1 w-full h-full min-h-0 flex flex-col gap-4">
                <div className="flex justify-between items-center font-mono text-xs text-[var(--accent)] uppercase tracking-widest border-b border-[var(--accent)] pb-2 shrink-0">
                  <span>Output</span>
                  <span className="truncate ml-4 max-w-[200px] text-right">Cleansed_{activeImage.originalFile.name}</span>
                </div>
                <div className="relative flex-1 min-h-0 bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-center p-4 shadow-[0_0_100px_rgba(226,255,70,0.05)]">
                  <img src={activeImage.processedImage} className="max-w-full max-h-full object-contain" />
                </div>
              </div>

            </div>
          )}

          {error && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-[var(--danger)] text-black font-mono text-sm uppercase font-bold tracking-widest px-6 py-3 border border-red-900 shadow-2xl flex items-center gap-3 z-50">
              <span>[ERROR]</span> {error}
            </div>
          )}

        </main>

        {/* Right Sidebar Thumbnail Gallery */}
        {images.length > 0 && (
          <aside className="w-48 xl:w-64 border-l border-[var(--border-color)] bg-[var(--bg-color)] flex flex-col shrink-0 overflow-hidden z-20 shadow-2xl">
            <div className="px-4 py-3 border-b border-[var(--border-color)]">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Queue ({images.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => switchImage(img.id)}
                  className={`relative aspect-square w-full rounded-none overflow-hidden border-2 transition-all duration-300 ${activeImageId === img.id ? 'border-[var(--accent)] shadow-[0_0_15px_rgba(226,255,70,0.2)]' : 'border-[var(--border-color)] opacity-60 hover:opacity-100 hover:border-white/20'}`}
                >
                  <img
                    src={img.processedImage || img.originalImage}
                    className="w-full h-full object-cover"
                    alt="thumbnail"
                  />
                  {img.processedImage && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-lg border border-[var(--bg-color)]">
                      <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}

                  {/* Overlay for inactive */}
                  <div className={`absolute inset-0 bg-black/40 transition-opacity ${activeImageId === img.id ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'}`}></div>
                </button>
              ))}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square w-full border border-[var(--border-color)] border-dashed flex flex-col items-center justify-center text-[var(--text-secondary)] hover:text-white hover:border-white/30 transition-colors bg-[var(--surface)]"
              >
                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M12 4v16m8-8H4" /></svg>
                <span className="font-mono text-[10px] uppercase tracking-widest">Add More</span>
              </button>
            </div>
          </aside>
        )}

      </div>
    </div>
  );
}

export default App;
