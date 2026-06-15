import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Shield, StopCircle, Loader, MessageSquare, AlertTriangle } from "lucide-react";
import { VoiceOverlay } from "./VoiceOverlay";

// Standard PCM conversions matching the model 16kHz input standard
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // true for little endian
  }
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function runLocalHeuristicAnalysis(text: string) {
  const flags = [];
  if (/deliberate strategy|always|never|obviously|absolutely/i.test(text)) {
    flags.push({ category: "Loaded Language", intensity: 75, evidence: text, color: "text-red-400" });
  }
  if (/they|them|the media|systemic bias|conspiracy/i.test(text)) {
    flags.push({ category: "Out-Group Derogation", intensity: 80, evidence: text, color: "text-red-400" });
  }
  return flags;
}

export default function LiveVoice() {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [errorText, setErrorText] = useState("");
  const [logs, setLogs] = useState<{ origin: "user" | "auditor"; text: string }[]>([]);
  const [isAuditorSpeaking, setIsAuditorSpeaking] = useState(false);
  const [latestTranscript, setLatestTranscript] = useState<any>(null);

  // Audio Context Ref variables avoiding React stale closures
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Advanced playback queue variables for gapless scheduling
  const nextPlayTimeRef = useRef<number>(0);
  const playQueueRef = useRef<AudioBufferSourceNode[]>([]);

  // Function to stop all playing audio and empty the playback queue
  const stopPlayback = () => {
    playQueueRef.current.forEach((source) => {
      try {
        source.stop();
      } catch (e) {}
    });
    playQueueRef.current = [];
    nextPlayTimeRef.current = 0;
  };

  // Convert and schedule raw base64 PCM 24kHz buffer directly into output context
  const playAudioChunk = (base64Audio: string) => {
    try {
      const audioCtx = outputAudioCtxRef.current;
      if (!audioCtx) return;

      const binary = window.atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const samples = len / 2;
      const float32Data = new Float32Array(samples);
      const view = new DataView(bytes.buffer);
      for (let i = 0; i < samples; i++) {
        const rawVal = view.getInt16(i * 2, true);
        float32Data[i] = rawVal / 32768.0;
      }

      // Create raw single channel 24000Hz buffer format returned by Gemini Live API
      const audioBuffer = audioCtx.createBuffer(1, samples, 24000);
      audioBuffer.copyToChannel(float32Data, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      source.onended = () => {
        // Simple garbage collection helper
        playQueueRef.current = playQueueRef.current.filter(src => src !== source);
        if (playQueueRef.current.length === 0) {
          setIsAuditorSpeaking(false);
        }
      };

      const currentTime = audioCtx.currentTime;
      if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime + 0.04; // safe padding offset for gapless sync
      }

      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
      playQueueRef.current.push(source);
      setIsAuditorSpeaking(true);
    } catch (e) {
      console.error("Failed to compile or dispatch auditory packet:", e);
    }
  };

  const handleConnect = async () => {
    setStatus("connecting");
    setErrorText("");
    setLogs([]);
    setLatestTranscript(null);

    try {
      console.log("Requesting hardware microphone inputs...");
      // 1. Request Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      console.log("Instantiating forensic audio processing contexts...");
      // 2. Instantiate Input Audio Context at 16000Hz
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      // 3. Instantiate Output Audio Context at 24000Hz
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;

      // Force resume to shift contexts out of default browser-suspended states
      await inputCtx.resume();
      await outputCtx.resume();
      console.log("Audio Context state:", { inputCtxState: inputCtx.state, outputCtxState: outputCtx.state });

      // 4. Connect Websocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live`;
      console.log(`Establishing WebSocket link: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection verified. Stream channel locked.");
        setStatus("connected");
        setErrorText("");

        // Start processing input on successful open
        const mediaSource = inputCtx.createMediaStreamSource(stream);
        // Using standard non-blocking ScriptProcessor
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        mediaSource.connect(processor);
        processor.connect(inputCtx.destination);

        let packetCount = 0;
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const rawPCM = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
            const base64 = arrayBufferToBase64(rawPCM);
            ws.send(JSON.stringify({ audio: base64 }));
            
            packetCount++;
            if (packetCount % 50 === 1) {
              console.log(`Hardware mic capturing: sent ${packetCount} chunks over WebSocket link.`);
            }
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            playAudioChunk(msg.audio);
          }
          if (msg.interrupted) {
            console.log("Auditor received verbal interruption. Clearing playback queue.");
            stopPlayback();
            setIsAuditorSpeaking(false);
          }
          if (msg.serverContent?.clientContent) {
            const parts = msg.serverContent.clientContent.parts || [];
            const text = parts.map((p: any) => p.text || "").join("").trim();
            if (text) {
              const flags = runLocalHeuristicAnalysis(text);
              setLatestTranscript({
                type: 'user_turn',
                text,
                flags
              });
            }
          }
          if (msg.serverContent?.modelTurn) {
            const parts = msg.serverContent.modelTurn.parts || [];
            const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join("").trim();
            if (textParts) {
              setLatestTranscript({
                type: 'model_turn',
                text: textParts,
                flags: []
              });
            }
          }
        } catch (err) {
          console.error("Failed parsing Live API websocket message:", err);
        }
      };

      ws.onerror = (e) => {
        console.error("Websocket stream crashed:", e);
        setErrorText("Audio verification stream was disconnected due to network errors.");
        handleDisconnection();
      };

      ws.onclose = (event) => {
        if (event.code !== 1000) {
          setErrorText(event.reason || "Websocket connection with forensic auditory node closed unexpectedly.");
        }
        handleDisconnection();
      };

    } catch (err: any) {
      console.error(err);
      setErrorText(err?.message || "Failed to acquire audio inputs or establish socket connection.");
      handleDisconnection();
    }
  };

  const handleDisconnection = () => {
    setStatus("disconnected");
    stopPlayback();
    setLatestTranscript(null);

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch (e) {}
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch (e) {}
      outputAudioCtxRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }
  };

  // Perform active cleanup when component is unmounted
  useEffect(() => {
    return () => {
      handleDisconnection();
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 bg-[#111111] p-6 sm:p-8 border border-zinc-800 relative rounded">
      <span className="absolute top-0 right-8 bg-[#00FF00] text-black font-semibold text-[9px] px-2.5 py-0.5 uppercase tracking-wider">
        AUDITORY VOICE NODE
      </span>

      <div className="flex flex-col gap-1">
        <label className="text-zinc-200 uppercase text-xs tracking-wider font-bold flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#00FF00]" />
          Real-Time Voice Auditor
        </label>
        <span className="text-[10px] text-zinc-500 uppercase">
          Open a low-latency voice corridor with Gemini Live (<code>gemini-3.1-flash-live-preview</code>). Speak claims aloud to debate and audit discourse rules immediately in real-time.
        </span>
      </div>

      <div className="flex flex-col items-center justify-center py-10 px-4 border border-zinc-900 bg-black/50 rounded-lg relative overflow-hidden min-h-[180px]">
        {status === "disconnected" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900 hover:bg-zinc-850 flex items-center justify-center border border-zinc-800 mx-auto transition-transform active:scale-95">
              <MicOff className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase font-bold block">
                AUDITOR STATUS: DISCONNECTED
              </span>
              <p className="text-xs text-zinc-400 font-sans max-w-sm">
                Unlock your microphone and start an active bidirectional debate session with the B.S. Detector automated voice auditor.
              </p>
            </div>
            <button
              onClick={handleConnect}
              className="bg-white hover:bg-[#00FF00] text-black font-extrabold uppercase py-3 px-8 text-xs transition-colors tracking-widest cursor-pointer rounded"
            >
              Start Auditory Debate
            </button>
          </div>
        )}

        {status === "connecting" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-850 mx-auto animate-pulse">
              <Loader className="w-6 h-6 text-[#00FF00] animate-spin" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-[#00FF00] font-mono tracking-widest uppercase font-bold block animate-pulse">
                INITIALIZING WEBSOCKET PIPELINE...
              </span>
              <p className="text-xs text-zinc-500 font-mono">
                Acquiring hardware inputs and spawning Gemini Live session...
              </p>
            </div>
          </div>
        )}

        {status === "connected" && (
          <div className="text-center space-y-6 w-full max-w-md">
            {/* Elegant audio visualizer simulation */}
            <div className="flex items-center justify-center gap-1.5 h-12">
              <span className={`w-1 rounded-full bg-[#00FF00] transition-all duration-150 ${isAuditorSpeaking ? "h-10 animate-bounce" : "h-2 animate-pulse"}`}></span>
              <span className={`w-1 rounded-full bg-[#00FF00] transition-all duration-150 delay-75 ${isAuditorSpeaking ? "h-6 animate-bounce" : "h-3 animate-pulse"}`}></span>
              <span className={`w-1 rounded-full bg-[#00FF00] transition-all duration-150 delay-150 ${isAuditorSpeaking ? "h-12 animate-bounce" : "h-2 animate-pulse"}`}></span>
              <span className={`w-1 rounded-full bg-[#00FF00] transition-all duration-150 delay-300 ${isAuditorSpeaking ? "h-8 animate-bounce" : "h-4 animate-pulse"}`}></span>
              <span className={`w-1 rounded-full bg-[#00FF00] transition-all duration-150 delay-75 ${isAuditorSpeaking ? "h-10 animate-bounce" : "h-2 animate-pulse"}`}></span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#00FF00] font-mono tracking-widest uppercase font-bold flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FF00] animate-ping"></span>
                AUDITOR STATUS: LIVE & LISTENING
              </span>
              <p className="text-xs font-sans text-zinc-300">
                {isAuditorSpeaking ? "Auditor is speaking..." : "Speak now. The auditor is hearing you."}
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleDisconnection}
                className="bg-red-500 hover:bg-red-600 text-white font-mono font-bold uppercase py-2 px-6 text-xs transition-colors tracking-widest flex items-center gap-1.5 cursor-pointer rounded"
              >
                <StopCircle className="w-4 h-4" />
                Close Corridor
              </button>
            </div>
          </div>
        )}
      </div>

      {errorText && (
        <div className="p-4 border border-red-950/40 bg-red-950/10 text-red-400 text-xs rounded font-mono uppercase flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <div className="space-y-0.5">
            <span className="font-bold block">CONNECTION ADVISORY:</span>
            <span>{errorText}</span>
          </div>
        </div>
      )}

      {status === "connected" && (
        <div className="p-4 border border-zinc-850 bg-black/40 text-zinc-400 text-[10px] font-sans leading-relaxed rounded flex gap-3">
          <Shield className="w-4 h-4 text-[#00FF00] shrink-0" />
          <div>
            <span className="font-extrabold text-white block uppercase tracking-wide mb-0.5">
              AUDIT PROTOCOL REMINDER:
            </span>
            <span>
              Always speak clearly. If the auditor is speaking, you can interrupt them freely by raising your voice. Under the Normative Sentience Standard, your speech is processed dynamically.
            </span>
          </div>
        </div>
      )}

      {status === "connected" && (
        <VoiceOverlay isActive={status === "connected"} latestTranscript={latestTranscript} />
      )}
    </div>
  );
}
