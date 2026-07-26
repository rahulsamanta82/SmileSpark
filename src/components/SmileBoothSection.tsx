import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Camera, RefreshCw, UploadCloud, Sparkles, CheckCircle2, ShieldAlert, VideoOff, Award, Heart } from 'lucide-react';

interface SmileBoothProps {
  onPhotoUploaded?: () => void;
}

export const SmileBoothSection: React.FC<SmileBoothProps> = ({ onPhotoUploaded }) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Anonymous Sparker');
  const [analyzingAI, setAnalyzingAI] = useState<boolean>(false);
  const [aiCaptionData, setAiCaptionData] = useState<{
    caption: string;
    smileScore: number;
    tags: string[];
    positiveEnergyQuote: string;
  } | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Ensure video stream is attached when videoRef element is mounted in DOM
  useEffect(() => {
    if (cameraActive && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch((err) => {
        console.error('Error playing video stream:', err);
      });
    }
  }, [cameraActive]);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setPermissionError(null);
    setCapturedImage(null);
    setAiCaptionData(null);
    setUploadSuccess(false);

    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera Access Error:', err);
      setPermissionError(
        'Camera permission was denied or not available in this browser context. Please allow camera access to use the Smile Booth.'
      );
      setCameraActive(false);
    }
  };

  const handleStartCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          captureSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror snapshot horizontally to match live webcam preview
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
      analyzePhotoWithAI(dataUrl);
    }
  };

  const analyzePhotoWithAI = async (imageDataUrl: string) => {
    try {
      setAnalyzingAI(true);
      const res = await fetch('/api/ai/caption-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageDataUrl }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiCaptionData(data.data);
      }
    } catch (err) {
      console.error('AI Captioning Error:', err);
    } finally {
      setAnalyzingAI(false);
    }
  };

  const handleUploadToGallery = async () => {
    if (!capturedImage) return;

    try {
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: capturedImage,
          caption: aiCaptionData?.caption || 'Spreading positive energy with SmileSpark AI!',
          smileScore: aiCaptionData?.smileScore || 95,
          userName: userName || 'Anonymous Sparker',
          tags: aiCaptionData?.tags || ['SmileSpark', 'Positivity'],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUploadSuccess(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#f59e0b', '#10b981', '#6366f1'],
        });
        if (onPhotoUploaded) onPhotoUploaded();
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    }
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Camera className="w-3.5 h-3.5" />
          <span>Interactive Camera Booth</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white">
          AI Smile Booth
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Capture your genuine smile with camera permission, receive AI vision analysis, and share positive energy with the community gallery!
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Main Booth Interface */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Permission Warning if Error */}
        {permissionError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm mb-6 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <p className="font-bold text-white">Camera Permission Needed</p>
              <p className="text-xs mt-0.5 text-rose-300/90">{permissionError}</p>
            </div>
          </div>
        )}

        {/* State 1: Camera Idle */}
        {!cameraActive && !capturedImage && (
          <div className="text-center py-12 px-4 border-2 border-dashed border-white/10 rounded-3xl bg-black/20">
            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 animate-pulse text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white">
              Ready to Share Your Smile?
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Clicking below will request explicit browser camera permission. No image is captured without your interaction.
            </p>
            <button
              onClick={startCamera}
              className="mt-6 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer inline-flex items-center gap-2 border border-indigo-400/30"
            >
              <Camera className="w-4 h-4" />
              <span>Start Smile Booth</span>
            </button>
          </div>
        )}

        {/* State 2: Active Camera Stream */}
        {cameraActive && !capturedImage && (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-w-2xl mx-auto border border-white/10 shadow-2xl flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />

            {/* Live Camera Frame Overlay */}
            <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
              <span className="text-xs font-semibold text-white/90 bg-black/60 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                Center Your Smile Here 😄
              </span>
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
                <span className="text-7xl font-black text-white animate-ping drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                  {countdown === 0 ? 'Cheese! 📸' : countdown}
                </span>
              </div>
            )}

            {/* Camera Controls */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10 px-4">
              <button
                onClick={handleStartCountdown}
                disabled={countdown !== null}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2 border border-indigo-400/30"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Photo (3s)</span>
              </button>

              <button
                onClick={stopCamera}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer border border-white/10"
                title="Cancel Camera"
              >
                <VideoOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* State 3: Photo Captured & AI Analysis */}
        {capturedImage && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Photo Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                <img src={capturedImage} alt="Captured Smile" className="w-full h-auto object-cover" />
                {aiCaptionData && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500/90 text-white font-black text-xs shadow-md flex items-center gap-1 backdrop-blur-md">
                    <Award className="w-3.5 h-3.5" />
                    <span>{aiCaptionData.smileScore}% Smile Score</span>
                  </div>
                )}
              </div>

              {/* AI Analysis & Details */}
              <div className="space-y-4">
                {analyzingAI ? (
                  <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center animate-pulse">
                    <Sparkles className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
                    <p className="font-bold text-white text-sm">
                      Advanced AI Vision Analyzing Smile...
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Generating positive energy caption & tags</p>
                  </div>
                ) : aiCaptionData ? (
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase">
                      <Sparkles className="w-4 h-4" />
                      <span>AI Photo Caption</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-100">
                      "{aiCaptionData.caption}"
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {aiCaptionData.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* User Name input */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Your Name / Handle
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Rahul Sparker"
                    className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={startCamera}
                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retake Photo</span>
                  </button>

                  <button
                    onClick={handleUploadToGallery}
                    disabled={uploadSuccess}
                    className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border border-indigo-400/30"
                  >
                    {uploadSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>Shared to Gallery!</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Share to Gallery</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
