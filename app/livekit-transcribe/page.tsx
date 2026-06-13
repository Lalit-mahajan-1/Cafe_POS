"use client";

import { useEffect, useState, useRef } from "react";
import {
  LiveKitRoom,
  useLocalParticipant,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Track, LocalAudioTrack } from "livekit-client";
import "@livekit/components-styles";

const ROOM_NAME = "transcription-demo";

export default function LiveKitTranscribePage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName: ROOM_NAME }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.token) setToken(d.token);
        else setError(d.error || "Failed to get token");
      });
  }, []);

  if (error) return <div className="p-6 text-red-600">❌ {error}</div>;
  if (!token) return <div className="p-6">Loading...</div>;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect
      audio={true}
      video={false}
    >
      <TranscriptionView />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function TranscriptionView() {
  const { localParticipant } = useLocalParticipant();
  const [transcript, setTranscript] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [isActive, setIsActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startTranscription = async () => {
    try {
      // 1. Get Deepgram temporary token
      const tokenRes = await fetch("/api/deepgram/token");
      const { token: dgToken } = await tokenRes.json();

      // 2. Get the local audio track from LiveKit
      const audioPub = Array.from(
        localParticipant.audioTrackPublications.values(),
      )[0];
      if (!audioPub?.track) {
        alert("No audio track found. Make sure mic is enabled.");
        return;
      }

      const mediaStreamTrack = (audioPub.track as LocalAudioTrack)
        .mediaStreamTrack;
      const stream = new MediaStream([mediaStreamTrack]);

      // 3. Connect to Deepgram WebSocket
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&interim_results=true&punctuate=true&language=en-US&encoding=linear16&sample_rate=16000`,
        ["token", dgToken],
      );

      ws.onopen = () => {
        console.log("✅ Deepgram connected");
        setIsActive(true);

        // 4. Pipe audio from LiveKit track to Deepgram
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
          }
          ws.send(int16.buffer);
        };

        processorRef.current = processor;
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const text = data.channel?.alternatives?.[0]?.transcript;
        if (!text) return;

        if (data.is_final) {
          setTranscript((prev) => [...prev, text]);
          setInterim("");
        } else {
          setInterim(text);
        }
      };

      ws.onerror = (e) => console.error("Deepgram error:", e);
      ws.onclose = () => {
        console.log("Deepgram closed");
        setIsActive(false);
      };

      wsRef.current = ws;
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    }
  };

  const stopTranscription = () => {
    wsRef.current?.close();
    processorRef.current?.disconnect();
    setIsActive(false);
    setInterim("");
  };

  return (
    <main className="max-w-3xl mx-auto mt-10 p-6">
      <h1 className="text-3xl font-bold mb-2">
        🎙️ LiveKit + Deepgram Transcription
      </h1>
      <p className="text-gray-600 mb-6">Production-grade speech-to-text</p>

      <div className="flex gap-3 mb-6">
        {!isActive ? (
          <button
            onClick={startTranscription}
            className="px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700"
          >
            🎤 Start Transcription
          </button>
        ) : (
          <button
            onClick={stopTranscription}
            className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 animate-pulse"
          >
            🛑 Stop
          </button>
        )}
      </div>

      <div className="border-2 rounded-lg p-6 min-h-[300px] bg-gray-50">
        {transcript.length === 0 && !interim ? (
          <p className="text-gray-400 italic">Start speaking...</p>
        ) : (
          <div className="space-y-2">
            {transcript.map((line, i) => (
              <p key={i} className="text-gray-900">
                {line}
              </p>
            ))}
            {interim && <p className="text-gray-400 italic">{interim}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
