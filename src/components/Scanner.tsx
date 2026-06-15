import React, { useState, useEffect } from "react";
import { 
  SquareTerminal, 
  Sparkles, 
  Youtube, 
  FileText, 
  ChevronRight, 
  HelpCircle,
  Clock,
  Play,
  RotateCcw,
  BookOpen,
  Image as ImageIcon,
  Upload,
  Trash2,
  X,
  Mic,
  Search
} from "lucide-react";
import Dashboard from "./Dashboard";
import { ScanResponse, DataPoint } from "../types";
import GroundingSearch from "./GroundingSearch";
import LiveVoice from "./LiveVoice";

const TERMINAL_STEPS = [
  "Initializing Sutton Audio and Power LLC forensic audit network...",
  "Parsing target document metadata and structure boundaries...",
  "Extracting automatic language subtitle tracks server-side...",
  "Applying discourse parsing filters and grammar standardizers...",
  "Formulating Normative Sentience Standard heuristics...",
  "Deploying Gemini deep discourse intelligence nodes...",
  "Structuring multi-dimensional factuality evidence arrays...",
  "Audit trail successfully compiled and structured."
];

// Presets for rapid demonstration testing
const SAMPLERS = [
  {
    title: "Over-Hyped Technical Startup Pitch",
    text: "Listen, our new product is absolute magic. Everybody in Silicon Valley is saying it's the single greatest invention since the printing press. I witnessed a user literally cry tears of joy when they tried it yesterday! Other companies are completely dead in the water, and we will dominate 100% of the world's computed infrastructure. It is written in the cosmos that our token valuation will increase by 10,000x within the next quarter. If you don't invest now, you'll regret it for the rest of your natural life."
  },
  {
    title: "Congressional Committee Discussion (Neutral Factuality)",
    text: "The committee met on June 1st to review structural bridge inspections in the eastern sector. According to records introduced by the Department of Transportation, inspectors evaluated 15 bridges over a three-month period. Three projects were flagged as requiring mechanical retrofits prior to winter. While localized wear has been observed, engineers confirmed the primary supports remain safe for current weight constraints, and recommended funding allocated for maintenance be expedited by 12 percent."
  },
  {
    title: "Sensationalized Local News Broadcast",
    text: "A dark mystery is looming over our peaceful town of Oak Creek tonight. Experts warn of a silent threat lurking in your household that could strike at any second. Mrs. Gable down the street claims she saw a strange green flash in her garden, and panic is surging among families. Is our water contaminated? Is the county council hiding something from us? Our investigative team has uncoverd zero actual reports of illness, but local shop owners are terrified and state that business has collapsed by upwards of fifty percent."
  }
];

export default function Scanner() {
  const [scanMode, setScanMode] = useState<"text" | "screenshot" | "grounding" | "voice">("text");
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>("");
  const [isDragActive, setIsDragActive] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [results, setResults] = useState<ScanResponse | null>(null);
  const [errorHeader, setErrorHeader] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentStepText, setCurrentStepText] = useState("");

  // Terminal simulated progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      setStepIndex(0);
      setCurrentStepText(TERMINAL_STEPS[0]);
      
      interval = setInterval(() => {
        setStepIndex((prev) => {
          const nextVal = prev + 1;
          if (nextVal < TERMINAL_STEPS.length) {
            setCurrentStepText(TERMINAL_STEPS[nextVal]);
            return nextVal;
          } else {
            clearInterval(interval);
            return prev;
          }
        });
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const handleApplyPreset = (text: string) => {
    setScanMode("text");
    setInput(text);
    setErrorMsg("");
    setErrorHeader("");
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorHeader("INVALID FILE FORMAT");
      setErrorMsg("Please upload a valid PNG, JPEG, or WEBP screenshot framework.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setImage(e.target.result);
        setImageType(file.type);
        setErrorMsg("");
        setErrorHeader("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const initiateScan = async () => {
    if (scanMode === "text" && !input.trim()) return;
    if (scanMode === "screenshot" && !image) return;

    setIsScanning(true);
    setErrorHeader("");
    setErrorMsg("");
    setResults(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          source: input,
          image: scanMode === "screenshot" ? image : undefined,
          imageType: scanMode === "screenshot" ? imageType : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "YOUTUBE_SCRAPE_FAILED") {
          throw {
            header: "YOUTUBE CAPTION EXTRACER BLOCKED",
            message: data.error
          };
        } else {
          throw {
            header: "DISCOURSE SYSTEM FAILA_OUT",
            message: data.error || "Audit procedure timed out or rejected."
          };
        }
      }

      setResults(data);
    } catch (err: any) {
      setErrorHeader(err.header || "CRITICAL SYSTEM FAILA_OUT");
      setErrorMsg(err.message || "Forensic scanner node encountered connection interference.");
    } finally {
      setIsScanning(false);
      setStepIndex(0);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {!results && !isScanning && (
        <div className="flex flex-col gap-6">
          
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border border-zinc-850 bg-[#090909] p-1 gap-1 rounded">
            <button
              onClick={() => setScanMode("text")}
              className={`py-3 text-xs font-mono uppercase tracking-widest font-extrabold transition-all border cursor-pointer rounded-sm ${
                scanMode === "text"
                  ? "bg-white text-black border-white font-black"
                  : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <SquareTerminal className="w-3.5 h-3.5" />
                Raw / YT Audio
              </span>
            </button>
            <button
              onClick={() => setScanMode("screenshot")}
              className={`py-3 text-xs font-mono uppercase tracking-widest font-extrabold transition-all border cursor-pointer rounded-sm ${
                scanMode === "screenshot"
                  ? "bg-white text-black border-white font-black"
                  : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" />
                Visual Screenshot
              </span>
            </button>
            <button
              onClick={() => setScanMode("grounding")}
              className={`py-3 text-xs font-mono uppercase tracking-widest font-extrabold transition-all border cursor-pointer rounded-sm ${
                scanMode === "grounding"
                  ? "bg-white text-black border-white font-black"
                  : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Search className="w-3.5 h-3.5 text-[#00FF00]" />
                Deep Search
              </span>
            </button>
            <button
              onClick={() => setScanMode("voice")}
              className={`py-3 text-xs font-mono uppercase tracking-widest font-extrabold transition-all border cursor-pointer rounded-sm ${
                scanMode === "voice"
                  ? "bg-[#00FF00] text-black border-[#00FF00] font-black"
                  : "bg-transparent text-[#00FF00] border-transparent hover:text-[#00FF00]/80"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Mic className="w-3.5 h-3.5 animate-pulse" />
                Live Voice
              </span>
            </button>
          </div>

          {/* Mode-specific Input area wrapper */}
          {scanMode === "text" && (
            <div className="flex flex-col gap-4 bg-[#111111] p-8 border border-zinc-800 relative rounded">
              <span className="absolute top-0 right-8 bg-[#00FF00] text-black font-semibold text-[9px] px-2.5 py-0.5 uppercase tracking-wider">
                INPUT TARGET NODE
              </span>

              <div className="flex flex-col gap-1">
                <label className="text-zinc-200 uppercase text-xs tracking-wider font-bold flex items-center gap-2">
                  <SquareTerminal className="w-4 h-4 text-[#00FF00]" />
                  Target Video URL or Raw Discourse Text
                </label>
                <span className="text-[10px] text-zinc-500 uppercase">
                  Insert a public youtube watch link or paste a complete transcript/statement below.
                </span>
              </div>

              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (errorMsg) {
                    setErrorMsg("");
                    setErrorHeader("");
                  }
                }}
                className="w-full h-40 bg-black border border-zinc-850 focus:border-[#00FF00] focus:ring-1 focus:ring-[#00FF00] text-zinc-100 p-5 font-mono text-sm focus:outline-none resize-none transition-colors rounded"
                placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ  or  &quot;Our incredible new system will totally double your productivity...&quot;"
              />

              <div className="flex flex-wrap justify-between items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-zinc-500 text-xs">
                  {input.trim() ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FF00]"></span>
                      <span className="text-[10px] tracking-widest uppercase">
                        READY: {input.length} characters loaded
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] tracking-widest uppercase text-zinc-650">
                      AWAITING OPERATOR DISK INGESTION
                    </span>
                  )}
                </div>

                <button
                  onClick={initiateScan}
                  disabled={isScanning || !input.trim()}
                  className="bg-white text-black font-extrabold uppercase py-4 px-10 text-xs hover:bg-[#00FF00] transition-all duration-250 disabled:opacity-30 disabled:hover:bg-white tracking-widest flex items-center gap-2 cursor-pointer rounded"
                >
                  Assemble Audit & Scan
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {scanMode === "screenshot" && (
            <div className="flex flex-col gap-4 bg-[#111111] p-8 border border-zinc-800 relative rounded">
              <span className="absolute top-0 right-8 bg-[#00FF00] text-black font-semibold text-[9px] px-2.5 py-0.5 uppercase tracking-wider">
                SCREENSHOT NODE SLOT
              </span>

              <div className="flex flex-col gap-1">
                <label className="text-zinc-200 uppercase text-xs tracking-wider font-bold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#00FF00]" />
                  Visual Post Screenshot Ingestion
                </label>
                <span className="text-[10px] text-zinc-500 uppercase">
                  Audit social media or forum post screenshots for hidden structures, engagement metrics, and visual framing biases.
                </span>
              </div>

              {image ? (
                <div className="flex flex-col md:flex-row gap-6 bg-black border border-zinc-850 p-5 rounded relative">
                  <div className="w-full md:w-1/3 flex justify-center items-center bg-zinc-950 p-2 border border-zinc-900 rounded max-h-56 overflow-hidden">
                    <img
                      src={image}
                      alt="Ingested Screenshot Node"
                      referrerPolicy="no-referrer"
                      className="object-contain max-h-48 rounded"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-2">
                    <div className="space-y-2">
                      <span className="text-[10px] text-[#00FF00] font-bold uppercase tracking-wider block">
                        SCREENSHOT INGESTED & READY
                      </span>
                      <h5 className="text-xs text-white uppercase font-bold tracking-wide">
                        Visual Ingestion Frame Model loaded
                      </h5>
                      <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                        The hybrid OCR-and-reasoning engine is prepared to extract verbatim content and isolate discourse elements inside this image screenshot.
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono mt-1">
                        Type: {imageType} • Status: Buffered in Memory
                      </p>
                    </div>
                    <div className="flex gap-4 pt-3 mt-3 border-t border-zinc-900">
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          setImageType("");
                        }}
                        className="flex items-center gap-1.5 text-[10px] text-red-400 hover:text-red-200 uppercase font-bold tracking-widest transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Discard Screenshot Frame
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`w-full min-h-[220px] border border-dashed rounded bg-black/60 flex flex-col justify-center items-center p-8 text-center transition-all cursor-pointer ${
                    isDragActive 
                      ? "border-[#00FF00] bg-[#00FF00]/5" 
                      : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950"
                  }`}
                  onClick={() => document.getElementById("screenshot-upload-slot")?.click()}
                >
                  <input
                    id="screenshot-upload-slot"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className={`w-8 h-8 mb-3 transition-colors ${isDragActive ? "text-[#00FF00]" : "text-zinc-650"}`} />
                  <p className="text-xs text-zinc-300 font-mono font-bold uppercase tracking-wider leading-none">
                    Click to Ingest or Drag & Drop Screenshot
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wide leading-relaxed mt-2 max-w-md font-sans">
                    Drop the screenshot of the social media or forum post here. Highly reliable verbatim extraction with automated context isolation is applied instantly.
                  </p>
                </div>
              )}

              {/* Optional supplemental rules/prompt override */}
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
                  Operator supplemental focus guidelines (Optional)
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full bg-black border border-zinc-855 focus:border-[#00FF00] focus:ring-1 focus:ring-[#00FF00] text-zinc-100 px-4 py-2.5 font-mono text-xs focus:outline-none transition-colors rounded"
                  placeholder="e.g. Focus exclusively on the primary post bounding box, ignore comments..."
                />
              </div>

              <div className="flex flex-wrap justify-between items-center gap-4 pt-3 mt-1 border-t border-zinc-900">
                <div className="flex items-center gap-2 text-zinc-500 text-xs">
                  {image ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FF00]"></span>
                      <span className="text-[10px] tracking-widest uppercase text-zinc-300">
                        READY FOR FORENSIC STAGE: SCAN ACTIVE
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] tracking-widest uppercase text-zinc-650">
                      AWAITING INGESTION SLOT POPULATION
                    </span>
                  )}
                </div>

                <button
                  onClick={initiateScan}
                  disabled={isScanning || !image}
                  className="bg-white text-black font-extrabold uppercase py-4 px-10 text-xs hover:bg-[#00FF00] transition-all duration-250 disabled:opacity-30 disabled:hover:bg-white tracking-widest flex items-center gap-2 cursor-pointer rounded"
                >
                  Assemble Screen-Audit
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {scanMode === "grounding" && (
            <GroundingSearch />
          )}

          {scanMode === "voice" && (
            <LiveVoice />
          )}

          {/* Quick Sampler Presets */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              Ingest Test Case Samplers
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SAMPLERS.map((sampler, i) => (
                <button
                  key={i}
                  onClick={() => handleApplyPreset(sampler.text)}
                  className="bg-[#111111] hover:bg-[#161616] p-4 text-left border border-zinc-900 hover:border-zinc-700 transition-all flex flex-col justify-between h-36 rounded"
                >
                  <div className="space-y-1">
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block">
                      CASE NO. {i + 1}
                    </span>
                    <h5 className="font-bold text-xs text-white uppercase group-hover:text-[#00FF00] leading-snug">
                      {sampler.title}
                    </h5>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans line-clamp-2 mt-2 leading-relaxed">
                    {sampler.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progressive Terminal Scanning readout screen */}
      {isScanning && (
        <div className="bg-[#0c0c0c] border border-[#00FF00] p-8 text-[#00FF00] font-mono text-xs flex flex-col gap-6 relative overflow-hidden rounded">
          <div className="absolute top-0 right-4 p-2 font-bold text-[8px] tracking-widest text-[#00FF00]/40 uppercase select-none">
            AUDIT NETWORK ACTIVE
          </div>
          
          <div className="flex flex-col gap-1 border-b border-[#00FF00]/15 pb-4">
            <span className="font-bold uppercase text-[#00FF00]/80 tracking-widest text-[9px]">
              Sutton System Heuristic Terminal
            </span>
            <span className="text-[#00FF00]/40 text-[9px] uppercase">
              Operational Port: localhost:3000
            </span>
          </div>

          <div className="space-y-2 flex-grow min-h-[140px] flex flex-col justify-end pb-4 font-mono">
            {TERMINAL_STEPS.slice(0, stepIndex + 1).map((step, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2 transition-opacity duration-300 ${
                  idx === stepIndex ? "text-white font-bold opacity-100" : "text-[#00FF00]/50"
                }`}
              >
                <span>&gt;</span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          {/* Glowing loader band */}
          <div className="w-full bg-[#111] h-1.5 overflow-hidden border border-[#00FF00]/20 relative rounded-sm">
            <div className="h-full bg-[#00FF00] animate-[pulse_1s_infinite] w-2/3 transition-all duration-300"></div>
          </div>
        </div>
      )}

      {/* Nice detailed Error Panel */}
      {errorMsg && (
        <div className="bg-[#1a0505] border border-red-800 p-6 flex flex-col gap-3 font-mono rounded">
          <div className="flex items-center gap-2 text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping mr-1"></span>
            <span className="font-bold text-xs uppercase tracking-widest">
              SYSTEM REPORT: {errorHeader}
            </span>
          </div>
          <p className="text-xs text-red-200/90 leading-relaxed max-w-3xl font-sans">
            {errorMsg}
          </p>
          <div className="pt-2 border-t border-red-950 flex flex-wrap gap-4 items-center justify-between">
            <span className="text-[9px] text-[#FF0000]/55 uppercase tracking-widest">
              ERROR CODE: TRANSCR_EXTRACTION_ERR
            </span>
            <button
              onClick={() => {
                setErrorMsg("");
                setErrorHeader("");
              }}
              className="text-xs font-semibold uppercase underline text-red-400 hover:text-red-200 cursor-pointer"
            >
              Exits Error State
            </button>
          </div>
        </div>
      )}

      {/* Render detailed 8-point dashboard when final results are compiled */}
      {results && (
        <div className="flex flex-col gap-6">
          <Dashboard 
            data={results.audit} 
            wordCount={results.wordCount}
            isYouTube={results.isYouTube}
            videoId={results.videoId}
            sourceText={results.screenshotReport ? results.screenshotReport.coreContent : input}
            behavioralAudit={results.behavioralAudit}
            screenshotReport={results.screenshotReport}
            quotaExhausted={results.quotaExhausted}
            verifiableManifest={results.verifiableManifest}
            onNewScan={() => {
              setResults(null);
              // Clear previous screenshot frame on reset
              setImage(null);
              setImageType("");
              setInput("");
            }} 
          />
        </div>
      )}
    </div>
  );
}
