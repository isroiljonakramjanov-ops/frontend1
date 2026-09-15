import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import {
  Camera, Scan, CheckCircle, AlertCircle, RefreshCw,
  Maximize2, Minimize2, Clock, Sparkles, UserX, UserCheck,
  Users, Eye, LogIn, LogOut, Brain, ShieldAlert, Check
} from 'lucide-react';
import api from '../services/api';

const MODELS_URL = '/models';
// Strict face match threshold (Euclidean distance: 0 = exact match, 0.40 = strict cutoff limit)
// face-api.js standard: distance < 0.40 is same person, > 0.40 is DIFFERENT person
const MATCH_DISTANCE_THRESHOLD = 0.40;

// Default ish boshlanish vaqti: 07:00
const DEFAULT_WORK_START = '07:00';

export default function FaceScanner({ standalone = false }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [manualCardId, setManualCardId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Stats
  const [scannedCount, setScannedCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  const [notRecognizedCount, setNotRecognizedCount] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return parseInt(localStorage.getItem(`face_failed_${today}`) || '0', 10);
  });
  const [userScanStatuses, setUserScanStatuses] = useState({});

  // Face descriptors cache: { [employeeId]: Float32Array(128) }
  const faceDescriptorsCache = useRef({});

  const lastDateStr = useRef(new Date().toISOString().split('T')[0]);

  // Persist Tanilmadi to localStorage
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`face_failed_${today}`, notRecognizedCount.toString());
  }, [notRecognizedCount]);

  // Clock + Day change checker
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const nowDateStr = now.toISOString().split('T')[0];
      if (lastDateStr.current !== nowDateStr) {
        // Kun almashdi, statistikalarni nolga tushiramiz
        lastDateStr.current = nowDateStr;
        setFoundCount(0);
        setNotRecognizedCount(0);
        setScannedCount(0);
        setUserScanStatuses({});
        setScanResult(null);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Load ML models + Camera + Employees + Today's Stats
  useEffect(() => {
    loadModels();
    fetchEmployees();
    fetchTodayAttendances();
    startCamera();
    // Standalone panelda avtomatik to'liq ekran (kiosk) rejimi
    if (standalone) setIsKioskMode(true);
    return () => stopCamera();
  }, []);

  const loadModels = async () => {
    setModelsLoading(true);
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);
      setModelsLoaded(true);
      console.log('✅ High-Accuracy Face-API.js models loaded successfully');
    } catch (err) {
      console.error('❌ Error loading face-api models:', err);
      setErrorMsg('Face-API modellarini yuklashda xatolik. /models papkasini tekshiring.');
    } finally {
      setModelsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Hodimlar olishda xatolik:', err);
    }
  };

  const fetchTodayAttendances = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await api.get(`/attendance?date=${todayStr}`);
      const attendances = res.data || [];
      
      let _foundCount = 0;
      const _userStatuses = {};
      
      // Backenddan eng oxirgi yozuvlar birinchi keladi (DESC)
      attendances.forEach(att => {
        if (!_userStatuses[att.user_id]) {
          _foundCount++;
          
          const evTime = new Date(att.check_in);
          const timeStr = evTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const isCheckOut = !!att.check_out;
          
          _userStatuses[att.user_id] = {
            status: 'topildi',
            time: timeStr,
            confidence: 99.9, // bazadan kelganlari aniq
            event: isCheckOut ? 'CHECK_OUT' : 'CHECK_IN'
          };
        }
      });
      
      setFoundCount(_foundCount);
      setScannedCount(_foundCount); // Boshlang'ich qiymat
      setUserScanStatuses(_userStatuses);
    } catch (err) {
      console.error('Bugungi davomatlarni olishda xatolik:', err);
    }
  };

  const startCamera = async () => {
    try {
      setErrorMsg('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setCameraActive(true);
    } catch (err) {
      setCameraActive(false);
      setErrorMsg('Kamera ruxsati berilmadi yoki kamera topilmadi');
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  const playSound = (type = 'success') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = type === 'success' ? 987.77 : 330;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) { /* silent */ }
  };

  const formatTime = (d = new Date()) =>
    [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, '0')).join(':');

  const formatMoney = n => new Intl.NumberFormat('uz-UZ').format(Math.round(n || 0));

  /**
   * Get employee face descriptor from avatar image
   */
  const getEmpDescriptor = async (emp) => {
    if (faceDescriptorsCache.current[emp.id]) {
      return faceDescriptorsCache.current[emp.id];
    }

    if (!emp.avatar_url) {
      console.log(`⚠️ ${emp.full_name} avatar_url mavjud emas`);
      return null;
    }

    try {
      const url = emp.avatar_url.startsWith('http') || emp.avatar_url.startsWith('data:')
        ? emp.avatar_url
        : `http://localhost:3000${emp.avatar_url}`;

      const img = await faceapi.fetchImage(url);

      let detection = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      if (!detection) {
        console.warn(`⚠️ ${emp.full_name} avatarida human face aniqlanmadi`);
        return null;
      }

      faceDescriptorsCache.current[emp.id] = detection.descriptor;
      console.log(`✅ ${emp.full_name} yuz descriptor'i saqlandi (128-dim)`);
      return detection.descriptor;
    } catch (e) {
      console.warn(`❌ ${emp.full_name} avatar descriptor xatosi:`, e);
      return null;
    }
  };

  /**
   * STRICT FACE RECOGNITION LOGIC
   */
  const matchFaceWithEmployees = async () => {
    if (!modelsLoaded) {
      return { matched: null, reason: 'ML modellar hali yuklanmagan, kuting...' };
    }

    if (!videoRef.current || !cameraActive) {
      return { matched: null, reason: 'Kamera faol emas' };
    }

    const avatarEmps = employees.filter(e => e.avatar_url && e.is_active !== false);
    if (avatarEmps.length === 0) {
      return {
        matched: null,
        reason: 'Tizimda rasmi yuklangan hodim yo\'q. Avval Hodimlar sahifasida hodimga rasm yuklang!'
      };
    }

    // 1. Detect live face in camera using SSD Mobilenet V1 (High Accuracy)
    let liveDetection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!liveDetection) {
      // Fallback detector
      liveDetection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
    }

    if (!liveDetection) {
      return { matched: null, reason: 'Kamerada yuz aniqlanmadi. Kameraga to\'g\'ri qarang' };
    }

    const liveDescriptor = liveDetection.descriptor;

    // 2. Compare against all employee avatar descriptors
    let bestMatch = null;
    let bestDistance = Infinity;
    const comparisonResults = [];

    for (const emp of avatarEmps) {
      const empDescriptor = await getEmpDescriptor(emp);
      if (!empDescriptor) continue;

      const distance = faceapi.euclideanDistance(liveDescriptor, empDescriptor);
      comparisonResults.push({ emp, distance });
      console.log(`  🔍 ${emp.full_name}: masofa = ${distance.toFixed(3)} (chegara: ${MATCH_DISTANCE_THRESHOLD})`);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = emp;
      }
    }

    console.log('📊 YUZ SOLISHTIRISH RESULT:', comparisonResults);

    // 3. Strict Threshold Verification: ONLY if distance <= 0.40
    if (bestMatch && bestDistance <= MATCH_DISTANCE_THRESHOLD) {
      const matchScore = Math.min(99.9, Math.max(70, Math.round((1 - bestDistance) * 1000) / 10));
      return {
        matched: bestMatch,
        distance: bestDistance,
        confidence: matchScore.toFixed(1)
      };
    }

    const closestName = bestMatch ? bestMatch.full_name : 'bichorasi topilmadi';
    const closestDist = bestDistance === Infinity ? 'N/A' : (bestDistance).toFixed(3);
    return {
      matched: null,
      reason: `Yuz bazadagi hodimlar bilan MOS KELMADI (eng yaqin: ${closestName}, masofa: ${closestDist}, talab: < ${MATCH_DISTANCE_THRESHOLD})`
    };
  };

  const handleScan = (cardIdToScan = null) => {
    if (scanning) return;
    setScanning(true);
    setScanResult(null);
    const scanTimeStr = formatTime();

    // Brauzerga UI ni yangilash (button ni disable qilish) uchun biroz vaqt beramiz
    setTimeout(async () => {
      // RFID Card scan mode
      if (cardIdToScan || manualCardId) {
        const cid = cardIdToScan || manualCardId;
        const targetUser = employees.find(e => e.card_id === cid);
        setScannedCount(prev => prev + 1);

        if (!targetUser) {
          setNotRecognizedCount(prev => prev + 1);
          setScanResult({
            status: 'error',
            message: '🔴 TANILMADI — RFID karta kodi bo\'yicha hodim topilmadi',
            detail: `Karta kodi: ${cid}`,
            time: scanTimeStr
          });
          playSound('error');
          setScanning(false);
          return;
        }
        await processFoundUser(targetUser, '100.0', scanTimeStr);
        return;
      }

      // ML Face Matching Mode
      const result = await matchFaceWithEmployees();
      setScannedCount(prev => prev + 1);

      if (!result.matched) {
        setNotRecognizedCount(prev => prev + 1);
        setScanResult({
          status: 'error',
          message: '🔴 TANILMADI — Yuz mos kelmadi',
          detail: result.reason,
          time: scanTimeStr
        });
        playSound('error');
        setScanning(false);
        return;
      }

      await processFoundUser(result.matched, result.confidence, scanTimeStr);
    }, 50);
  };

  const processFoundUser = async (targetUser, confidence, scanTimeStr) => {
    try {
      const payload = {
        user_id: targetUser.id,
        card_id: targetUser.card_id || null,
        face_id: targetUser.face_id || null
      };
      const res = await api.post('/attendance/turnstile/webhook', payload);
      const data = res.data;

      setFoundCount(prev => prev + 1);
      setUserScanStatuses(prev => ({
        ...prev,
        [targetUser.id]: {
          status: 'topildi',
          time: scanTimeStr,
          confidence,
          event: data.event,
        }
      }));

      playSound('success');
      const lateMinutes = data.late_minutes || 0;
      const isLate = data.event === 'CHECK_IN' && lateMinutes > 0;
      setScanResult({
        status: 'success',
        message: data.event === 'CHECK_IN'
          ? (isLate ? `🟠 TOPILDI — KIRISH QAYD ETILDI (Kech qoldi: ${lateMinutes} daq)` : '🟢 TOPILDI — KIRISH QAYD ETILDI')
          : '🔵 TOPILDI — CHIQISH QAYD ETILDI',
        user: data.user || targetUser,
        event: data.event,
        attendance: data.attendance,
        time: scanTimeStr,
        confidence,
        lateMinutes,
        isLate,
      });
    } catch (err) {
      setNotRecognizedCount(prev => prev + 1);
      playSound('error');
      setScanResult({
        status: 'error',
        message: `🔴 XATOLIK — ${err.response?.data?.error || 'Skanerlashda xatolik'}`,
        time: scanTimeStr
      });
    } finally {
      setScanning(false);
    }
  };

  const activeEmployees = employees.filter(e => e.is_active !== false);

  const systemStatus = modelsLoading
    ? { text: '⏳ High-Accuracy ML modellar yuklanmoqda...', color: '#f59e0b' }
    : !modelsLoaded
      ? { text: '❌ Modellar yuklanmadi', color: 'var(--danger)' }
      : !cameraActive
        ? { text: '⚠️ Kamera ulanmagan', color: 'var(--warning)' }
        : { text: '🧠 SSD-Mobilenet ML Face-ID Tayyor', color: 'var(--success)' };

  if (standalone) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(135deg, #020817 0%, #0a0f1e 40%, #050913 100%)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Standalone Header Bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 2rem',
          background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(59,130,246,0.2)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              padding: '0.6rem', borderRadius: '14px',
              boxShadow: '0 0 20px rgba(99,102,241,0.5)'
            }}>
              <Brain size={28} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
                TURNIKET — Face-ID Terminal
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(148,163,184,0.8)' }}>
                SSD-Mobilenet AI • Ish boshlanishi: {DEFAULT_WORK_START}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Stats mini */}
            {[
              { label: 'Kirdi', value: foundCount, color: '#10b981' },
              { label: 'Tanilmadi', value: notRecognizedCount, color: '#ef4444' },
              { label: 'Hodimlar', value: activeEmployees.length, color: '#818cf8' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.7)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
            {/* Clock */}
            <div style={{
              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
              padding: '0.5rem 1rem', borderRadius: '10px',
              fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: '800', color: '#60a5fa',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}>
              <Clock size={18} color="#60a5fa" /> {formatTime(currentTime)}
            </div>
            <div style={{ fontSize: '0.75rem', color: systemStatus.color, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: systemStatus.color, display: 'inline-block', boxShadow: `0 0 8px ${systemStatus.color}` }} />
              {modelsLoaded && cameraActive ? 'Tayyor' : systemStatus.text}
            </div>
          </div>
        </div>

        {/* Standalone Main: Camera Left + Results Right */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 0, overflow: 'hidden' }}>

          {/* LEFT: Camera Full Height */}
          <div style={{ position: 'relative', background: '#020817', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{
              width: '100%', maxWidth: '640px', aspectRatio: '4/3',
              borderRadius: '28px', overflow: 'hidden',
              border: scanning ? '3px dashed #3b82f6' : scanResult?.status === 'success' ? '3px solid #10b981' : scanResult?.status === 'error' ? '3px solid #ef4444' : '2px solid rgba(59,130,246,0.2)',
              boxShadow: scanning ? '0 0 60px rgba(59,130,246,0.5)' : scanResult?.status === 'success' ? '0 0 60px rgba(16,185,129,0.4)' : scanResult?.status === 'error' ? '0 0 60px rgba(239,68,68,0.4)' : '0 20px 80px rgba(0,0,0,0.6)',
              position: 'relative', transition: 'all 0.4s ease'
            }}>
              {cameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#040711', color: 'rgba(148,163,184,0.5)' }}>
                  <Camera size={100} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                  <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Kamera ulanmagan</div>
                </div>
              )}
              {/* HUD crosshair frame */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {[{ top: 16, left: 16, bTop: true, bLeft: true }, { top: 16, right: 16, bTop: true, bRight: true }, { bottom: 16, left: 16, bBottom: true, bLeft: true }, { bottom: 16, right: 16, bBottom: true, bRight: true }].map((c, i) => (
                  <div key={i} style={{
                    position: 'absolute', width: 40, height: 40,
                    top: c.top, right: c.right, bottom: c.bottom, left: c.left,
                    borderTop: c.bTop ? '4px solid rgba(99,102,241,0.7)' : 'none',
                    borderBottom: c.bBottom ? '4px solid rgba(99,102,241,0.7)' : 'none',
                    borderLeft: c.bLeft ? '4px solid rgba(99,102,241,0.7)' : 'none',
                    borderRight: c.bRight ? '4px solid rgba(99,102,241,0.7)' : 'none',
                    borderRadius: c.bTop && c.bLeft ? '12px 0 0 0' : c.bTop && c.bRight ? '0 12px 0 0' : c.bBottom && c.bLeft ? '0 0 0 12px' : '0 0 12px 0'
                  }} />
                ))}
                {scanning && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '4px',
                    background: 'linear-gradient(90deg, transparent, #3b82f6, #a78bfa, #3b82f6, transparent)',
                    animation: 'laserScan 0.8s infinite ease-in-out alternate',
                    boxShadow: '0 0 20px #3b82f6'
                  }} />
                )}
              </div>
            </div>
            {/* SCAN BUTTON */}
            <button
              onClick={() => handleScan()}
              disabled={scanning || modelsLoading || !cameraActive}
              style={{
                marginTop: '1.5rem', width: '100%', maxWidth: '640px', padding: '1.2rem',
                borderRadius: '18px', fontWeight: '800', fontSize: '1.2rem', border: 'none',
                cursor: scanning || modelsLoading ? 'wait' : 'pointer',
                background: scanning ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                color: '#fff', boxShadow: '0 10px 40px rgba(99,102,241,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                transition: 'all 0.2s', opacity: (scanning || modelsLoading || !cameraActive) ? 0.7 : 1
              }}
            >
              {scanning
                ? <><RefreshCw size={26} style={{ animation: 'spin 1s linear infinite' }} /> Yuz Taqqoslanmoqda...</>
                : <><Scan size={26} /> YUZNI SKANER QILISH</>
              }
            </button>
            {/* Work hours info */}
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'rgba(148,163,184,0.6)', display: 'flex', gap: '1.5rem' }}>
              <span>🕐 Ish boshlanishi: <strong style={{ color: '#60a5fa' }}>{DEFAULT_WORK_START}</strong></span>
              <span>⚠️ Kechiksa: <strong style={{ color: '#fbbf24' }}>Kech qoldi deb belgilanadi</strong></span>
            </div>
          </div>

          {/* RIGHT: Results + Employee List */}
          <div style={{
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(59,130,246,0.15)',
            display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1rem', overflowY: 'auto'
          }}>
            {/* Scan Result */}
            {scanResult ? (
              <div style={{
                borderRadius: '20px', padding: '1.5rem',
                background: scanResult.status === 'success'
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,78,59,0.3))'
                  : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(127,29,29,0.3))',
                border: `2px solid ${scanResult.status === 'success' ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`,
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{
                    padding: '0.8rem', borderRadius: '50%',
                    background: scanResult.status === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                    color: scanResult.status === 'success' ? '#10b981' : '#ef4444', flexShrink: 0
                  }}>
                    {scanResult.status === 'success' ? <CheckCircle size={40} /> : <AlertCircle size={40} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: scanResult.status === 'success' ? '#10b981' : '#ef4444' }}>
                      {scanResult.message}
                    </div>
                    {scanResult.status === 'success' && scanResult.user && (
                      <>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.4rem' }}>{scanResult.user.full_name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(148,163,184,0.8)', marginTop: '0.2rem' }}>
                          {scanResult.user.department} • {scanResult.user.position}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#818cf8', marginTop: '0.3rem', fontWeight: '600' }}>
                          ✨ Moslik: {scanResult.confidence}%
                        </div>
                      </>
                    )}
                    {scanResult.status === 'error' && scanResult.detail && (
                      <div style={{ fontSize: '0.8rem', color: 'rgba(148,163,184,0.7)', marginTop: '0.4rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.7rem', borderRadius: '8px' }}>
                        {scanResult.detail}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'rgba(148,163,184,0.5)', marginTop: '0.4rem' }}>
                      🕐 {scanResult.time}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ borderRadius: '20px', padding: '1.5rem', background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: 'rgba(148,163,184,0.6)' }}>
                <Eye size={48} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: '600', fontSize: '1rem', color: 'rgba(255,255,255,0.6)' }}>Natija shu yerda chiqadi</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>Kameraga qarang va skaner qiling</div>
              </div>
            )}

            {/* Employee Status List */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgba(148,163,184,0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><Eye size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />Hodimlar Holati</span>
                <span style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '0.15rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem' }}>
                  {activeEmployees.length} nafar
                </span>
              </div>
              {activeEmployees.map(emp => {
                const statusInfo = userScanStatuses[emp.id];
                const hasAvatar = !!emp.avatar_url;
                return (
                  <div key={emp.id} style={{
                    padding: '0.8rem 1rem', borderRadius: '14px',
                    background: statusInfo ? 'rgba(16,185,129,0.1)' : 'rgba(30,41,59,0.5)',
                    border: `1px solid ${statusInfo ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#60a5fa', fontSize: '0.85rem', flexShrink: 0 }}>
                        {hasAvatar
                          ? <img src={emp.avatar_url.startsWith('http') || emp.avatar_url.startsWith('data:') ? emp.avatar_url : `http://localhost:3000${emp.avatar_url}`} alt={emp.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : emp.full_name.substring(0, 2).toUpperCase()
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#fff' }}>{emp.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.6)' }}>{emp.department || ''}</div>
                        {statusInfo && (
                          <div style={{ fontSize: '0.7rem', color: '#fbbf24', marginTop: '0.1rem' }}>
                            {statusInfo.event === 'CHECK_IN' ? '↳ Kirdi' : `↳ Chiqdi — ${statusInfo.time}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      {statusInfo
                        ? <span style={{ padding: '0.2rem 0.55rem', borderRadius: '16px', background: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.72rem', fontWeight: '700' }}>✓ Topildi</span>
                        : hasAvatar
                          ? <span style={{ padding: '0.2rem 0.55rem', borderRadius: '16px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '0.7rem', fontWeight: '600' }}>Kutilmoqda</span>
                          : <span style={{ padding: '0.2rem 0.55rem', borderRadius: '16px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.7rem', fontWeight: '600' }}>Rasm yo'q</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Manual RFID */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(148,163,184,0.5)', marginBottom: '0.4rem' }}>RFID karta (qo'lda):</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="Karta ID..." value={manualCardId} onChange={e => setManualCardId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScan(manualCardId)}
                  style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', outline: 'none' }}
                />
                <button onClick={() => handleScan(manualCardId)} style={{ padding: '0.5rem 0.9rem', background: 'rgba(59,130,246,0.3)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                  Tekshir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={isKioskMode ? 'kiosk-fullscreen-overlay' : 'page-container'}
      style={isKioskMode
        ? { position: 'fixed', inset: 0, zIndex: 9999, background: '#050913', padding: '2rem', display: 'flex', flexDirection: 'column' }
        : { maxWidth: '1280px', margin: '0 auto' }
      }
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Brain size={32} color="var(--accent-primary)" />
            Face-ID — Real Yuz Tanish Terminali
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <strong>SSD-Mobilenet AI modeli</strong> orqali real yuz solishtirish va davomatni qayd etish.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'rgba(30,41,59,0.9)', border: '1px solid var(--border-color)',
            padding: '0.55rem 1.1rem', borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: '700', color: 'var(--accent-primary)'
          }}>
            <Clock size={18} color="var(--accent-primary)" /> {formatTime(currentTime)}
          </div>
          <button onClick={() => setIsKioskMode(!isKioskMode)} className="btn" style={{
            background: isKioskMode ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
            color: isKioskMode ? 'var(--danger)' : 'var(--accent-primary)',
            border: `1px solid ${isKioskMode ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)'}`
          }}>
            {isKioskMode ? <><Minimize2 size={18} /> Chiqish</> : <><Maximize2 size={18} /> Terminal</>}
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Jami Skanerlar', value: scannedCount, sub: 'ta urinish', icon: <Scan size={26} />, color: 'var(--accent-primary)', bg: 'rgba(59,130,246,0.15)' },
          { label: 'Topildi ✅', value: foundCount, sub: 'hodim', icon: <UserCheck size={26} />, color: 'var(--success)', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)' },
          { label: 'Tanilmadi ❌', value: notRecognizedCount, sub: 'ta', icon: <UserX size={26} />, color: 'var(--danger)', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' },
          { label: 'Faol Hodimlar', value: activeEmployees.length, sub: 'nafar', icon: <Users size={26} />, color: '#c084fc', bg: 'rgba(168,85,247,0.15)' },
        ].map((s, i) => (
          <div key={i} className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderColor: s.border }}>
            <div style={{ padding: '0.75rem', background: s.bg, color: s.color, borderRadius: '12px' }}>{s.icon}</div>
            <div>
              <div style={{ color: s.color, fontSize: '0.8rem', fontWeight: '600' }}>{s.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: s.color }}>
                {s.value} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{s.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: isKioskMode ? '1fr 420px' : '1fr 400px', gap: '1.5rem', flex: 1 }}>

        {/* LEFT: Camera & Scan Action */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '100%', flex: 1, minHeight: isKioskMode ? '480px' : '400px',
            borderRadius: '24px', background: '#040711', position: 'relative',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(59,130,246,0.35)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            {cameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <Camera size={80} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Kamera ulanmagan</p>
                {errorMsg && <p style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: '0.5rem' }}>{errorMsg}</p>}
              </div>
            )}

            {/* HUD Overlay Frame */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: '280px', height: '330px',
              border: scanning ? '3px dashed var(--accent-primary)'
                : scanResult?.status === 'success' ? '3px solid var(--success)'
                  : scanResult?.status === 'error' ? '3px solid var(--danger)'
                    : '2px dashed rgba(255,255,255,0.2)',
              borderRadius: '32px', pointerEvents: 'none',
              boxShadow: scanning ? '0 0 45px rgba(59,130,246,0.7)'
                : scanResult?.status === 'success' ? '0 0 45px rgba(16,185,129,0.7)'
                  : scanResult?.status === 'error' ? '0 0 45px rgba(239,68,68,0.7)' : 'none',
              transition: 'all 0.3s'
            }}>
              {/* Corner Indicators */}
              {[{ top: -4, left: -4, style: { borderTop: '5px solid var(--accent-primary)', borderLeft: '5px solid var(--accent-primary)', borderRadius: '8px 0 0 0' } },
                { top: -4, right: -4, style: { borderTop: '5px solid var(--accent-primary)', borderRight: '5px solid var(--accent-primary)', borderRadius: '0 8px 0 0' } },
                { bottom: -4, left: -4, style: { borderBottom: '5px solid var(--accent-primary)', borderLeft: '5px solid var(--accent-primary)', borderRadius: '0 0 0 8px' } },
                { bottom: -4, right: -4, style: { borderBottom: '5px solid var(--accent-primary)', borderRight: '5px solid var(--accent-primary)', borderRadius: '0 0 8px 0' } }
              ].map((c, i) => <div key={i} style={{ position: 'absolute', width: 32, height: 32, ...c }} />)}

              {scanning && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '6px',
                  background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
                  boxShadow: '0 0 25px #3b82f6',
                  animation: 'laserScan 0.9s infinite ease-in-out alternate'
                }} />
              )}
            </div>

            {/* Status indicator on camera */}
            <div style={{
              position: 'absolute', top: 16, left: 16,
              background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)',
              padding: '0.4rem 0.9rem', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: systemStatus.color, fontWeight: '600'
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: systemStatus.color, boxShadow: `0 0 10px ${systemStatus.color}` }} />
              {systemStatus.text}
            </div>
          </div>

          {/* Trigger Scan Button */}
          <button
            onClick={() => handleScan()}
            disabled={scanning || modelsLoading || !cameraActive}
            style={{
              width: '100%', marginTop: '1.25rem', padding: '1.1rem',
              borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem',
              border: 'none', cursor: scanning || modelsLoading ? 'wait' : 'pointer',
              background: scanning
                ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: '#fff', boxShadow: '0 8px 30px rgba(59,130,246,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              transition: 'all 0.2s ease'
            }}
          >
            {scanning ? (
              <>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                Yuz Taqqoslanmoqda...
              </>
            ) : (
              <>
                <Scan size={24} />
                Yuzni Skaner Qilish & Aniqlash
              </>
            )}
          </button>
        </div>

        {/* RIGHT: Results & Employee List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* SCAN RESULT PANEL */}
          {scanResult ? (
            <div className="glass-panel" style={{
              padding: '1.5rem', borderRadius: '20px',
              background: scanResult.status === 'success'
                ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,78,59,0.25))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(127,29,29,0.25))',
              border: `2px solid ${scanResult.status === 'success' ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)'}`,
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  padding: '0.75rem', borderRadius: '50%',
                  background: scanResult.status === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  color: scanResult.status === 'success' ? 'var(--success)' : 'var(--danger)'
                }}>
                  {scanResult.status === 'success' ? <CheckCircle size={36} /> : <AlertCircle size={36} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1.05rem', fontWeight: '800',
                    color: scanResult.status === 'success' ? 'var(--success)' : 'var(--danger)',
                    marginBottom: '0.25rem'
                  }}>
                    {scanResult.message}
                  </div>

                  {scanResult.status === 'success' && scanResult.user && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>
                        {scanResult.user.full_name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {scanResult.user.department || 'Bo\'lim ko\'rsatilmagan'} • {scanResult.user.position || 'Hodim'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '0.35rem', fontWeight: '600' }}>
                        ✨ Moslik darajasi: {scanResult.confidence}%
                      </div>

                    </div>
                  )}

                  {scanResult.status === 'error' && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem', background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                      {scanResult.detail}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Eye size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Skanerlash Natijasi</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Kameraga qarang va <strong>"Yuzni Skaner Qilish"</strong> tugmasini bosing.
              </div>
            </div>
          )}

          {/* EMPLOYEES SCAN STATUS LIST */}
          <div className="glass-panel" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} color="var(--accent-primary)" />
                Hodimlar Skaner Holati
              </div>
              <span style={{ fontSize: '0.75rem', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: '700' }}>
                {activeEmployees.length} hodim
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '0.25rem' }}>
              {activeEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Hali hodimlar qo'shilmagan.
                </div>
              ) : (
                activeEmployees.map(emp => {
                  const statusInfo = userScanStatuses[emp.id];
                  const hasAvatar = !!emp.avatar_url;

                  return (
                    <div key={emp.id} style={{
                      padding: '0.75rem 1rem', borderRadius: '12px',
                      background: statusInfo ? 'rgba(16,185,129,0.08)' : 'rgba(30,41,59,0.5)',
                      border: `1px solid ${statusInfo ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
                          background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', color: 'var(--accent-primary)', fontSize: '0.9rem'
                        }}>
                          {hasAvatar ? (
                            <img
                              src={emp.avatar_url.startsWith('http') || emp.avatar_url.startsWith('data:') ? emp.avatar_url : `http://localhost:3000${emp.avatar_url}`}
                              alt={emp.full_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            emp.full_name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>
                            {emp.full_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {emp.department || 'Bo\'limsiz'} • {emp.card_id || 'Karta ID yo\'q'}
                          </div>
                      {statusInfo && (
                        <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '0.2rem' }}>
                          {statusInfo.event === 'CHECK_IN' ? '↳ Kirgan' : `↳ Chiqdi — ${statusInfo.time}`}
                        </div>
                      )}
                        </div>
                      </div>

                      <div>
                        {statusInfo ? (
                          <span style={{
                            padding: '0.25rem 0.6rem', borderRadius: '20px',
                            background: 'rgba(16,185,129,0.2)', color: 'var(--success)',
                            fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem'
                          }}>
                            <Check size={12} /> Topildi ({statusInfo.confidence}%)
                          </span>
                        ) : hasAvatar ? (
                          <span style={{
                            padding: '0.25rem 0.6rem', borderRadius: '20px',
                            background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)',
                            fontSize: '0.72rem', fontWeight: '600'
                          }}>
                            Rasm Yuklangan
                          </span>
                        ) : (
                          <span style={{
                            padding: '0.25rem 0.6rem', borderRadius: '20px',
                            background: 'rgba(239,68,68,0.15)', color: 'var(--danger)',
                            fontSize: '0.72rem', fontWeight: '600'
                          }}>
                            ⚠️ Rasm Yo'q
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* MANUAL CARD ID INPUT FALLBACK */}
          <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '600' }}>
              RFID karta bilan qo'lda tekshirish:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Karta ID (masalan: EMP001)"
                value={manualCardId}
                onChange={e => setManualCardId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan(manualCardId)}
                style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.85rem' }}
              />
              <button
                onClick={() => handleScan(manualCardId)}
                className="btn btn-primary"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                Tekshir
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
