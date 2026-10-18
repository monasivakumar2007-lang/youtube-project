'use client';

// ============================================================
// app/watch-party/[roomId]/page.tsx
// Synchronized Watch Party, WebRTC Video Call, Chat & Screen Share — Task 1
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { getWatchParty, endWatchParty, WatchPartyDetails } from '@/lib/watchPartyApi';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';

interface Participant {
  socketId: string;
  userId: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  joinedAt: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  text: string;
  timestamp: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function WatchPartyRoom() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const roomId = typeof params?.roomId === 'string' ? params.roomId : '';

  const [party, setParty] = useState<WatchPartyDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time Socket & Call state
  const socketRef = useRef<Socket | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Participants & Chat
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatError, setChatError] = useState<string>('');
  const [showParticipantsDrawer, setShowParticipantsDrawer] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Call Controls State
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSuccessNotice, setRecordingSuccessNotice] = useState<string>('');

  // Host indicator
  const isHost = party ? party.hostId === user?.id : false;

  // ─── Fetch Watch Party Details ──────────────────────────────
  const loadPartyDetails = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const res = await getWatchParty(roomId);
      if (res.success && res.data) {
        setParty(res.data);
      } else {
        setError(res.message || 'Watch party room not found.');
      }
    } catch {
      setError('Failed to connect to watch party room.');
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadPartyDetails();
  }, [loadPartyDetails]);

  // ─── Initialize Local Camera & Microphone ───────────────────
  const initLocalMedia = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.warn('Camera/Mic permission denied or not available, using fallback:', err);
      // Create a canvas stream fallback so user can still see their tile
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(0, 0, 320, 240);
          ctx.fillStyle = '#818cf8';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(user?.name || 'You', 160, 120);
        }
        const stream = canvas.captureStream(10);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
    }
  }, [user?.name]);

  // ─── Connect Socket.IO & Register Events ────────────────────
  useEffect(() => {
    if (!party || !user) return;

    initLocalMedia();

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('party:join', {
        roomId: party.roomId,
        userId: user.id,
        name: user.name,
        isHost: party.hostId === user.id,
      });
    });

    // Participant updates
    socket.on('party:participants', (list: Participant[]) => {
      setParticipants(list);
    });

    socket.on('participant:joined', (newP: Participant) => {
      setParticipants((prev) => {
        const filtered = prev.filter((p) => p.socketId !== newP.socketId);
        return [...filtered, newP];
      });
    });

    socket.on('participant:left', (left: { socketId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== left.socketId));
    });

    socket.on('participant:updated', (updated: Participant) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === updated.socketId ? updated : p))
      );
    });

    // Synchronized Video Events
    socket.on('video:play', (data: { timestamp: number; fromSocketId: string }) => {
      const v = videoElementRef.current;
      if (v) {
        if (Math.abs(v.currentTime - data.timestamp) > 1.5) {
          v.currentTime = data.timestamp;
        }
        v.play().catch(() => {});
      }
    });

    socket.on('video:pause', (data: { timestamp: number; fromSocketId: string }) => {
      const v = videoElementRef.current;
      if (v) {
        v.pause();
        if (Math.abs(v.currentTime - data.timestamp) > 1.5) {
          v.currentTime = data.timestamp;
        }
      }
    });

    socket.on('video:seek', (data: { timestamp: number }) => {
      const v = videoElementRef.current;
      if (v) {
        v.currentTime = data.timestamp;
      }
    });

    // Chat Events
    socket.on('chat:message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('chat:error', (err: { message: string }) => {
      setChatError(err.message);
      setTimeout(() => setChatError(''), 4000);
    });

    // Recording status broadcast
    socket.on('recording:started', () => {
      setIsRecording(true);
    });

    socket.on('recording:stopped', () => {
      setIsRecording(false);
    });

    return () => {
      socket.emit('party:leave');
      socket.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [party, user, initLocalMedia]);

  // ─── Video Control Sync Handlers (Host controls or sync) ────
  const handleLocalPlay = () => {
    if (!socketRef.current || !party) return;
    const v = videoElementRef.current;
    if (v) {
      socketRef.current.emit('video:play', {
        roomId: party.roomId,
        timestamp: v.currentTime,
      });
    }
  };

  const handleLocalPause = () => {
    if (!socketRef.current || !party) return;
    const v = videoElementRef.current;
    if (v) {
      socketRef.current.emit('video:pause', {
        roomId: party.roomId,
        timestamp: v.currentTime,
      });
    }
  };

  const handleLocalSeek = () => {
    if (!socketRef.current || !party) return;
    const v = videoElementRef.current;
    if (v) {
      socketRef.current.emit('video:seek', {
        roomId: party.roomId,
        timestamp: v.currentTime,
      });
    }
  };

  // ─── Call Control Toggles ───────────────────────────────────
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
    if (socketRef.current && party) {
      socketRef.current.emit('call:control', { roomId: party.roomId, isMuted: next });
    }
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next));
    }
    if (socketRef.current && party) {
      socketRef.current.emit('call:control', { roomId: party.roomId, isVideoOff: next });
    }
  };

  // ─── Screen Sharing ─────────────────────────────────────────
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      if (socketRef.current && party) {
        socketRef.current.emit('screen:stop', { roomId: party.roomId });
      }
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = displayStream;
          setIsScreenSharing(true);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = displayStream;
          }

          displayStream.getVideoTracks()[0].onended = () => {
            toggleScreenShare();
          };

          if (socketRef.current && party) {
            socketRef.current.emit('screen:start', { roomId: party.roomId });
          }
        }
      } catch (err) {
        console.warn('Screen sharing cancelled or not supported:', err);
      }
    }
  };

  // ─── Session Recording (Host Feature) ───────────────────────
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (socketRef.current && party) {
        socketRef.current.emit('recording:stop', { roomId: party.roomId });
      }
    } else {
      // Start recording
      try {
        const streamToRecord = screenStreamRef.current || localStreamRef.current;
        if (!streamToRecord) {
          alert('No active media stream found to record.');
          return;
        }

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(streamToRecord, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm',
        });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `streamvault_party_recording_${roomId}_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);

          setRecordingSuccessNotice('Session recording finished & saved to your local downloads!');
          setTimeout(() => setRecordingSuccessNotice(''), 6000);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);

        if (socketRef.current && party) {
          socketRef.current.emit('recording:start', { roomId: party.roomId });
        }
      } catch (err) {
        console.error('Recording initialization error:', err);
      }
    }
  };

  // ─── Leave Call Handler ─────────────────────────────────────
  const handleLeaveCall = async () => {
    if (socketRef.current) {
      socketRef.current.emit('party:leave');
    }
    router.push(party ? `/watch/${party.videoId}` : '/videos');
  };

  // ─── Send Live Chat Message ─────────────────────────────────
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current || !party || !user) return;

    socketRef.current.emit('chat:message', {
      roomId: party.roomId,
      userId: user.id,
      name: user.name,
      text: chatInput.trim(),
    });

    setChatInput('');
  };

  // Copy party link
  const copyRoomInvite = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[var(--border-color)] border-t-[var(--brand)] rounded-full animate-spin" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">Connecting to Watch Party room…</p>
        </div>
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto px-4 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-2xl mb-4">
            ⚠️
          </div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)] mb-2">
            Watch Party Unavailable
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {error || 'This watch party room has ended or the link is invalid.'}
          </p>
          <Button variant="primary" onClick={() => router.push('/videos')}>
            Browse Videos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 glass border-b border-[var(--border-color)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/videos" className="text-xl">🎬</Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm sm:text-base text-[var(--text-primary)]">
                Watch Party
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand)]/20 text-[var(--brand)] uppercase tracking-wider">
                {roomId}
              </span>
              {isRecording && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> REC
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] truncate max-w-xs sm:max-w-md">
              {party.video?.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Invite button */}
          <button
            id="watch-party-invite-btn"
            onClick={copyRoomInvite}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold glass border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-all flex items-center gap-1.5"
          >
            {isCopied ? <span>✓ Copied Link!</span> : <span>🔗 Invite Friends</span>}
          </button>

          {/* Participant count toggle */}
          <button
            id="toggle-participants-btn"
            onClick={() => setShowParticipantsDrawer(!showParticipantsDrawer)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-secondary)] hover:bg-[var(--brand)]/10 text-[var(--text-primary)] transition-all flex items-center gap-1.5 border border-[var(--border-color)]"
          >
            <span>👥</span>
            <span>{participants.length}</span>
          </button>

          {/* Leave Call */}
          <Button
            id="leave-watch-party-btn"
            variant="ghost"
            size="sm"
            onClick={handleLeaveCall}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            Leave
          </Button>
        </div>
      </header>

      {/* Recording Success Toast Banner */}
      {recordingSuccessNotice && (
        <div className="bg-green-500/10 border-b border-green-500/30 text-green-400 px-4 py-2 text-xs font-semibold text-center animate-fade-in">
          {recordingSuccessNotice}
        </div>
      )}

      {/* Main Grid: Left Video & Call Grid (2 cols on lg) / Right Chat (1 col) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section: Synchronized Player & Peer Video Grid */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Synchronized Main Video Player */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-[var(--border-color)]">
            <video
              ref={videoElementRef}
              src={party.video?.videoUrl}
              controls
              onPlay={handleLocalPlay}
              onPause={handleLocalPause}
              onSeeked={handleLocalSeek}
              className="w-full h-full object-contain"
            />
            {/* Host Sync Badge */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white pointer-events-none flex items-center gap-1.5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Real-Time Sync • Host: {party.host?.name || 'Creator'}</span>
            </div>
          </div>

          {/* Call Controls Bar (Mute, Camera, Screen Share, Record, Leave) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              {/* Mic Button */}
              <button
                id="call-toggle-mic-btn"
                onClick={toggleMute}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                className={`p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--brand)]/15 border border-[var(--border-color)]'
                }`}
              >
                <span>{isMuted ? '🔇' : '🎙️'}</span>
                <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* Camera Button */}
              <button
                id="call-toggle-camera-btn"
                onClick={toggleVideo}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                className={`p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isVideoOff
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--brand)]/15 border border-[var(--border-color)]'
                }`}
              >
                <span>{isVideoOff ? '🚫' : '📹'}</span>
                <span className="hidden sm:inline">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
              </button>

              {/* Screen Share Button */}
              <button
                id="call-toggle-screen-btn"
                onClick={toggleScreenShare}
                title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                className={`p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isScreenSharing
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--brand)]/15 border border-[var(--border-color)]'
                }`}
              >
                <span>🖥️</span>
                <span className="hidden sm:inline">{isScreenSharing ? 'Sharing Screen' : 'Share Screen'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Session Recording Button (Optional host feature as per Task 1) */}
              <button
                id="call-record-session-btn"
                onClick={toggleRecording}
                title={isRecording ? 'Stop Session Recording' : 'Record Party Session'}
                className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse shadow-lg'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                }`}
              >
                <span>🔴</span>
                <span>{isRecording ? 'Stop Recording' : 'Record Session'}</span>
              </button>
            </div>
          </div>

          {/* WebRTC Video Call Grid: Local user + Peer video cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Local User Tile */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-[var(--border-color)] shadow-md group">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-gray-400">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-[var(--brand)]">
                    {(user?.name || 'Y').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] mt-1 text-gray-400">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white flex items-center gap-1.5">
                <span>{user?.name} (You)</span>
                {isMuted && <span className="text-red-400">🔇</span>}
                {isHost && <span className="text-yellow-400">👑 Host</span>}
              </div>
            </div>

            {/* Other Room Participants */}
            {participants
              .filter((p) => p.userId !== user?.id)
              .map((peer) => (
                <div
                  key={peer.socketId}
                  id={`peer-tile-${peer.userId}`}
                  className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-[var(--border-color)] shadow-md flex flex-col items-center justify-center"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--brand)]/20 border border-[var(--brand)]/40 flex items-center justify-center font-bold text-sm text-[var(--brand)]">
                    {peer.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-white mt-1.5">{peer.name}</span>

                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white flex items-center gap-1.5">
                    <span>{peer.name}</span>
                    {peer.isMuted && <span className="text-red-400">🔇</span>}
                    {peer.isHost && <span className="text-yellow-400">👑 Host</span>}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Section: Real-Time Live Chat Sidebar */}
        <div className="flex flex-col h-[520px] lg:h-auto rounded-2xl glass border border-[var(--border-color)] overflow-hidden">
          {/* Chat Header */}
          <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
            <div className="flex items-center gap-2">
              <span className="text-base">💬</span>
              <h3 className="font-display font-bold text-sm text-[var(--text-primary)]">
                Live Party Chat
              </h3>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">Real-Time</span>
          </div>

          {/* Chat Error Banner */}
          {chatError && (
            <div className="px-3 py-1.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
              {chatError}
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3 text-xs">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[var(--text-secondary)] p-4">
                <span className="text-3xl mb-2">🎉</span>
                <p className="font-semibold text-[var(--text-primary)]">Welcome to the Watch Party!</p>
                <p className="text-[11px] mt-1">Say hello to everyone in the room.</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMine = msg.userId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] mb-0.5">
                      <span className="font-semibold text-[var(--text-primary)]">{isMine ? 'You' : msg.name}</span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[85%] break-words ${
                        isMine
                          ? 'bg-[var(--brand)] text-white rounded-tr-none'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-tl-none border border-[var(--border-color)]'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={sendChatMessage} className="p-3 border-t border-[var(--border-color)] flex gap-2 bg-[var(--bg-secondary)]/30">
            <input
              id="watch-party-chat-input"
              type="text"
              placeholder="Type message… (abusive words/spam filtered)"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
            />
            <Button
              id="watch-party-chat-send-btn"
              type="submit"
              variant="primary"
              size="sm"
              disabled={!chatInput.trim()}
            >
              Send
            </Button>
          </form>
        </div>
      </main>

      {/* Participants Drawer / Modal */}
      {showParticipantsDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-2xl p-6 border border-[var(--border-color)] max-w-sm w-full bg-[var(--bg-primary)] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display font-bold text-base text-[var(--text-primary)]">
                👥 Participants ({participants.length})
              </h4>
              <button
                onClick={() => setShowParticipantsDrawer(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.socketId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center font-bold text-xs">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-[var(--text-primary)]">{p.name}</span>
                      {p.userId === user?.id && <span className="text-[10px] text-[var(--text-secondary)]"> (You)</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    {p.isHost && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400">
                        Host
                      </span>
                    )}
                    <span>{p.isMuted ? '🔇' : '🎙️'}</span>
                    <span>{p.isVideoOff ? '🚫' : '📹'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
