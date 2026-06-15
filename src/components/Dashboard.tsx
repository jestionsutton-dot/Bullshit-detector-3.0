import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  FileDown, 
  Copy, 
  Check, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ExternalLink,
  Lock,
  Search,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Flame,
  Scale,
  Globe,
  Sparkles,
  Volume2,
  Square,
  Play,
  Loader
} from "lucide-react";
import { DataPoint, FactCheckResponse, BehavioralAudit, ScreenshotReport, VerifiableAuditManifest } from "../types";
import LedgerSection from "./LedgerSection";

interface DashboardProps {
  data: DataPoint[];
  wordCount: number;
  isYouTube: boolean;
  videoId: string | null;
  sourceText: string;
  behavioralAudit?: BehavioralAudit;
  onNewScan: () => void;
  quotaExhausted?: boolean;
  screenshotReport?: ScreenshotReport;
  verifiableManifest?: VerifiableAuditManifest;
}

export default function Dashboard({ data, wordCount, isYouTube, videoId, sourceText, behavioralAudit, onNewScan, quotaExhausted, screenshotReport, verifiableManifest }: DashboardProps) {
  const [filterType, setFilterType] = useState<"all" | "facts" | "rhetoric" | "unverified">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [copiedFacebook, setCopiedFacebook] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // Tabs management
  const [activeTab, setActiveTab] = useState<"narrative" | "neurosyntax" | "ledger">("narrative");

  // YouTube deep playback timestamp tracking
  const [videoTimestamp, setVideoTimestamp] = useState<number | null>(null);

  // Live Fact checking states
  const [factChecking, setFactChecking] = useState(false);
  const [factCheckResponse, setFactCheckResponse] = useState<FactCheckResponse | null>(null);
  const [factCheckError, setFactCheckError] = useState("");

  const handleFactCheck = async () => {
    setFactChecking(true);
    setFactCheckError("");
    try {
      const res = await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Cross-reference lookup failed.");
      }
      setFactCheckResponse(resData);
    } catch (err: any) {
      setFactCheckError(err.message || "Failed to trigger live search grounding.");
    } finally {
      setFactChecking(false);
    }
  };

  // Automated Spoken Audio Report Narrator States
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [audioScript, setAudioScript] = useState("");
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  const stopAudioReport = () => {
    if (audioSource) {
      try {
        audioSource.stop();
      } catch (e) {}
      setAudioSource(null);
    }
    setIsPlayingAudio(false);
  };

  const handlePlayAudioReport = async () => {
    if (isPlayingAudio) {
      stopAudioReport();
      return;
    }

    setAudioLoading(true);
    setAudioError("");
    setAudioScript("");

    try {
      console.log("Triggering forensic vocal speech generation...");
      const res = await fetch("/api/audio-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrityScore: discourseIntegrityScore,
          wordCount,
          type: screenshotReport ? "Screen Post Screenshot" : isYouTube ? "YouTube Video Stream" : "Raw Text / Transcript",
          topCatches,
          screenshotReport
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed key audio report generation.");
      }

      setAudioScript(resData.script);

      // Instantiating high-fidelity AudioContext at 24000Hz (native TTS output)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioCtx || new AudioContextClass();
      if (!audioCtx) {
        setAudioCtx(ctx);
      }

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const binary = window.atob(resData.audio);
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

      // Create a 24000Hz single-channel audio buffer
      const audioBuffer = ctx.createBuffer(1, samples, 24000);
      audioBuffer.copyToChannel(float32Data, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.onended = () => {
        setIsPlayingAudio(false);
        setAudioSource(null);
      };

      setAudioSource(source);
      setIsPlayingAudio(true);
      source.start(0);

    } catch (err: any) {
      console.error(err);
      setAudioError(err.message || "Auditory synthesizer node failed to respond.");
    } finally {
      setAudioLoading(false);
    }
  };

  // Perform cleanups on component unmount
  useEffect(() => {
    return () => {
      if (audioSource) {
        try {
          audioSource.stop();
        } catch (e) {}
      }
    };
  }, [audioSource]);

  // Derive aggregate stats
  const discourseIntegrityScore = useMemo(() => {
    // Verified weight positive. Rhetorical framing & unsupported speculation weight negative.
    let baseScore = 100;
    
    data.forEach(item => {
      const cat = item.category.toLowerCase();
      // Items that pull credibility down
      if (cat.includes("unsupported speculation")) {
        baseScore -= (item.score / 100) * 20;
      } else if (cat.includes("emotional framing")) {
        baseScore -= (item.score / 100) * 15;
      } else if (cat.includes("narrative compression")) {
        baseScore -= (item.score / 100) * 10;
      } else if (cat.includes("anecdotal assertion")) {
        baseScore -= (item.score / 100) * 8;
      } else if (cat.includes("interpretive inference")) {
        baseScore -= (item.score / 100) * 5;
      }
      // Verified facts stabilize credibility
      else if (cat.includes("witnessed action") || cat.includes("corroborated claim")) {
        baseScore += (item.score / 100) * 5; // offset slightly
      }
    });

    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }, [data]);

  // Helper to calculate Estimated Trustworthiness (ETW)
  const calculateEtw = (category: string, score: number): number => {
    const cat = category.toLowerCase();
    if (cat.includes("witnessed action")) {
      return Math.max(80, Math.min(100, Math.round(score)));
    }
    if (cat.includes("corroborated claim")) {
      return Math.max(75, Math.min(98, Math.round(score * 0.95)));
    }
    if (cat.includes("anecdotal assertion")) {
      return Math.max(25, Math.round((100 - score) * 0.4 + 20));
    }
    if (cat.includes("interpretive inference")) {
      return Math.max(30, Math.round((100 - score) * 0.5 + 15));
    }
    if (cat.includes("unknown") || cat.includes("unverifiable")) {
      return Math.max(10, Math.round((100 - score) * 0.3));
    }
    // Rhetoric cards (unsupported spec, emotional, narrative compression)
    if (cat.includes("speculation")) {
      return Math.max(5, Math.round((100 - score) * 0.15 + 5));
    }
    if (cat.includes("emotional")) {
      return Math.max(8, Math.round((100 - score) * 0.2 + 8));
    }
    if (cat.includes("compression")) {
      return Math.max(12, Math.round((100 - score) * 0.25 + 10));
    }
    return Math.max(10, Math.round(100 - score));
  };

  // Extract top 3 catches for the X/receipt view (with Narrative Compression in prioritized absolute lead)
  const topCatches = useMemo(() => {
    const compressionItem = data.find(d => d.category.toLowerCase().includes("compression") && d.score > 0);
    const otherItems = data
      .filter(d => {
        const cat = d.category.toLowerCase();
        if (cat.includes("witnessed action") || cat.includes("corroborated claim")) return false;
        if (cat.includes("compression") && compressionItem) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score);

    const result = [];
    if (compressionItem) {
      result.push(compressionItem);
    }
    result.push(...otherItems);
    return result.slice(0, 3);
  }, [data]);

  // Export as text file
  const handleExportTxt = () => {
    let sections = [];

    sections.push([
      "================================================================",
      "             THE B.S. DETECTOR: FORENSIC DISCOURSE AUDIT",
      "              Licensed to Sutton Audio & Power LLC",
      "================================================================",
      `Date or Timestamp of Audit : ${new Date().toUTCString()}`,
      `Resource Audited           : ${screenshotReport ? `Visual Post Screenshot` : isYouTube ? `YouTube Video Stream [ID: ${videoId}]` : "Raw Text / Transcript"}`,
      `Estimated Dataset Length   : ${wordCount} words`,
      `Discourse Integrity Rating : ${discourseIntegrityScore} / 100`,
      "================================================================",
    ].join("\n"));

    if (screenshotReport) {
      sections.push([
        "----------------------------------------------------------------",
        "SECTION 1: VISUAL INGESTION FRAME REPORT (SCREENSHOT OCR)",
        "----------------------------------------------------------------",
        `[BS Risk Score]: ${screenshotReport.bsRiskScore}`,
        "",
        `[Verbatim Extracted Content]:`,
        screenshotReport.coreContent,
        "",
        `[Metadata, Context & Visual Framing]:`,
        screenshotReport.metadataContext,
        "",
        `[Forensic Linguistic Analysis Summary]:`,
        screenshotReport.forensicAnalysis,
      ].join("\n"));
    } else {
      sections.push([
        "----------------------------------------------------------------",
        "SECTION 1: RAW INGESTED SOURCE CODES / VERBATIM TEXT",
        "----------------------------------------------------------------",
        sourceText,
      ].join("\n"));
    }

    sections.push([
      "----------------------------------------------------------------",
      "SECTION 2: CORE EVALUATION MATRIX (8 PERSUASION & TRUST CATEGORIES)",
      "----------------------------------------------------------------",
      "Educational Heuristics Note on Trust Metrics:",
      "Each category receives a severity/prevalence score (0 to 100).",
      "Higher scores indicate heavier reliance on that persuasion or framing device.",
      "Estimated Trustworthiness (ETW) measures are mapped proportionally based on category rules.",
      "",
      data.map((d, index) => {
        const etw = calculateEtw(d.category, d.score);
        return [
          `${index + 1}. [CATEGORY]: ${d.category.toUpperCase()}`,
          `   - Prevalence Score : ${d.score} / 100`,
          `   - Estimated Trust  : ${etw}%`,
          `   - Heuristic Audit  : ${d.description}`,
          `   - Textual Evidence : "${d.evidence}"`,
        ].join("\n");
      }).join("\n\n")
    ].join("\n\n"));

    if (behavioralAudit) {
      const syntax = behavioralAudit.syntaxMapping;
      const neuro = behavioralAudit.neuroplasticity;
      const impact = behavioralAudit.impact;

      sections.push([
        "----------------------------------------------------------------",
        "SECTION 3: DEEP NEURO-BIOLOGICAL & PSYCHO-SYNTAX AUDIT",
        "----------------------------------------------------------------",
        "1. SYNTAX MAPPING & GRAMMATICAL PATTERNS",
        `   - Rhetorical Density        : ${syntax?.rhetoricalDensity}%`,
        `   - Structure Breakdown       : ${syntax?.sentenceStructureAnalysis}`,
        `   - Grammatical Bias Flags    : ${syntax?.grammarFlags && syntax.grammarFlags.length > 0 ? syntax.grammarFlags.join(", ") : "None Detected"}`,
        "",
        "2. NEUROPLASTICITY PATHWAYS & COGNITIVE RETELLING",
        `   - Cognitive Bypass Ratio    : ${neuro?.cognitiveBypassRatio}% (Measures how quickly this discourse subverts intellectual skepticism in favor of amygdala activation)`,
        "   - Stimulated Neural Tracks  :",
        neuro?.stimulatedPathways?.map((p, idx) => 
          `     [Pathway ${idx + 1} - ${p.pathway}] (Intensity: ${p.intensity}%)\n     Heuristics: ${p.description}`
        ).join("\n\n") || "No neural tracks mapped",
        "",
        "3. MATHEMATICAL DISCOURSE IMPACT INDICES",
        `   - Cognitive Load Index      : ${impact?.cognitiveLoadIndex} / 100`,
        `   - Emotional Resonance Index : ${impact?.emotionalResonanceIndex} / 100`,
        `   - Bias Density Score        : ${impact?.biasDensityScore} / 100`,
      ].join("\n"));
    }

    if (factCheckResponse) {
      sections.push([
        "----------------------------------------------------------------",
        "SECTION 4: GOOGLE SEARCH GROUNDING & CORROBORATING SOURCES",
        "----------------------------------------------------------------",
        "The following represents a live web verification cross-reference audit conducted on critical claims:",
        "",
        factCheckResponse.claims?.map((c, idx) => {
          return [
            `CLAIM #${idx + 1}: "${c.claim}"`,
            `Status      : [${c.status.toUpperCase()}]`,
            `Explanation : ${c.explanation}`,
            `Fact Check Sources:`,
            c.sources?.map(s => ` - ${s.title} (${s.url})`).join("\n") || " No active sources available."
          ].join("\n");
        }).join("\n\n") || "No claims cross-referenced."
      ].join("\n\n"));
    }

    sections.push([
      "================================================================",
      "                END OF DISCOURSE AUDIT STREAM",
      "      Keep public assertions verifiable, transparent and fair.",
      "================================================================",
    ].join("\n"));

    const blob = new Blob([sections.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bs_audit_report_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy structured Markdown report to clipboard
  const handleCopyMarkdown = () => {
    let md = [];

    md.push(`# THE B.S. DETECTOR: FORENSIC DISCOURSE AUDIT REPORT`);
    md.push(`*Licensed to Sutton Audio & Power LLC*`);
    md.push(`- **Date/Timestamp of Session:** \`${new Date().toUTCString()}\``);
    md.push(`- **Resource Audited:** ${screenshotReport ? `📷 Visual Post Screenshot` : isYouTube ? `🎥 YouTube Video Stream ([ID: ${videoId}](https://youtu.be/${videoId}))` : "📝 Raw Text / Transcript"}`);
    md.push(`- **Estimated Dataset Length:** \`${wordCount} words\``);
    md.push(`- **Discourse Integrity Rating:** \`${discourseIntegrityScore} / 100\``);

    md.push(`---`);

    if (screenshotReport) {
      md.push(`## 📷 SECTION 1: VISUAL INGESTION FRAME REPORT (SCREENSHOT OCR)`);
      md.push(`* **Overall Rhetorical Risk Rating:** **${screenshotReport.bsRiskScore}**`);
      md.push(`### [Verbatim Extracted Content]`);
      md.push(`> ${screenshotReport.coreContent.split("\n").join("\n> ")}`);
      md.push(`### [Metadata, Context & Visual Framing]`);
      md.push(`${screenshotReport.metadataContext}`);
      md.push(`### [Forensic Linguistic Analysis Summary]`);
      md.push(`${screenshotReport.forensicAnalysis}`);
    } else {
      md.push(`## 📝 SECTION 1: RAW INGESTED SOURCE CODES / VERBATIM TEXT`);
      md.push(`\`\`\`text\n${sourceText}\n\`\`\``);
    }

    md.push(`---`);

    md.push(`## 📊 SECTION 2: CORE EVALUATION MATRIX (8 PERSUASION & TRUST CATEGORIES)`);
    md.push(`Each category receives a severity score (0 to 100). Higher scores indicate heavier reliance on that persuasion or framing device. Estimated Trustworthiness (ETW) measures are mapped proportionally.`);
    md.push("");

    data.forEach((d, idx) => {
      const etw = calculateEtw(d.category, d.score);
      md.push(`### ${idx + 1}. [CATEGORY]: ${d.category}`);
      md.push(`* **Severity/Prevalence Score:** \`${d.score} / 100\``);
      md.push(`* **Estimated Trustworthiness (ETW):** \`${etw}%\``);
      md.push(`* **Heuristic Audit:** ${d.description}`);
      md.push(`* **Textual Evidence:** *"${d.evidence}"*`);
      md.push(``);
    });

    md.push(`---`);

    if (behavioralAudit) {
      const syntax = behavioralAudit.syntaxMapping;
      const neuro = behavioralAudit.neuroplasticity;
      const impact = behavioralAudit.impact;

      md.push(`## 🧠 SECTION 3: DEEP NEURO-BIOLOGICAL & PSYCHO-SYNTAX AUDIT`);
      
      md.push(`### 1. Syntax Mapping & Grammatical Patterns`);
      md.push(`* **Rhetorical Density:** \`${syntax?.rhetoricalDensity}%\``);
      md.push(`* **Semantic & Grammatical Flags:** ${syntax?.grammarFlags && syntax.grammarFlags.length > 0 ? syntax.grammarFlags.map(f => `\`${f}\``).join(", ") : "_None Detected_"}`);
      md.push(`* **Structure Breakdown:** *${syntax?.sentenceStructureAnalysis}*`);
      md.push(``);

      md.push(`### 2. Neuroplasticity Pathways & Cognitive Retelling`);
      md.push(`* **Cognitive Bypass Ratio:** \`${neuro?.cognitiveBypassRatio}%\` (Measures how quickly this discourse subverts intellectual skepticism in favor of amygdala activation)`);
      md.push(`#### Stimulated Neural Tracks:`);
      neuro?.stimulatedPathways?.forEach((p, idx) => {
        md.push(`##### Track #${idx + 1}: ${p.pathway} (Intensity: ${p.intensity}%)`);
        md.push(`> ${p.description}`);
        md.push(``);
      });

      md.push(`### 3. Mathematical Discourse Impact Indices`);
      md.push(`* **Cognitive Load Index:** \`${impact?.cognitiveLoadIndex} / 100\``);
      md.push(`* **Emotional Resonance Index:** \`${impact?.emotionalResonanceIndex} / 100\``);
      md.push(`* **Bias Density Score:** \`${impact?.biasDensityScore} / 100\``);
      md.push(``);
    }

    if (factCheckResponse) {
      md.push(`---`);
      md.push(`## 🔍 SECTION 4: GOOGLE SEARCH GROUNDING & CORROBORATING SOURCES`);
      md.push(`The following represents a live web verification cross-reference audit conducted on critical claims:`);
      md.push(``);

      factCheckResponse.claims?.forEach((c, idx) => {
        md.push(`### Claim #${idx + 1}: "${c.claim}"`);
        md.push(`* **Grounding Status:** **${c.status.toUpperCase()}**`);
        md.push(`* **Fact-Check Explanation:** ${c.explanation}`);
        if (c.sources && c.sources.length > 0) {
          md.push(`* **Corroborating Sources:**`);
          c.sources.forEach(s => {
            md.push(`  - [${s.title}](${s.url})`);
          });
        }
        md.push(``);
      });

      if (factCheckResponse.backingSources && factCheckResponse.backingSources.length > 0) {
        md.push(`### Combined Verification Reference Pool:`);
        factCheckResponse.backingSources.forEach(s => {
          md.push(`- [${s.title}](${s.url})`);
        });
        md.push(``);
      }
    }

    md.push(`---`);
    md.push(`*Keep public assertions verifiable, transparent and fair. Mapped using The B.S. Detector forensic suite.*`);

    navigator.clipboard.writeText(md.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Category tags
  const getCategoryClass = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("witness") || cat.includes("corroborat")) {
      return {
        border: "border-emerald-500/40 bg-emerald-950/20 text-emerald-400 hover:border-emerald-400/80",
        label: "Verified Grounding",
        colorCode: "emerald",
        badge: "bg-emerald-500/20 text-emerald-400"
      };
    }
    if (
      cat.includes("speculation") ||
      cat.includes("emotional") ||
      cat.includes("compression")
    ) {
      return {
        border: "border-red-500/40 bg-red-950/20 text-red-400 hover:border-red-400/85",
        label: "Discourse Flag",
        colorCode: "red",
        badge: "bg-red-500/20 text-red-400"
      };
    }
    return {
      border: "border-zinc-700 bg-zinc-900/30 text-zinc-300 hover:border-zinc-500",
      label: "Interpretive/Anecdotal",
      colorCode: "yellow",
      badge: "bg-amber-500/10 text-amber-400"
    };
  };

  // Filter & Search computation (boost Narrative Compression to the top of the findings)
  const filteredData = useMemo(() => {
    const rawFiltered = data.filter((item) => {
      const matchesSearch =
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.evidence.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const cat = item.category.toLowerCase();
      if (filterType === "facts") {
        return cat.includes("witness") || cat.includes("corroborat");
      }
      if (filterType === "rhetoric") {
        return (
          cat.includes("speculation") || cat.includes("emotional") || cat.includes("compression")
        );
      }
      if (filterType === "unverified") {
        return (
          cat.includes("anecdotal") ||
          cat.includes("inference") ||
          cat.includes("unverifiable") ||
          cat.includes("unknown")
        );
      }
      return true;
    });

    // Bring Narrative Compression strictly to the top!
    return [...rawFiltered].sort((a, b) => {
      const aNC = a.category.toLowerCase().includes("compression");
      const bNC = b.category.toLowerCase().includes("compression");
      if (aNC && !bNC) return -1;
      if (!aNC && bNC) return 1;
      return 0; // maintain relative order
    });
  }, [data, filterType, searchQuery]);

  return (
    <div id="forensic-dashboard" className="flex flex-col gap-8 font-mono">
      {quotaExhausted && (
        <div className="bg-[#1f1607] border border-amber-800/60 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between text-amber-200 text-xs font-mono">
          <div className="flex gap-2.5 items-start">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold uppercase tracking-wider text-amber-450">
                Local Process Sandbox Mode Active (Workspace API Quota Exceeded)
              </span>
              <p className="text-amber-300/80 leading-relaxed max-w-4xl font-sans">
                The general developer key has reached its daily structural quota limitations. The forensic scanner has fallback-activated the local linguistic model. To restore 100% real-time, search-grounded live evaluations on custom text inputs, please enter your personal <strong className="text-white">GEMINI_API_KEY</strong> inside the "Settings &gt; Secrets" configuration panel in the left sidebar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mini toolbar */}
      <div className="flex flex-wrap justify-between items-center bg-[#111111] p-4 border border-zinc-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00FF00] animate-pulse"></div>
          <span className="text-xs text-zinc-400 uppercase tracking-widest">
            {screenshotReport ? "SCREEN POST PROTOCOL ACTIVE" : isYouTube ? "YOUTUBE PROTOCOL ACTIVE" : "TEXT PROTOCOL ACTIVE"}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-xs text-zinc-400 uppercase tracking-widest">
            {wordCount} WORDS AUDITED
          </span>
        </div>
        <button
          onClick={onNewScan}
          className="text-xs text-zinc-400 hover:text-white uppercase transition-colors"
        >
          &larr; Audit New Document
        </button>
      </div>

      {screenshotReport && (
        <div className="bg-[#121214] border border-cyan-850 p-6 flex flex-col gap-6 font-mono relative rounded">
          <span className="absolute top-0 right-8 bg-cyan-600 text-white font-extrabold text-[9px] px-2.5 py-0.5 uppercase tracking-wider">
            SCREEN-AUDIT FORENSIC DECODER ACTIVE
          </span>
          <div className="flex items-center gap-2.5 text-cyan-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="font-extrabold text-xs uppercase tracking-widest">
              Visual Ingestion Report (Screenshot OCR & Discourse Audit)
            </span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Phase 1 verbatim/transcript column */}
            <div className="bg-black/50 p-5 border border-zinc-900 space-y-4 rounded flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest block border-b border-zinc-850 pb-2 mb-3">
                  Phase 1: Verbatim Ingestion & Isolation
                </span>
                <div className="space-y-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    &gt; [Core Content Transcript]
                  </span>
                  <p className="text-xs text-zinc-100 font-sans leading-relaxed whitespace-pre-wrap select-text bg-black p-4 border border-zinc-950 rounded max-h-48 overflow-y-auto">
                    {screenshotReport.coreContent}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 pt-3 border-t border-zinc-900">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                  &gt; [Metadata, Metrics & Visual Framing]
                </span>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap bg-black/40 p-4 border border-zinc-950 rounded select-text">
                  {screenshotReport.metadataContext}
                </p>
              </div>
            </div>

            {/* Phase 2 behavioral breakdown column */}
            <div className="bg-black/50 p-5 border border-zinc-900 space-y-4 rounded flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest block border-b border-zinc-850 pb-2 mb-3">
                  Phase 2: Forensic Discourse Audit
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">
                  &gt; [Linguistic Manipulation & Bias Vectors]
                </span>
                <div className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap bg-black p-4 border border-zinc-950 rounded max-h-56 overflow-y-auto select-text">
                  {screenshotReport.forensicAnalysis}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-850 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest">
                    Screenshot Rhetorical Integrity Evaluation
                  </span>
                  <span className="text-xs text-cyan-400 font-black tracking-widest uppercase">
                    Rhetorical Integrity Rating
                  </span>
                </div>
                <div className="px-4 py-2.5 bg-cyan-950/20 border border-cyan-800/40 text-center rounded">
                  <span className="text-sm font-black text-white px-1 font-mono">
                    {screenshotReport.bsRiskScore}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Score Section with Hero Thermal Receipt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Side: Thermal Shareable Receipt as Hero */}
        <div className="bg-gradient-to-b from-[#FCFAF7] to-[#EDEDE9] text-zinc-900 p-6 border border-zinc-300 shadow-xl rounded relative overflow-hidden font-mono flex flex-col justify-between">
          {/* Jagged / dotted line top boundary effect */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-950/10 border-b border-dashed border-zinc-950/30"></div>

          <div>
            {/* Header logo */}
            <div className="text-center pt-1 pb-3 border-b border-dashed border-zinc-400">
              <span className="text-[8px] font-bold text-zinc-500 block leading-none">THE B.S. DETECTOR // SUTTON SYSTEMS</span>
              <h3 className="text-sm font-black tracking-widest text-black flex items-center justify-center gap-1.5 mt-1 leading-none uppercase select-none">
                🧾 AUDIT RECEIPT
              </h3>
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest leading-none mt-0.5 block">Forensic Integrity Slip</span>
            </div>

            {/* Run metadata */}
            <div className="py-2.5 text-[9px] space-y-0.5 text-zinc-700 border-b border-dashed border-zinc-400 font-bold leading-none">
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{new Date().toISOString().split('T')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span>FEED:</span>
                <span className="truncate max-w-[150px]">{isYouTube ? `YT[${videoId}]` : "RAW_DISCOURSE_TEXT"}</span>
              </div>
              <div className="flex justify-between">
                <span>SIZE:</span>
                <span>{wordCount} WORDS</span>
              </div>
            </div>

            {/* Main verification score block */}
            <div className="py-3 text-center border-b border-dashed border-zinc-400">
              <span className="text-[8px] text-zinc-500 font-bold block leading-none">FACT INTEGRITY INDEX</span>
              <div className="text-4.5xl font-black text-black tracking-tighter my-1.5 leading-none">
                {discourseIntegrityScore}%
              </div>
              <span className={`text-[9px] px-2 py-0.5 font-extrabold select-none inline-block ${
                discourseIntegrityScore >= 70 ? "bg-emerald-100 text-emerald-800" :
                discourseIntegrityScore >= 40 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
              }`}>
                {discourseIntegrityScore >= 80 ? "GROUNDED STATEMENTS" :
                 discourseIntegrityScore >= 60 ? "LOCALIZED INFERENCES" :
                 discourseIntegrityScore >= 40 ? "MODERATE PERSUASION" :
                 "CRITICAL B.S. OVERLOAD"}
              </span>
            </div>

            {/* Highlighted catches (DC/ETW split) */}
            <div className="py-3 text-[10px] space-y-2.5 text-zinc-800">
              <span className="text-[8px] font-black text-zinc-500 block uppercase tracking-wider border-b border-zinc-300 pb-0.5 mb-1 leading-none">SPEECH EXPLOSIONS (DC/ETW):</span>
              {topCatches.map((item, idx) => {
                const etw = calculateEtw(item.category, item.score);
                const shortCat = item.category.replace("Unknown / ", "").replace("Unsupported ", "").toUpperCase();
                return (
                  <div key={idx} className="space-y-0.5 leading-tight">
                    <div className="flex justify-between font-black text-black">
                      <span>0{idx + 1} {shortCat.substring(0, 18)}</span>
                      <span className="shrink-0 text-red-600 pl-1">{item.score}% DC / {etw}% ETW</span>
                    </div>
                    <p className="text-[9px] text-zinc-600 font-sans line-clamp-1 italic pl-1 border-l border-zinc-300">
                      "{item.evidence}"
                    </p>
                  </div>
                );
              })}
              {topCatches.length === 0 && (
                <span className="text-[10px] text-zinc-500 italic block py-2 text-center">No rhetoric indicators detected.</span>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-dashed border-zinc-400 space-y-1.5 mt-auto shrink-0">
            {/* Barcode graphic */}
            <div className="text-center font-bold text-zinc-800 select-none tracking-tight py-1 bg-white border border-zinc-300 overflow-hidden leading-none text-[8px] flex flex-col items-center justify-center">
              <span className="font-serif block truncate tracking-[0.14em]">|||||| | || ||||| | ||| |||| | || ||| || ||| || | |||| ||</span>
              <span className="block text-[7px] text-zinc-450 tracking-widest mt-0.5 leading-none">VERIFICATION // {discourseIntegrityScore}*{wordCount}</span>
            </div>

            {/* Clipboard and Social Triggers */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  const verdictText = 
                    discourseIntegrityScore >= 80 ? "HIGH GROUNDING INTEGRITY" :
                    discourseIntegrityScore >= 60 ? "LOCALIZED INTERPRETIVE FRAMING" :
                    discourseIntegrityScore >= 40 ? "MODERATE STRUCTURAL BIAS" :
                    "CRITICAL RHETORICAL OVERLOAD";

                  const catchesText = topCatches.map((c, i) => {
                    const etw = calculateEtw(c.category, c.score);
                    return `${i + 1}. [${c.category.toUpperCase()}]
   Detected: ${c.score}% | Trustworthiness: ${etw}%
   Quote: "${c.evidence.length > 70 ? c.evidence.substring(0,68) + "..." : c.evidence}"`;
                  }).join("\n\n");

                  const receiptString = `🧾 THE B.S. DETECTOR - FACT INTEGRITY RECEIPT
========================================
VERDICT: ${verdictText}
INTEGRITY SCORE: [ ${discourseIntegrityScore}% ]
========================================
TOP DETECTED SPEECH CATCHES:

${catchesText}
========================================
Assessed via Sutton Audio & Power LLC
Check any transcript at: bsdetector.app`;

                  navigator.clipboard.writeText(receiptString);
                  setCopiedReceipt(true);
                  setTimeout(() => setCopiedReceipt(false), 2000);
                }}
                className="w-full py-2 px-3 bg-zinc-900 hover:bg-black text-white hover:text-[#00FF00] text-[10px] uppercase font-black tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer rounded"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedReceipt ? "Full Receipt Copied!" : "Copy Full Receipt TXT"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Share to X */}
                <button
                  onClick={() => {
                    const verdictText = 
                      discourseIntegrityScore >= 80 ? "HIGH INTEGRITY" :
                      discourseIntegrityScore >= 60 ? "LOCALIZED INFERENCES" :
                      discourseIntegrityScore >= 40 ? "MODERATE BIAS" :
                      "HIGH B.S. OVERLOAD";

                    const xCatches = topCatches.map((c, i) => {
                      const shortCat = c.category.replace("Unknown / ", "").replace("Unsupported ", "").toUpperCase();
                      return `• ${shortCat}: "${c.evidence.length > 50 ? c.evidence.substring(0, 47) + '...' : c.evidence}"`;
                    }).join("\n");

                    const xMessage = `🧾 B.S. Detector Integrity Audit: ${discourseIntegrityScore}% (${verdictText})\n\nTop Catches:\n${xCatches}\n\nAnalyze any transcript at bsdetector.app`;
                    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xMessage)}`;
                    window.open(shareUrl, "_blank");
                  }}
                  className="py-1.5 px-2 bg-zinc-100 hover:bg-white text-zinc-900 text-[9px] uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer rounded-sm border border-zinc-300"
                >
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X Post
                </button>

                {/* Share to Facebook */}
                <button
                  onClick={() => {
                    const verdictText = 
                      discourseIntegrityScore >= 80 ? "HIGH INTEGRITY" :
                      discourseIntegrityScore >= 60 ? "LOCALIZED INFERENCES" :
                      discourseIntegrityScore >= 40 ? "MODERATE BIAS" :
                      "HIGH B.S. OVERLOAD";

                    const fbCatches = topCatches.map((c, i) => {
                      const shortCat = c.category.replace("Unknown / ", "").replace("Unsupported ", "").toUpperCase();
                      return `• ${shortCat}: "${c.evidence.length > 50 ? c.evidence.substring(0, 47) + '...' : c.evidence}"`;
                    }).join("\n");

                    const fbMessage = `🧾 B.S. Detector Integrity Audit: ${discourseIntegrityScore}% (${verdictText})\n\nTop Catches:\n${fbCatches}\n\nAnalyze any speech at bsdetector.app`;
                    
                    navigator.clipboard.writeText(fbMessage);
                    setCopiedFacebook(true);
                    setTimeout(() => setCopiedFacebook(false), 3000);

                    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://bsdetector.app")}`;
                    window.open(shareUrl, "_blank");
                  }}
                  className="py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white text-[9px] uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer rounded-sm border border-blue-700"
                >
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  FB Post
                </button>
              </div>

              {copiedFacebook && (
                <div className="text-[8px] bg-blue-50 text-blue-800 p-1 border border-blue-200 text-center uppercase tracking-wide leading-tight rounded animate-pulse select-none">
                  ⚡ Audit summary copied to clipboard! Paste it directly into your FB post window.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right/Sidecar Side: Score & Verdict */}
        <div className="lg:col-span-2 bg-[#111111] p-8 border border-zinc-800 relative overflow-hidden flex flex-col md:flex-row gap-6 rounded">
          {/* Subtle decorative scan line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/20 animate-pulse"></div>

          {/* Column 1: Rating Dial */}
          <div className="flex flex-col justify-center items-center p-4 md:border-r border-zinc-800/80 pr-6 shrink-0">
            <span className="text-xs text-zinc-500 uppercase tracking-widest mb-3 text-center">
              Information Integrity Score
            </span>
            <div className="relative flex items-center justify-center w-36 h-36 rounded-full border border-dashed border-zinc-800">
              {/* Circular score border progress */}
              <div className="absolute inset-2 text-center flex flex-col justify-center items-center">
                <span className={`text-4.5xl font-black tracking-tighter ${
                  discourseIntegrityScore >= 70 ? "text-emerald-400" :
                  discourseIntegrityScore >= 40 ? "text-amber-400" : "text-rose-500"
                }`}>
                  {discourseIntegrityScore}%
                </span>
                <span className="text-[9px] text-zinc-500 tracking-wider uppercase mt-1">
                  DISCOURSE INDEX
                </span>
              </div>
              
              {/* Tiny accent markings */}
              <span className="absolute top-1 text-[8px] text-zinc-700 font-bold">100%</span>
              <span className="absolute bottom-1 text-[8px] text-zinc-700 font-bold">0%</span>
            </div>
          </div>

          {/* Column 2: Rating Judgment Description */}
          <div className="flex flex-col justify-center md:pl-6 py-4 flex-grow">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-5 h-5 text-zinc-400" />
              <h4 className="text-lg font-bold uppercase text-zinc-200">Discourse Verdict</h4>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans">
              {discourseIntegrityScore >= 80 && (
                "This document demonstrates high grounding integrity. The presentation prioritizes witnessed actions and corroborated data with minimal reliance on speculative or structural framing."
              )}
              {discourseIntegrityScore >= 60 && discourseIntegrityScore < 80 && (
                "This discourse exhibits localized interpretive framing. Factuality is present, but arguments are frequently wrapped in speculative inferences or narrative compressing patterns."
              )}
              {discourseIntegrityScore >= 40 && discourseIntegrityScore < 60 && (
                "This analysis indicates moderate structural bias. Emotional discourse pathways, sweeping narrative compression, and uncorroborated assertions shape the core architecture of the content."
              )}
              {discourseIntegrityScore < 40 && (
                "CRITICAL RHETORICAL OVERLOAD: The document operates primarily outside observable grounding. The structural patterns heavily leverage emotional targeting, leading narratives, and complete anecdotal frameworking."
              )}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-zinc-800/65">
              <button
                onClick={handleExportTxt}
                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 text-zinc-200 px-3.5 py-1.5 text-xs uppercase hover:bg-white hover:text-black hover:border-white transition-colors rounded cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download Audit Trail (.txt)
              </button>
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 text-zinc-200 px-3.5 py-1.5 text-xs uppercase hover:bg-white hover:text-black hover:border-white transition-colors rounded cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00FF00]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied Report" : "Copy Report (MD)"}
              </button>
              <button
                onClick={handlePlayAudioReport}
                disabled={audioLoading}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs uppercase transition-all rounded cursor-pointer border ${
                  isPlayingAudio 
                    ? "bg-red-950 border-red-500/80 text-red-200 hover:bg-red-900 hover:text-white"
                    : "bg-emerald-950/40 border-emerald-500/45 text-emerald-400 hover:bg-emerald-500 hover:text-black hover:border-emerald-500"
                } disabled:opacity-50`}
              >
                {audioLoading ? (
                  <Loader className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : isPlayingAudio ? (
                  <Square className="w-3.5 h-3.5 animate-pulse text-red-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                {audioLoading ? "Synthesizing Broadcast..." : isPlayingAudio ? "Stop Broadcast" : "Vocal Report Broadcast"}
              </button>
            </div>

            {/* Real-time Cinematic Voice Broadcast Overlay and Telemetry Caption */}
            <AnimatePresence>
              {(isPlayingAudio || audioLoading || audioError) && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-4 p-4 bg-zinc-950/80 border border-zinc-800 rounded flex flex-col gap-3 font-mono"
                >
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">
                        {audioLoading ? "TRANSMITTING SYNTH DATA CHANNEL..." : "FORENSIC VOCAL BROADCAST LIVE"}
                      </span>
                    </div>
                    {isPlayingAudio && (
                      <div className="flex gap-1 items-end h-3">
                        <div className="w-[1.5px] bg-[#00FF00] h-full animate-[bounce_1.1s_infinite]"></div>
                        <div className="w-[1.5px] bg-[#00FF00] h-2/3 animate-[bounce_0.8s_infinite_delay-100]"></div>
                        <div className="w-[1.5px] bg-[#00FF00] h-5/6 animate-[bounce_1.4s_infinite_delay-300]"></div>
                        <div className="w-[1.5px] bg-[#00FF00] h-1/2 animate-[bounce_0.9s_infinite_delay-150]"></div>
                      </div>
                    )}
                  </div>

                  {audioScript && (
                    <div className="space-y-1">
                      <span className="text-[9px] text-[#00FF00] uppercase font-bold tracking-wider block">
                        &gt; [Forensic Telemetry Readout]:
                      </span>
                      <p className="text-[11px] text-zinc-200 leading-relaxed font-sans bg-black/40 p-3 border border-zinc-900 rounded italic select-text">
                        "{audioScript}"
                      </p>
                    </div>
                  )}

                  {audioLoading && (
                    <div className="text-center py-2 text-zinc-500 text-[10px] flex items-center justify-center gap-2 uppercase tracking-wide">
                      <Loader className="w-3.5 h-3.5 animate-spin text-[#00FF00]" />
                      Generating verbal analysis script through Sutton's audio matrix...
                    </div>
                  )}

                  {audioError && (
                    <div className="text-[10px] text-red-400 p-2 border border-red-950 bg-red-950/10 rounded font-mono uppercase">
                      ERROR: {audioError}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Narrative Compression Spotlight Banner */}
      {(() => {
        const compressionItem = data.find(d => d.category.toLowerCase().includes("compression"));
        if (!compressionItem) return null;
        
        return (
          <div className="bg-gradient-to-r from-red-950/25 via-black to-zinc-950/30 p-6 border border-red-900/40 rounded flex flex-col lg:flex-row gap-6 items-center justify-between">
            <div className="space-y-3 flex-grow">
              <span className="bg-red-500/15 text-red-400 font-extrabold text-[9px] px-2.5 py-1 uppercase tracking-widest border-b border-red-500/25 inline-block rounded">
                ⚡ SPOTLIGHT CATCH: NARRATIVE COMPRESSION DETECTED
              </span>
              <h4 className="text-lg font-black tracking-tight text-white uppercase">
                Here's what got left out of this story
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-3xl">
                The speaker leveraged <strong className="text-zinc-200">Narrative Compression</strong> here—glossing over material, physical or logistical friction/limits to paint a flawless rhetorical scenario. Here is the exact passage:
              </p>
              
              <div className="bg-black/90 p-4 border border-zinc-900 text-xs font-mono text-zinc-300 relative rounded">
                <span className="absolute -right-1 -bottom-2 text-zinc-800 font-bold text-5xl font-serif select-none italic">“</span>
                <span className="text-red-500 font-bold mr-1">&gt;</span> "{compressionItem.evidence}"
              </div>
              
              <div className="text-xs text-zinc-350 leading-relaxed font-sans mt-2">
                <strong className="text-[#00FF00] uppercase font-mono text-[9px] tracking-wider block mb-1">WHY THIS HAPPENS (OMITTED CONTRASTS):</strong>
                <p>{compressionItem.description}</p>
              </div>
            </div>

            <div className="shrink-0 flex flex-col gap-2.5 w-full lg:w-48 bg-black/40 p-4 border border-zinc-850 rounded">
              <div className="text-center">
                <span className="text-[8px] text-zinc-500 block font-bold uppercase tracking-wider mb-1">CONCENTRATION METRIC</span>
                <span className="text-3xl font-black text-red-500">{compressionItem.score}%</span>
                <span className="text-[8px] text-zinc-400 block mt-1 uppercase font-bold tracking-widest">DISCOURSE SIGNAL</span>
              </div>
              <button
                onClick={() => {
                  const xText = `🧾 "Here's what got left out of this story..."\n\nI just audited text using the B.S. Detector. It flagged deep NARRATIVE COMPRESSION:\n\nQuote: "${compressionItem.evidence.length > 70 ? compressionItem.evidence.substring(0, 68) + '...' : compressionItem.evidence}"\n\nOmitted reality: ${compressionItem.description.length > 90 ? compressionItem.description.substring(0, 88) + '...' : compressionItem.description}`;
                  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`;
                  window.open(shareUrl, "_blank");
                }}
                className="w-full py-2 bg-red-950/90 text-red-200 hover:bg-red-500 hover:text-white border border-red-800 hover:border-red-400 text-[10px] uppercase font-black tracking-widest transition-all text-center rounded cursor-pointer"
              >
                🐦 Share Catch
              </button>
            </div>
          </div>
        );
      })()}

      {/* Dynamic View Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 border border-zinc-800 bg-black p-1.5 gap-2 rounded">
        <button
          onClick={() => setActiveTab("narrative")}
          className={`py-3 text-xs uppercase tracking-widest font-extrabold transition-all border cursor-pointer rounded-sm ${
            activeTab === "narrative" 
              ? "bg-white text-black border-white shadow-lg font-black" 
              : "bg-zinc-950 text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          Forensic Category Evidence Map
        </button>
        <button
          onClick={() => setActiveTab("neurosyntax")}
          className={`py-3 text-xs uppercase tracking-widest font-extrabold transition-all border cursor-pointer rounded-sm ${
            activeTab === "neurosyntax" 
              ? "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/30 shadow-lg font-black" 
              : "bg-zinc-950 text-zinc-500 border-transparent hover:text-zinc-300"
          }`}
        >
          Psychological Reframing & BS-Filter Audit
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`py-3 text-xs uppercase tracking-widest font-extrabold transition-all border cursor-pointer rounded-sm ${
            activeTab === "ledger" 
              ? "bg-[#00FF00] text-black border-[#00FF00] shadow-lg font-black" 
              : "bg-zinc-950 text-[#00FF00] border-transparent hover:text-[#00FF00]/80"
          }`}
        >
          🔒 Independent Cryptographic Ledger
        </button>
      </div>

      {activeTab === "neurosyntax" ? (
        /* Computational Neurosyntax and Behavioral Matrix Tab */
        <div className="flex flex-col gap-8 animate-fadeIn">
          {/* Section A: Neuro-Linguistic Impact Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gauge 1: Cognitive Bypass Ratio */}
            <div className="bg-[#111111] border border-zinc-800 p-6 flex flex-col justify-between relative overflow-hidden rounded">
              <span className="absolute top-0 right-4 bg-indigo-500/10 text-indigo-400 font-semibold text-[8px] px-2 py-0.5 uppercase tracking-widest border-b border-x border-indigo-500/20">
                CRITICAL BS-FILTER AUDIT
              </span>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-2">BS-Filter Penetrability</span>
                <h3 className="text-3xl font-extrabold text-stone-200 tracking-tight flex items-baseline gap-1">
                  {behavioralAudit?.neuroplasticity?.cognitiveBypassRatio || 0}%
                  <span className="text-[10px] text-zinc-500 font-normal uppercase">bypass rate</span>
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans mt-3">
                  Reveals how easily the phrasing sweeps around your analytical defenses and slips straight into immediate intuitive agreement before you think to verify it.
                </p>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 mt-6 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300" 
                  style={{ width: `${behavioralAudit?.neuroplasticity?.cognitiveBypassRatio || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Gauge 2: Rhetorical Density Index */}
            <div className="bg-[#111111] border border-zinc-800 p-6 flex flex-col justify-between relative overflow-hidden rounded">
              <span className="absolute top-0 right-4 bg-amber-500/10 text-amber-400 font-semibold text-[8px] px-2 py-0.5 uppercase tracking-widest border-b border-x border-amber-500/20">
                PERSUASIVE MECHANICS
              </span>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-2">Rhetoric to Plain Facts Ratio</span>
                <h3 className="text-3xl font-extrabold text-stone-200 tracking-tight flex items-baseline gap-1">
                  {behavioralAudit?.syntaxMapping?.rhetoricalDensity || 0}%
                  <span className="text-[10px] text-zinc-500 font-normal uppercase">rhetoric density</span>
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans mt-3">
                  Measures the presence of loaded adjectives, emotional appeals, and leading rhetorical frames relative to plain, sober, factual observations or objective data records.
                </p>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 mt-6 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-300" 
                  style={{ width: `${behavioralAudit?.syntaxMapping?.rhetoricalDensity || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Gauge 3: Computational Neuro scores */}
            <div className="bg-[#111111] border border-zinc-800 p-6 flex flex-col justify-between relative overflow-hidden rounded">
              <span className="absolute top-0 right-4 bg-emerald-500/10 text-emerald-400 font-semibold text-[8px] px-2 py-0.5 uppercase tracking-widest border-b border-x border-emerald-500/20">
                PSYCHOLOGICAL PERSUASION METRICS
              </span>
              <div className="space-y-4">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">Active Persuasion Intensity</span>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-mono uppercase mb-1">
                      <span className="text-zinc-400">Cognitive Load (Mental Gymnastics Needed)</span>
                      <span className="text-stone-300 font-bold">{behavioralAudit?.impact?.cognitiveLoadIndex || 0}/100</span>
                    </div>
                    <div className="h-1 bg-zinc-900 overflow-hidden rounded-full">
                      <div className="h-full bg-emerald-500" style={{ width: `${behavioralAudit?.impact?.cognitiveLoadIndex || 0}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono uppercase mb-1">
                      <span className="text-zinc-400">Emotional Resonance (Gut Instinct Pull)</span>
                      <span className="text-stone-300 font-bold">{behavioralAudit?.impact?.emotionalResonanceIndex || 0}/100</span>
                    </div>
                    <div className="h-1 bg-zinc-900 overflow-hidden rounded-full">
                      <div className="h-full bg-pink-500" style={{ width: `${behavioralAudit?.impact?.emotionalResonanceIndex || 0}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono uppercase mb-1">
                      <span className="text-zinc-400">One-Sided Argument Concentration</span>
                      <span className="text-stone-300 font-bold">{behavioralAudit?.impact?.biasDensityScore || 0}/100</span>
                    </div>
                    <div className="h-1 bg-zinc-900 overflow-hidden rounded-full">
                      <div className="h-full bg-yellow-500" style={{ width: `${behavioralAudit?.impact?.biasDensityScore || 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Syntax Analysis and Behavioral Map */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Column 1: Forensic Linguistic Syntax Analysis */}
            <div className="lg:col-span-3 bg-[#111111] border border-zinc-800 p-8 flex flex-col gap-6 relative rounded">
              <span className="absolute top-0 right-8 bg-[#00FF00]/10 text-[#00FF00] font-semibold text-[9px] px-2.5 py-0.5 uppercase tracking-widest border-b border-x border-[#00FF00]/20">
                LINGUISTIC ANALYSIS
              </span>
              <div className="border-b border-[#111111] pb-4">
                <h4 className="text-md font-bold uppercase tracking-tight text-stone-200">
                  Grammar & Phrasing Dissection
                </h4>
                <p className="text-[10px] text-zinc-500 uppercase mt-0.5">
                  structural analysis of sentence length, phrasing tricks, and logical leaps
                </p>
              </div>

              <div className="text-sm text-zinc-350 font-sans leading-relaxed space-y-4">
                <p className="whitespace-pre-line">
                  {behavioralAudit?.syntaxMapping?.sentenceStructureAnalysis || "No syntax maps parsed."}
                </p>
              </div>

              {behavioralAudit?.syntaxMapping?.grammarFlags && (
                <div className="pt-4 border-t border-zinc-850/70 mt-3">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-3">Grammar & Bias Indicators Detected</span>
                  <div className="flex flex-wrap gap-2">
                    {behavioralAudit.syntaxMapping.grammarFlags.map((flag: string, fIdx: number) => (
                      <span 
                        key={fIdx}
                        className="bg-black border border-zinc-800 hover:border-zinc-550 text-stone-300 text-[10px] px-3 py-1 uppercase tracking-tight font-mono transition-colors rounded"
                      >
                        ⚡ {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Neuroplasticity pathway target analysis */}
            <div className="lg:col-span-2 bg-[#111111] border border-zinc-800 p-8 flex flex-col gap-6 relative rounded">
              <span className="absolute top-0 right-8 bg-sky-500/10 text-sky-400 font-semibold text-[9px] px-2.5 py-0.5 uppercase tracking-widest border-b border-x border-sky-500/20">
                AUDIENCE REFLEXES
              </span>
              <div className="border-b border-zinc-850 pb-4">
                <h4 className="text-md font-bold uppercase tracking-tight text-zinc-200">
                  Mental Habits Targeted
                </h4>
                <p className="text-[10px] text-zinc-500 uppercase mt-0.5">
                  specific cognitive habits or reflexes this speech attempts to trigger
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {behavioralAudit?.neuroplasticity?.stimulatedPathways?.map((pt: any, pIdx: number) => (
                  <div key={pIdx} className="bg-black/35 p-4 border border-zinc-850 rounded flex flex-col gap-2">
                    <div className="flex justify-between items-center gap-2 border-b border-zinc-900 pb-1.5 mb-1">
                      <span className="text-[11px] font-bold uppercase text-sky-350 tracking-wider">
                        {pt.pathway}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0 uppercase font-semibold">
                        INTENSITY: {pt.intensity}/100
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-sans leading-normal">
                      {pt.description}
                    </p>
                  </div>
                ))}
                {(!behavioralAudit?.neuroplasticity?.stimulatedPathways || behavioralAudit.neuroplasticity.stimulatedPathways.length === 0) && (
                  <span className="text-xs text-zinc-650 block italic py-4">No specific pathways analyzed in this scan session.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "ledger" ? (
        /* Independent Cryptographic Ledger Manifest Panel */
        <LedgerSection manifest={verifiableManifest} />
      ) : (
        /* Original Category findings Evidence Map and Fact-checking tab contents */
        <div className="flex flex-col gap-8">
          
          {/* Sticky Anchor Helper */}
          <div id="youtube-provenance-anchor" className="scroll-mt-4"></div>

          {/* Conditional Embedded YouTube Player */}
          {isYouTube && videoId && (
            <div className="bg-[#111111] border border-zinc-800 p-6 flex flex-col gap-4 relative overflow-hidden">
              <span className="absolute top-0 right-8 bg-[#00FF00]/10 text-[#00FF00] font-semibold text-[9px] px-2.5 py-0.5 uppercase tracking-widest border-b border-x border-[#00FF00]/20">
                STATION FEED
              </span>
              <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold uppercase text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF00] animate-ping"></span>
                    PROVENANCE RECONNAISSANCE PLATFORM FEED
                  </h4>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 font-mono">
                    TARGET ID: {videoId} {videoTimestamp !== null ? `// INSTANT CUE OFFSET: ${Math.floor(videoTimestamp / 60)}m ${videoTimestamp % 60}s` : ""}
                  </p>
                </div>
                {videoTimestamp !== null && (
                  <button 
                    onClick={() => setVideoTimestamp(null)}
                    className="text-[9px] text-zinc-400 hover:text-[#00FF00] border border-zinc-800 hover:border-[#00FF00] px-2.5 py-1 uppercase transition-all rounded cursor-pointer"
                  >
                    Reset Playback Feed
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 aspect-video bg-black relative border border-zinc-900 rounded overflow-hidden">
                  <iframe
                    id="youtube-player-iframe"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=${videoTimestamp !== null ? "1" : "0"}&start=${videoTimestamp || 0}&enablejsapi=1`}
                    title="YouTube Video Player Forensic Interface"
                    className="w-full h-full absolute inset-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="no-referrer"
                    allowFullScreen
                  />
                </div>
                <div className="flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <span className="text-[9px] text-[#00FF00] font-bold tracking-widest uppercase block border-b border-zinc-900 pb-1.5">TIMELINE COORDINATES INDEX</span>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      The analyzer has mapped evidence quotes back to timing coordinates in the video. Click on any block to cue the embedded feed directly.
                    </p>
                    
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {data.map((item, idx) => {
                        if (item.timestamp !== undefined) {
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setVideoTimestamp(item.timestamp!);
                                document.getElementById("youtube-provenance-anchor")?.scrollIntoView({ behavior: "smooth" });
                              }}
                              className={`w-full text-left bg-black hover:bg-zinc-900/60 border ${
                                videoTimestamp === item.timestamp ? "border-[#00FF00] text-[#00FF00]" : "border-zinc-850 text-zinc-300"
                              } p-2 flex items-center justify-between text-[11px] font-mono transition-all rounded cursor-pointer`}
                            >
                              <span className="truncate pr-2 uppercase font-bold">{item.category}</span>
                              <span className="bg-zinc-950 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-tighter shrink-0 font-bold">
                                @ {item.timestampLabel || `${item.timestamp}s`}
                              </span>
                            </button>
                          );
                        }
                        return null;
                      })}
                      {!data.some(d => d.timestamp !== undefined) && (
                        <span className="text-[10px] text-zinc-600 block italic">No specific timing tags found matching transcripts.</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`https://www.youtube.com/watch?v=${videoId}${videoTimestamp !== null ? `&t=${videoTimestamp}` : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-zinc-700 hover:border-white text-zinc-400 hover:text-white uppercase p-3 text-center text-[10px] tracking-widest transition-all mt-2 flex items-center justify-center gap-2 font-bold"
                  >
                    <span>Launch in New Tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Fact-Checking Section */}
          <div id="fact-checker-node" className="bg-[#111111] border border-zinc-800 p-8 relative overflow-hidden flex flex-col gap-6">
        <span className="absolute top-0 right-8 bg-[#00FF00]/10 text-[#00FF00] font-semibold text-[9px] px-2.5 py-0.5 uppercase tracking-widest border-b border-x border-[#00FF00]/20">
          SURVEY ENGINE ACTIVE
        </span>
        
        <div className="border-b border-zinc-800 pb-4">
          <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-1 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#00FF00]" />
            REAL-TIME CROSS-REFERENCED CONTACT VERIFICATION
          </h3>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            cross-examining transcript assertions against verified live search indices in real-time
          </p>
        </div>

        {!factCheckResponse && !factChecking && (
          <div className="py-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-500">
              <Sparkles className="w-6 h-6 text-[#00FF00] animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-zinc-200 uppercase tracking-widest">
                Awaiting Truth Cross-Examination
              </h4>
              <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                Analyze and index key factual claims. The engine will extract 3-4 primary claims, deploy Google Search grounding crawlers, and return veracity markers with clickable reference points.
              </p>
            </div>
            <button
              onClick={handleFactCheck}
              className="mt-2 bg-zinc-900 hover:bg-white text-zinc-350 hover:text-black hover:border-white font-extrabold uppercase py-3.5 px-8 text-xs border border-zinc-700 tracking-widest flex items-center gap-2 transition-all cursor-pointer"
            >
              <Globe className="w-4 h-4 text-[#00FF00] group-hover:text-black" />
              Inquire & Cross-Reference Claims
            </button>
          </div>
        )}

        {factChecking && (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
            <div className="relative flex items-center justify-center">
              {/* Spinning border effect */}
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#00FF00]/25 animate-spin"></div>
              <Globe className="w-6 h-6 text-[#00FF00] absolute animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-widest text-[#00FF00] animate-pulse">
                Deploying Google Search Grounding nodes...
              </h4>
              <p className="text-[10px] text-zinc-500 max-w-sm uppercase font-mono tracking-wider">
                auditing key structural claims via real-time world-state information indices
              </p>
            </div>
          </div>
        )}

        {factCheckError && (
          <div className="bg-[#1a0505] border border-red-800 p-4 text-xs text-red-400 font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>ERROR: {factCheckError}</span>
            <button 
              onClick={handleFactCheck}
              className="underline font-bold uppercase ml-auto hover:text-red-200"
            >
              Retry
            </button>
          </div>
        )}

        {factCheckResponse && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {factCheckResponse.claims.map((claim, idx) => {
                const getStatusColor = (status: string) => {
                  const s = status.toLowerCase();
                  if (s === "verified") return { text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-950/20", tag: "VERIFIED CONSENSUS" };
                  if (s === "disputed") return { text: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-950/20", tag: "DISPUTED ASSERTION" };
                  if (s === "contradicted") return { text: "text-rose-500", border: "border-rose-500/30", bg: "bg-rose-950/20", tag: "CONTRADICTED / DEBUNKED" };
                  return { text: "text-zinc-400", border: "border-zinc-850", bg: "bg-zinc-900/30", tag: "UNVERIFIED SOURCE" };
                };
                
                const style = getStatusColor(claim.status);

                return (
                  <div key={idx} className={`bg-black/45 border ${style.border} p-5 flex flex-col justify-between gap-4 relative overflow-hidden`}>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center gap-2 border-b border-zinc-900 pb-2">
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${style.text}`}>
                          {style.tag}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono uppercase">
                          No. 0{idx + 1}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-[#00FF00]/50 font-bold uppercase tracking-wider block">Claim Highlighted:</span>
                        <h4 className="text-[13px] font-bold text-white uppercase italic tracking-wide leading-relaxed font-mono">
                          "{claim.claim}"
                        </h4>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] text-zinc-650 font-bold uppercase tracking-wider block">Veracity Audit:</span>
                        <p className="text-xs text-zinc-450 leading-relaxed font-sans">
                          {claim.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-900/60 mt-2">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">Verification Sources:</span>
                      <div className="flex flex-wrap gap-2">
                        {claim.sources.map((src, sIdx) => {
                          const cleanUrl = src.url ? (src.url.startsWith("http") ? src.url : `https://${src.url}`) : "";
                          return (
                            <a
                              key={sIdx}
                              href={cleanUrl || "#"}
                              target={cleanUrl ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              className="bg-zinc-950 border border-zinc-850 hover:border-zinc-600 text-[10px] text-zinc-400 hover:text-white px-2.5 py-1 uppercase tracking-tight flex items-center gap-1 transition-all rounded"
                            >
                              <span>{src.title || "Reference"}</span>
                              {cleanUrl && <ExternalLink className="w-2.5 h-2.5 text-zinc-600" />}
                            </a>
                          );
                        })}
                        {claim.sources.length === 0 && (
                          <span className="text-[10px] text-zinc-600 italic">No direct sources listed.</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* General grounding summary citation indices */}
            {factCheckResponse.backingSources && factCheckResponse.backingSources.length > 0 && (
              <div className="bg-black/60 p-5 border border-zinc-900 rounded">
                <span className="text-[10px] text-[#00FF00]/70 font-bold uppercase tracking-widest block mb-3">
                  Google Search Citation Cluster
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {factCheckResponse.backingSources.map((src, sIdx) => {
                    const cleanUrl = src.url ? (src.url.startsWith("http") ? src.url : `https://${src.url}`) : "";
                    const hostname = cleanUrl ? new URL(cleanUrl).hostname : "source";
                    return (
                      <a
                        key={sIdx}
                        href={cleanUrl || "#"}
                        target={cleanUrl ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-400 hover:text-[#00FF00] flex items-baseline gap-2 transition-all truncate"
                      >
                        <span className="text-[10px] text-zinc-650 font-bold shrink-0">[{sIdx + 1}]</span>
                        <span className="truncate hover:underline">{src.title}</span>
                        <span className="text-[9px] text-zinc-650 tracking-normal shrink-0">({hostname})</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center text-xs pt-2">
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {factCheckResponse.quotaExhausted ? (
                  <span className="text-amber-500 flex items-center gap-1.5 animate-pulse">
                    ⚠️ PROCESSOR RUNNING IN SANDBOX LIMITATION (OFFLINE VERIFICATION)
                  </span>
                ) : (
                  <span className="text-zinc-600">
                    DYNAMIC CRAWLING STATE COMPILED SUCCESSFULLY
                  </span>
                )}
              </span>
              <button
                onClick={handleFactCheck}
                className="text-[10px] text-[#00FF00]/80 hover:text-white uppercase transition-colors flex items-center gap-1 font-bold underline"
              >
                Re-Run Fact Verification
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Filtering and Searching */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-zinc-800 pb-4">
          {/* Section Heading */}
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-1">
              DISCOURSE AUDIT MAP
            </h3>
            <p className="text-xs text-zinc-500 uppercase">
              dissecting 8 dimensions of the target text
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-1 bg-black p-1 border border-zinc-800">
            <button
              onClick={() => setFilterType("all")}
              className={`text-xs px-3 py-1.5 uppercase transition-colors ${
                filterType === "all" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              All (8)
            </button>
            <button
              onClick={() => setFilterType("facts")}
              className={`text-xs px-3 py-1.5 uppercase transition-colors ${
                filterType === "facts" ? "bg-emerald-950/40 text-emerald-400 font-bold border-emerald-800 border" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Grounded
            </button>
            <button
              onClick={() => setFilterType("rhetoric")}
              className={`text-xs px-3 py-1.5 uppercase transition-colors ${
                filterType === "rhetoric" ? "bg-red-950/40 text-red-400 font-bold border-red-900 border" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Rhetoric
            </button>
            <button
              onClick={() => setFilterType("unverified")}
              className={`text-xs px-3 py-1.5 uppercase transition-colors ${
                filterType === "unverified" ? "bg-zinc-900 text-zinc-300 font-bold border-zinc-700 border" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Interpretive
            </button>
          </div>
        </div>

        {/* Live Search and metadata indicators */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FILTER ANALYSIS AND DIRECT EVIDENCE VIA KEYWORD SEARCH..."
            className="w-full bg-[#111111] border border-zinc-800 py-3.5 pl-11 pr-4 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 tracking-widest uppercase"
          />
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-600" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-3.5 text-xs text-zinc-500 hover:text-white uppercase transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>



      {/* Grid mapping out findings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredData.map((item, index) => {
            const classConfig = getCategoryClass(item.category);
            const isExpanded = expandedIndex === index;

            return (
              <motion.div
                key={index}
                layoutId={`card-${item.category}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className={`group flex flex-col justify-between cursor-pointer border border-zinc-850 p-5 p-6 bg-[#111111] hover:bg-[#161616] hover:border-zinc-700 transition-all relative overflow-hidden`}
              >
                {/* Visual score indicator vertical accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  classConfig.colorCode === "emerald" ? "bg-emerald-500" :
                  classConfig.colorCode === "red" ? "bg-red-500" : "bg-amber-500"
                }`}></div>

                <div>
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div className="space-y-1">
                      <span className="text-[10px] tracking-widest uppercase text-zinc-500 font-bold block">
                        {classConfig.label}
                      </span>
                      <h4 className="font-bold text-white uppercase text-base group-hover:text-[#00FF00] transition-colors leading-tight">
                        {item.category}
                      </h4>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 text-right font-mono min-w-[120px]">
                      <div>
                        <div className="flex justify-between items-center text-[10px] gap-2">
                          <span className="text-zinc-500 font-bold uppercase">DC: DETECTED</span>
                          <span className="text-stone-200 font-extrabold">{item.score}%</span>
                        </div>
                        <div className="w-24 h-1 bg-zinc-900 mt-0.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              classConfig.colorCode === "emerald" ? "bg-emerald-500" :
                              classConfig.colorCode === "red" ? "bg-red-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${item.score}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        {(() => {
                          const etw = calculateEtw(item.category, item.score);
                          return (
                            <>
                              <div className="flex justify-between items-center text-[10px] gap-2">
                                <span className="text-zinc-500 font-bold uppercase">ETW: TRUST</span>
                                <span className={etw >= 60 ? "text-emerald-400 font-extrabold" : etw >= 30 ? "text-amber-400 font-extrabold" : "text-rose-500 font-extrabold"}>{etw}%</span>
                              </div>
                              <div className="w-24 h-1 bg-zinc-900 mt-0.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    etw >= 60 ? "bg-emerald-500" :
                                    etw >= 30 ? "bg-amber-500" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${etw}%` }}
                                ></div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm pl-2 text-zinc-300 leading-relaxed mb-4 font-sans line-clamp-3 group-hover:line-clamp-none transition-all">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pl-2 space-y-2">
                  <div className="flex justify-between items-center text-zinc-600 text-[10px] uppercase font-bold tracking-wider">
                    <span>EXTRACTED DIRECT PROOF</span>
                    <span className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? "Collapse" : "Expand Source"}
                    </span>
                  </div>

                  {/* Evidence slot */}
                  <div className={`bg-black/80 p-3.5 border border-zinc-900 text-xs font-mono text-zinc-400 relative overflow-hidden transition-all duration-300 ${
                    isExpanded ? "max-h-[500px]" : "max-h-[70px] line-clamp-2"
                  }`}>
                    {/* Glowing quotation decor */}
                    <span className="absolute -right-1 -bottom-2 text-zinc-950 font-bold text-5xl leading-none font-serif select-none">“</span>
                    <span className="text-[#00FF00]/90 font-bold mr-1">&gt;</span> "{item.evidence}"
                  </div>

                  {/* Playback action button inside card if YouTube timestamp exists */}
                  {isYouTube && item.timestamp !== undefined && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoTimestamp(item.timestamp!);
                          document.getElementById("youtube-provenance-anchor")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="bg-black hover:bg-zinc-900 text-[10px] text-zinc-400 hover:text-[#00FF00] px-2.5 py-1.5 border border-zinc-850 hover:border-[#00FF00] uppercase tracking-widest flex items-center gap-1.5 transition-all rounded cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00FF00]"></span>
                        Play Segment @ {item.timestampLabel || `${item.timestamp}s`}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredData.length === 0 && (
          <div className="col-span-2 text-center py-12 border border-zinc-850 bg-[#111111] text-zinc-500">
            <AlertTriangle className="w-8 h-8 text-zinc-650 mx-auto mb-3" />
            <span className="text-xs uppercase tracking-widest text-zinc-500">
              No analysis outcomes match the current search query or active filter.
            </span>
          </div>
        )}
      </div>
      </div>
      )}

      {/* Forensic Framework Reference Footer info */}
      <div className="p-6 bg-black border border-zinc-850/80 rounded mt-4">
        <h5 className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-zinc-500" />
          The Normative Sentience Standard (Methodology Note)
        </h5>
        <p className="text-xs text-zinc-500 leading-relaxed font-sans">
          Discourse auditing parses inputs structurally. Grounded factual markers (Witnessed Actions, Corroborated Claims) anchor cognitive trust. Unverified or rhetorical markers (Emotional Framing, Speculative Inference, Narrative Compression) highlight instances where persuasion methods overtake descriptive truth. Use caution under heavy rhetorical loads. All metrics generated dynamically via machine-state intelligence under full verification of textual provenance.
        </p>
      </div>
    </div>
  );
}
