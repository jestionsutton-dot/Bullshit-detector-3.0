import Scanner from "./components/Scanner";

export default function App() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white font-mono flex flex-col items-center p-6 sm:p-10 lg:p-16">
      <div className="w-full max-w-5xl flex flex-col gap-12">
        {/* Header Section */}
        <header className="border-b border-zinc-850 pb-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter text-[#00FF00]">
              THE B.S. DETECTOR
            </h1>
            <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest bg-zinc-950 px-2.5 py-1 select-none border border-zinc-900">
              BUILD v2.8 (EXPERIMENTAL)
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl text-zinc-400 uppercase tracking-widest font-semibold">
              Powered by Sutton Audio & Power LLC
            </h2>
            <p className="text-md sm:text-lg border-l-4 border-[#00FF00] pl-4 text-zinc-300 font-sans">
              Separate observable fact from rhetorical framing at machine speed.
            </p>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-3xl leading-relaxed font-sans">
              Most media analysis tools summarize narratives. The B.S. Detector dissects them.
              Built for journalists, investigators, legal analysts, and opposition research teams 
              to reduce the hours required to audit high-volume media by highlighting cognitive biases,
              unsupported assertions, and emotional heuristics.
            </p>
          </div>
        </header>

        {/* Main Scanner Interface */}
        <section className="flex-grow">
          <Scanner />
        </section>

        {/* Disclaimer Footer */}
        <footer className="mt-16 border-t border-zinc-850 pt-8 text-xs text-zinc-650 flex flex-col md:flex-row justify-between gap-6 font-mono">
          <div className="space-y-1">
            <p>Designed outside the incentives of ad-driven media ecosystems.</p>
            <p>© 2026 Sutton Audio & Power LLC. All industrial rights reserved.</p>
          </div>
          <div className="md:text-right max-w-md">
            <p className="text-red-500/80 font-bold uppercase tracking-wider mb-1">
              DISCLAIMER / FORENSIC OPERATION PROTOCOL:
            </p>
            <p className="font-sans text-[11px] leading-relaxed">
              This system identifies structural patterns in discourse under the Normative Sentience Standard. 
              Final interpretation and fact checking remains the sole responsibility of the human operator.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
