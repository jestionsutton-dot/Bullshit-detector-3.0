import React, { useState } from "react";
import { Search, Sparkles, Globe, ExternalLink} from "lucide-react";

interface SearchSource {
  title: string;
  url: string;
}

export default function GroundingSearch() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setErrorMsg("");
    setAnswer(null);
    setSources([]);

    try {
      const response = await fetch("/api/grounding-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "The search routing node returned an error.");
      }

      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to establish grounding node connection.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-[#111111] p-6 sm:p-8 border border-zinc-800 relative rounded">
      <span className="absolute top-0 right-8 bg-[#00FF00] text-black font-semibold text-[9px] px-2.5 py-0.5 uppercase tracking-wider">
        REAL-TIME GROUNDING NODE
      </span>

      <div className="flex flex-col gap-1">
        <label className="text-zinc-200 uppercase text-xs tracking-wider font-bold flex items-center gap-2">
          <Search className="w-4 h-4 text-[#00FF00]" />
          Interactive Truth Grounding Engine
        </label>
        <span className="text-[10px] text-zinc-500 uppercase">
          Enter any factual claim or topic. Gemini will query Google Search in real-time to formulate a verified consensus and reference links.
        </span>
      </div>

      <div className="flex gap-2.5 mt-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 bg-black border border-zinc-850 focus:border-[#00FF00] focus:ring-1 focus:ring-[#00FF00] text-zinc-100 px-4 py-3 font-mono text-sm focus:outline-none transition-colors rounded"
          placeholder="e.g. Did NASA find life on Venus?  or  Current silicon chip tariffs in the EU..."
          disabled={isSearching}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="bg-white hover:bg-[#00FF00] text-black font-extrabold uppercase px-6 text-xs transition-all duration-200 disabled:opacity-30 disabled:hover:bg-white tracking-widest flex items-center gap-2 cursor-pointer rounded shrink-0 h-11"
        >
          {isSearching ? "Searching..." : "Ground Verification"}
        </button>
      </div>

      {isSearching && (
        <div className="flex flex-col justify-center items-center py-12 gap-3 border border-zinc-900 bg-black/40 rounded mt-4">
          <div className="w-6 h-6 border-2 border-t-transparent border-[#00FF00] rounded-full animate-spin"></div>
          <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest animate-pulse">
            Resolving real-time Google Search Grounding Index...
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-4 border border-red-900/40 bg-red-950/20 text-red-400 text-xs rounded font-mono uppercase">
          <span className="font-bold block mb-1">SYSTEM ERROR:</span>
          {errorMsg}
        </div>
      )}

      {answer && !isSearching && (
        <div className="mt-6 space-y-6">
          <div className="border border-zinc-850 bg-black p-6 rounded relative">
            <span className="absolute top-0 right-4 bg-zinc-900 border border-zinc-850 text-zinc-400 font-semibold text-[8px] px-2 py-0.5 uppercase tracking-wider translate-y-[-50%] rounded">
              VERBATIM TRUTH RECORD
            </span>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#00FF00]" />
              <h4 className="text-xs uppercase tracking-wider font-extrabold text-[#00FF00]">
                Forensic Statement Evaluation
              </h4>
            </div>
            <p className="text-sm font-sans leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {answer}
            </p>
          </div>

          {sources.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-zinc-500" />
                CITED GOOGLE CRAWLER REFERENCES
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-[#161616] hover:bg-[#1C1C1C] border border-zinc-900 hover:border-zinc-700 transition-all rounded block group cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-[#00FF00] font-mono tracking-widest uppercase font-bold block">
                          REF [{idx + 1}]
                        </span>
                        <h5 className="text-xs text-zinc-300 font-bold font-sans group-hover:text-white line-clamp-1">
                          {src.title}
                        </h5>
                      </div>
                      <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-[#00FF00] shrink-0 mt-0.5" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
