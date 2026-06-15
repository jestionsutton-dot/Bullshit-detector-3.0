import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Activity, Volume2, Mic } from 'lucide-react';

interface NeurosyntaxFlag {
  category: string;
  intensity: number;
  evidence: string;
  color: string;
}

interface VoiceSegment {
  id: string;
  speaker: 'operator' | 'auditor';
  text: string;
  timestamp: string;
  flags?: NeurosyntaxFlag[];
}

export const VoiceOverlay: React.FC<{ isActive: boolean; latestTranscript?: any }> = ({
  isActive,
  latestTranscript
}) => {
  const [segments, setSegments] = useState<VoiceSegment[]>([]);
  const [liveMetrics, setLiveMetrics] = useState({ density: 0, bias: 0, activeFlags: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!latestTranscript) return;

    // Process fresh text payloads landing from the WebSocket client
    const newSegment: VoiceSegment = {
      id: Math.random().toString(36).substring(7),
      speaker: latestTranscript.type === 'user_turn' ? 'operator' : 'auditor',
      text: latestTranscript.text,
      timestamp: new Date().toLocaleTimeString(),
      flags: latestTranscript.flags || []
    };

    setSegments((prev) => [...prev, newSegment].slice(-20)); // Keep rolling 20 entries

    if (newSegment.flags && newSegment.flags.length > 0) {
      setLiveMetrics(prev => ({
        density: Math.min(100, prev.density + 12),
        bias: Math.round(newSegment.flags![0].intensity),
        activeFlags: prev.activeFlags + newSegment.flags!.length
      }));
    } else {
      // Natural rolling attenuation when speech is neutral
      setLiveMetrics(prev => ({ ...prev, density: Math.max(10, prev.density - 8) }));
    }
  }, [latestTranscript]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments]);

  if (!isActive) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-lg font-mono">
      {/* Rolling Visual Feed */}
      <div className="lg:col-span-3 bg-black/50 border border-zinc-900 rounded p-4 h-[400px] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4">
          <div className="flex items-center gap-2 text-emerald-400 text-sm tracking-wider animate-pulse">
            <Activity size={16} /> LIVE AUDIT STREAMING
          </div>
          <span className="text-xs text-zinc-500">POWERED BY SUTTON AUDIO & POWER</span>
        </div>

        <div className="space-y-4">
          {segments.map((seg) => (
            <div key={seg.id} className={`p-3 rounded border ${
              seg.speaker === 'operator' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-emerald-950/10 border-emerald-900/30'
            }`}>
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className={`flex items-center gap-1 font-bold tracking-wider ${
                  seg.speaker === 'operator' ? 'text-zinc-400' : 'text-emerald-400'
                }`}>
                  {seg.speaker === 'operator' ? <Mic size={12} /> : <Volume2 size={12} />}
                  {seg.speaker.toUpperCase()}
                </span>
                <span className="text-zinc-600">{seg.timestamp}</span>
              </div>
              <p className="text-zinc-200 text-sm leading-relaxed">{seg.text}</p>
              
              {seg.flags && seg.flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {seg.flags.map((flag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-[11px] bg-red-950/40 border border-red-900 text-red-400 px-2 py-0.5 rounded">
                      <ShieldAlert size={10} /> {flag.category.toUpperCase()} ({flag.intensity}%)
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Real-Time Telemetry Sidebar */}
      <div className="bg-zinc-900/20 border border-zinc-900 p-4 rounded flex flex-col justify-between">
        <div>
          <h3 className="text-zinc-400 text-xs tracking-widest font-bold mb-4 uppercase">Neurosyntax Metrics</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-500">Rhetorical Density</span>
                <span className="text-emerald-400">{liveMetrics.density}%</span>
              </div>
              <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${liveMetrics.density}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-500">Bias Deflection</span>
                <span className="text-red-400">{liveMetrics.bias}%</span>
              </div>
              <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${liveMetrics.bias}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-900 mt-4 text-center">
          <div className="text-2xl font-bold text-zinc-300">{liveMetrics.activeFlags}</div>
          <div className="text-[10px] text-zinc-600 tracking-wider uppercase">Flags Raised This Session</div>
        </div>
      </div>
    </div>
  );
};
