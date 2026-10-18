// ============================================================
// src/socket/watchParty.socket.ts
// Real-time Watch Party, WebRTC Signalling & Synchronisation
// ============================================================

import { Server, Socket } from 'socket.io';
import { prisma } from '../config/prisma';
import { moderateCommentText } from '../utils/moderation';

interface RoomParticipant {
  socketId: string;
  userId: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  joinedAt: Date;
}

// In-memory registry of active watch party rooms
const activeRooms = new Map<string, Map<string, RoomParticipant>>();

export const registerWatchPartyHandlers = (io: Server): void => {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    // ─── Join Watch Party Room ────────────────────────────────
    socket.on('party:join', async (payload: { roomId: string; userId: string; name: string; isHost?: boolean }) => {
      const { roomId, userId, name, isHost = false } = payload;
      currentRoomId = roomId;
      currentUserId = userId;

      socket.join(roomId);

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
      }

      const roomParticipants = activeRooms.get(roomId)!;
      const participant: RoomParticipant = {
        socketId: socket.id,
        userId,
        name: name || 'Guest',
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        isHost,
        joinedAt: new Date(),
      };

      roomParticipants.set(socket.id, participant);

      // Record in database
      try {
        const party = await prisma.watchParty.findFirst({ where: { roomId } });
        if (party) {
          await prisma.watchPartyParticipant.upsert({
            where: {
              partyId_userId: {
                partyId: party.id,
                userId,
              },
            },
            create: {
              partyId: party.id,
              userId,
              joinedAt: new Date(),
            },
            update: {
              leftAt: null,
            },
          });
        }
      } catch (err) {
        console.warn('[socket party:join db error]', err);
      }

      // Notify others in the room
      socket.to(roomId).emit('participant:joined', participant);

      // Send the complete existing participant list to the new joiner
      const allParticipants = Array.from(roomParticipants.values());
      socket.emit('party:participants', allParticipants);

      console.log(`[Socket] ${name} (${userId}) joined room ${roomId}. Total: ${allParticipants.length}`);
    });

    // ─── Synchronized Video Playback ──────────────────────────
    socket.on('video:play', (payload: { roomId: string; timestamp: number }) => {
      socket.to(payload.roomId).emit('video:play', {
        timestamp: payload.timestamp,
        fromSocketId: socket.id,
      });
    });

    socket.on('video:pause', (payload: { roomId: string; timestamp: number }) => {
      socket.to(payload.roomId).emit('video:pause', {
        timestamp: payload.timestamp,
        fromSocketId: socket.id,
      });
    });

    socket.on('video:seek', (payload: { roomId: string; timestamp: number }) => {
      socket.to(payload.roomId).emit('video:seek', {
        timestamp: payload.timestamp,
        fromSocketId: socket.id,
      });
    });

    // ─── Real-Time Live Chat ──────────────────────────────────
    socket.on('chat:message', (payload: { roomId: string; userId: string; name: string; text: string }) => {
      const { roomId, userId, name, text } = payload;
      if (!text || !text.trim()) return;

      // Toxicity & special char spam check
      const mod = moderateCommentText(text);
      if (mod.isBlocked) {
        socket.emit('chat:error', {
          message: mod.message || 'Message blocked by moderation rules.',
        });
        return;
      }

      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        name,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      io.to(roomId).emit('chat:message', message);
    });

    // ─── Call Controls (Mute / Camera Toggle) ─────────────────
    socket.on('call:control', (payload: { roomId: string; isMuted?: boolean; isVideoOff?: boolean }) => {
      const { roomId, isMuted, isVideoOff } = payload;
      const roomParticipants = activeRooms.get(roomId);
      if (roomParticipants && roomParticipants.has(socket.id)) {
        const p = roomParticipants.get(socket.id)!;
        if (isMuted !== undefined) p.isMuted = isMuted;
        if (isVideoOff !== undefined) p.isVideoOff = isVideoOff;

        io.to(roomId).emit('participant:updated', p);
      }
    });

    // ─── WebRTC Signalling Events (Peer-to-Peer Video Call) ───
    socket.on('webrtc:offer', (payload: { targetSocketId: string; sdp: any; senderName: string }) => {
      io.to(payload.targetSocketId).emit('webrtc:offer', {
        sdp: payload.sdp,
        senderSocketId: socket.id,
        senderName: payload.senderName,
      });
    });

    socket.on('webrtc:answer', (payload: { targetSocketId: string; sdp: any }) => {
      io.to(payload.targetSocketId).emit('webrtc:answer', {
        sdp: payload.sdp,
        senderSocketId: socket.id,
      });
    });

    socket.on('webrtc:ice-candidate', (payload: { targetSocketId: string; candidate: any }) => {
      io.to(payload.targetSocketId).emit('webrtc:ice-candidate', {
        candidate: payload.candidate,
        senderSocketId: socket.id,
      });
    });

    // ─── Screen Sharing Events ────────────────────────────────
    socket.on('screen:start', (payload: { roomId: string }) => {
      const roomParticipants = activeRooms.get(payload.roomId);
      if (roomParticipants && roomParticipants.has(socket.id)) {
        const p = roomParticipants.get(socket.id)!;
        p.isScreenSharing = true;
        io.to(payload.roomId).emit('screen:started', {
          socketId: socket.id,
          name: p.name,
        });
      }
    });

    socket.on('screen:stop', (payload: { roomId: string }) => {
      const roomParticipants = activeRooms.get(payload.roomId);
      if (roomParticipants && roomParticipants.has(socket.id)) {
        const p = roomParticipants.get(socket.id)!;
        p.isScreenSharing = false;
        io.to(payload.roomId).emit('screen:stopped', {
          socketId: socket.id,
        });
      }
    });

    // ─── Host Session Recording Events ────────────────────────
    socket.on('recording:start', async (payload: { roomId: string }) => {
      try {
        await prisma.watchParty.updateMany({
          where: { roomId: payload.roomId },
          data: { recordingStatus: 'RECORDING' },
        });
        io.to(payload.roomId).emit('recording:started', {
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[recording:start error]', err);
      }
    });

    socket.on('recording:stop', async (payload: { roomId: string }) => {
      try {
        await prisma.watchParty.updateMany({
          where: { roomId: payload.roomId },
          data: { recordingStatus: 'COMPLETED' },
        });
        io.to(payload.roomId).emit('recording:stopped', {
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[recording:stop error]', err);
      }
    });

    // ─── Leave Watch Party / Disconnect ───────────────────────
    const handleLeave = async () => {
      if (!currentRoomId) return;

      const roomParticipants = activeRooms.get(currentRoomId);
      if (roomParticipants) {
        roomParticipants.delete(socket.id);
        if (roomParticipants.size === 0) {
          activeRooms.delete(currentRoomId);
        }
      }

      socket.to(currentRoomId).emit('participant:left', {
        socketId: socket.id,
        userId: currentUserId,
      });

      // Update database leftAt
      if (currentUserId) {
        try {
          const party = await prisma.watchParty.findFirst({ where: { roomId: currentRoomId } });
          if (party) {
            await prisma.watchPartyParticipant.updateMany({
              where: { partyId: party.id, userId: currentUserId },
              data: { leftAt: new Date() },
            });
          }
        } catch (err) {
          console.warn('[socket leave db error]', err);
        }
      }

      socket.leave(currentRoomId);
      currentRoomId = null;
    };

    socket.on('party:leave', handleLeave);
    socket.on('disconnect', handleLeave);
  });
};
