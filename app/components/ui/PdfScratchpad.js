'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

const PEN_COLORS = [
    { name: 'أحمر', value: '#ef4444', bg: 'bg-red-500' },
    { name: 'أزرق', value: '#3b82f6', bg: 'bg-blue-500' },
    { name: 'أسود', value: '#1e1e1e', bg: 'bg-gray-800' },
];

export default function PdfScratchpad({ children, watermark }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentTool, setCurrentTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
    const [penColor, setPenColor] = useState(PEN_COLORS[0].value);
    const [showPenColors, setShowPenColors] = useState(false);
    const lastPoint = useRef(null);

    // ── Resize canvas to match container ──
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Save current drawing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);

        // Resize
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, rect.width, rect.height);
    }, []);

    useEffect(() => {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        const fsEvents = ['fullscreenchange', 'webkitfullscreenchange'];
        fsEvents.forEach(e => document.addEventListener(e, resizeCanvas));
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            fsEvents.forEach(e => document.removeEventListener(e, resizeCanvas));
        };
    }, [resizeCanvas]);

    const getPointerPos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const getToolConfig = () => {
        switch (currentTool) {
            case 'highlighter':
                return {
                    color: 'rgba(250, 204, 21, 0.35)',
                    width: 22,
                    composite: 'multiply',
                    cap: 'square',
                };
            case 'eraser':
                return {
                    color: 'rgba(0,0,0,1)',
                    width: 28,
                    composite: 'destination-out',
                    cap: 'round',
                };
            case 'pen':
            default:
                return {
                    color: penColor,
                    width: 3,
                    composite: 'source-over',
                    cap: 'round',
                };
        }
    };

    const handlePointerDown = (e) => {
        if (!isDrawingMode) return;
        e.preventDefault();
        setIsDrawing(true);
        lastPoint.current = getPointerPos(e);
    };

    const handlePointerMove = (e) => {
        if (!isDrawing || !isDrawingMode) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const config = getToolConfig();

        ctx.save();
        ctx.globalCompositeOperation = config.composite;
        ctx.strokeStyle = config.color;
        ctx.lineWidth = config.width;
        ctx.lineCap = config.cap;
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.restore();

        lastPoint.current = pos;
    };

    const handlePointerUp = () => {
        setIsDrawing(false);
        lastPoint.current = null;
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // ── Cursor style per tool ──
    const getCursor = () => {
        if (!isDrawingMode) return 'default';
        switch (currentTool) {
            case 'pen': return 'crosshair';
            case 'highlighter': return 'cell';
            case 'eraser': return 'grab';
            default: return 'crosshair';
        }
    };

    return (
        <div ref={containerRef} className="relative w-full h-full">
            {children}

            {/* Drawing Canvas — above iframe, below watermark */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-[9998]"
                style={{
                    pointerEvents: isDrawingMode ? 'auto' : 'none',
                    cursor: getCursor(),
                    touchAction: isDrawingMode ? 'none' : 'auto',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />

            {watermark}

            {/* ═══ Floating Toolbar ═══ */}
            <div className="absolute bottom-4 right-4 z-[10000] flex flex-col items-end gap-2" dir="rtl">

                {/* Expanded toolbar */}
                {isDrawingMode && (
                    <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-2xl border border-white/15 rounded-2xl px-3 py-2 shadow-2xl shadow-black/50">

                        {/* 🖊️ Pen button + color submenu */}
                        <div className="relative">
                            <button
                                onClick={() => { setCurrentTool('pen'); setShowPenColors(!showPenColors); }}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all ${currentTool === 'pen'
                                        ? 'bg-white/20 ring-2 ring-white/40 scale-105'
                                        : 'hover:bg-white/10 opacity-60 hover:opacity-100'
                                    }`}
                                title="قلم"
                            >
                                🖊️
                            </button>
                            {/* Color submenu */}
                            {showPenColors && currentTool === 'pen' && (
                                <div className="absolute bottom-12 right-0 flex gap-1.5 bg-black/80 backdrop-blur-xl border border-white/15 rounded-xl p-2 shadow-2xl">
                                    {PEN_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            onClick={() => { setPenColor(c.value); setShowPenColors(false); }}
                                            className={`w-7 h-7 rounded-full ${c.bg} border-2 transition-all ${penColor === c.value ? 'border-white scale-110' : 'border-transparent hover:border-white/50'
                                                }`}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Pen color indicator dot */}
                        {currentTool === 'pen' && (
                            <div className="w-2.5 h-2.5 rounded-full -mr-0.5" style={{ backgroundColor: penColor }}></div>
                        )}

                        {/* Divider */}
                        <div className="w-[1px] h-6 bg-white/15 mx-0.5"></div>

                        {/* 🖍️ Highlighter */}
                        <button
                            onClick={() => { setCurrentTool('highlighter'); setShowPenColors(false); }}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all ${currentTool === 'highlighter'
                                    ? 'bg-yellow-500/30 ring-2 ring-yellow-400/50 scale-105'
                                    : 'hover:bg-white/10 opacity-60 hover:opacity-100'
                                }`}
                            title="هايلايتر"
                        >
                            🖍️
                        </button>

                        {/* Divider */}
                        <div className="w-[1px] h-6 bg-white/15 mx-0.5"></div>

                        {/* 🧽 Eraser */}
                        <button
                            onClick={() => { setCurrentTool('eraser'); setShowPenColors(false); }}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all ${currentTool === 'eraser'
                                    ? 'bg-pink-500/20 ring-2 ring-pink-400/40 scale-105'
                                    : 'hover:bg-white/10 opacity-60 hover:opacity-100'
                                }`}
                            title="ممحاة"
                        >
                            🧽
                        </button>

                        {/* Divider */}
                        <div className="w-[1px] h-6 bg-white/15 mx-0.5"></div>

                        {/* 🗑️ Clear All */}
                        <button
                            onClick={clearCanvas}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base hover:bg-red-500/20 transition-all opacity-60 hover:opacity-100"
                            title="مسح الكل"
                        >
                            🗑️
                        </button>
                    </div>
                )}

                {/* Toggle Button */}
                <button
                    onClick={() => { setIsDrawingMode(!isDrawingMode); setShowPenColors(false); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm shadow-2xl shadow-black/40 border transition-all active:scale-95 ${isDrawingMode
                            ? 'bg-amber-500/90 backdrop-blur-xl border-amber-400/30 text-black hover:bg-amber-400/90'
                            : 'bg-black/60 backdrop-blur-xl border-white/15 text-white hover:bg-black/80'
                        }`}
                >
                    <span>{isDrawingMode ? '✋' : '✏️'}</span>
                    <span>{isDrawingMode ? 'إيقاف القلم' : 'تشغيل القلم'}</span>
                </button>
            </div>
        </div>
    );
}
