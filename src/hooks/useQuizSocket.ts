"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { RoomSnapshot } from "@/server/socket";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io({ path: "/api/socketio", autoConnect: false });
  }
  return socket;
}

export function useQuizSocket(roomCode: string, userId: string | null) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<{
    isCorrect: boolean;
    pointsEarned: number;
  } | null>(null);
  const [latestReaction, setLatestReaction] = useState<{
    displayName: string;
    emoji: string;
  } | null>(null);

  useEffect(() => {
    if (!roomCode || !userId) return;

    const s = getSocket();
    s.connect();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onRoomState = (state: RoomSnapshot) => setRoom(state);
    const onAnswer = (data: { isCorrect: boolean; pointsEarned: number }) =>
      setAnswerFeedback(data);
    const onParticipants = (participants: RoomSnapshot["participants"]) =>
      setRoom((prev) => (prev ? { ...prev, participants } : prev));
    const onReaction = (r: { displayName: string; emoji: string }) => {
      setLatestReaction(r);
      setTimeout(() => setLatestReaction(null), 2500);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("room_state", onRoomState);
    s.on("answer_recorded", onAnswer);
    s.on("participants_updated", onParticipants);
    s.on("score_update", () => {});
    s.on("reaction_received", onReaction);

    s.emit("join_room", { roomCode: roomCode.toUpperCase(), userId });

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("room_state", onRoomState);
      s.off("answer_recorded", onAnswer);
      s.off("participants_updated", onParticipants);
      s.off("reaction_received", onReaction);
    };
  }, [roomCode, userId]);

  return {
    room,
    connected,
    answerFeedback,
    setAnswerFeedback,
    latestReaction,
    socket: getSocket(),
  };
}
