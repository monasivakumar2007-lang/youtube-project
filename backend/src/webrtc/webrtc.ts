// ============================================================
// src/webrtc/webrtc.ts
// WebRTC Signalling Architecture — STUB (Phase N)
// ============================================================
// WebRTC peer connections are established via Socket.IO signalling.
// The server acts as a signalling relay ONLY — it never handles
// the actual media streams (those travel peer-to-peer).
//
// Connection Flow:
//
//   Peer A                   Server (Socket.IO)           Peer B
//   ───────────────────────────────────────────────────────────
//   webrtc:offer      ──►   relay to Peer B        ──►
//                                                         webrtc:answer ──►
//                    ◄──   relay to Peer A
//   webrtc:ice-candidate ──► relay                 ──►
//   ◄──────────────────── relay                         webrtc:ice-candidate
//   [P2P connection established — media flows directly]
//
// STUN/TURN Servers:
//   - STUN: Google public STUN (stun:stun.l.google.com:19302) for development
//   - TURN: Self-hosted or Twilio TURN for production NAT traversal
//
// Screen Sharing:
//   - Uses getDisplayMedia() on the client
//   - Adds a new track to the existing RTCPeerConnection
//   - Renegotiation is triggered automatically
//   - Server broadcasts screen:start / screen:stop to the room
//
// Recording:
//   - Uses MediaRecorder API on the host client
//   - Uploads chunks to the backend via WebSocket or chunked HTTP POST
//   - Server tracks recordingStatus in WatchParty table
// ============================================================

export {}; // Module placeholder — implementation deferred to Phase N
