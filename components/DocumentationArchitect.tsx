
import React, { useState } from 'react';
import { 
  BookOpenIcon, 
  SparklesIcon, 
  ShieldCheckIcon, 
  DownloadIcon, 
  LinkIcon, 
  ChevronRightIcon,
  BeakerIcon
} from './icons.tsx';
import { GoogleGenAI } from "@google/genai";

const REGIONS = [
  "Malaysia (DOSH / OSHA 1994)",
  "Singapore (MOM / WSHA)",
  "United Kingdom (HSE / RIDDOR)",
  "United States (OSHA)",
  "European Union (EU-OSHA)",
  "Australia (Safe Work)",
  "Global (ISO Standard Focus)"
];

const DOC_TYPES = [
  "Standard Operating Procedure (SOP)",
  "Incident Response Plan",
  "Maintenance Safety Manual",
  "Environmental Policy Statement",
  "Audit Prep Checklist",
  "Service Level Agreement (SLA) Frame"
];

const DocumentationArchitect: React.FC = () => {
  const [region, setRegion] = useState(REGIONS[0]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [focusArea, setFocusArea] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [sources, setSources] = useState<{title: string, uri: string}[]>([]);

  const synthesizeDocumentation = async () => {
    if (!focusArea.trim()) return;
    setIsSynthesizing(true);
    setOutput(null);
    setSources([]);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Synthesize a comprehensive and legally robust ${docType} for the following operational context: 
        
        CONTEXT: ${focusArea}
        REGION: ${region}

        REQUIREMENTS:
        1. Use Google Search to find current and specific local regulations, codes of practice, or acts (e.g., Malaysia's OSHA 1994 amendments, Singapore's WSHA).
        2. Draft the document with professional headers, version control blocks, and clause mappings.
        3. Include a "Regulatory Alignment" section explicitly citing found local laws.
        4. Focus on technical facility management and helpdesk response efficiency.
        
        OUTPUT: Provide the document in high-fidelity Markdown format.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text;
        const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        const extractedSources = grounding?.map((chunk: any) => ({
            title: chunk.web?.title || 'Regulatory Source',
            uri: chunk.web?.uri || '#'
        })).filter((s: any) => s.uri !== '#') || [];

        setOutput(text);
        setSources(extractedSources);
    } catch (e) {
        console.error("Synthesis error:", e);
        alert("Neural synthesis failed. Please verify region connectivity.");
    } finally {
        setIsSynthesizing(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Architect Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-gray-800/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-gray-700/50 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <BookOpenIcon className="w-64 h-64 text-brand-400" />
        </div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-500/20">
            <BookOpenIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Doc Architect</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mt-1">Grounding-Enhanced Regulatory Synthesis</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
            <div className="px-4 py-2 bg-gray-950 rounded-xl border border-gray-800 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Online Search Grounding Active</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Controls Panel */}
          <div className="xl:col-span-4 space-y-8">
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-[2rem] p-8 shadow-2xl">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Synthesis Parameters</h3>
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-black text-brand-400 uppercase tracking-widest block mb-2">Operational Region</label>
                          <select 
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer"
                          >
                              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-brand-400 uppercase tracking-widest block mb-2">Documentation Target</label>
                          <select 
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer"
                          >
                              {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-brand-400 uppercase tracking-widest block mb-2">Technical Context / Focus Area</label>
                          <textarea 
                            value={focusArea}
                            onChange={(e) => setFocusArea(e.target.value)}
                            placeholder="E.g., High-rise window cleaning safety, server room fire suppression maintenance, or Tier 1 helpdesk escalations..."
                            className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all min-h-[140px] resize-none placeholder:text-gray-800"
                          />
                      </div>
                      <button 
                        onClick={synthesizeDocumentation}
                        disabled={isSynthesizing || !focusArea.trim()}
                        className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-900/40 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                      >
                        {isSynthesizing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                Researching Local Laws...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4" />
                                Synthesize Document
                            </>
                        )}
                      </button>
                  </div>
              </div>

              {sources.length > 0 && (
                  <div className="bg-gray-800/20 border border-gray-700/30 rounded-[2rem] p-8 animate-in slide-in-from-left-4 duration-500">
                      <h3 className="text-xs font-black text-gray-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Regulatory Source Verification
                      </h3>
                      <div className="space-y-3">
                          {sources.map((s, idx) => (
                              <a 
                                key={idx} 
                                href={s.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block p-4 bg-gray-950 hover:bg-gray-900 border border-gray-800 rounded-xl group transition-all"
                              >
                                  <span className="text-[10px] font-bold text-gray-500 group-hover:text-brand-400 block mb-1">Source {idx + 1}</span>
                                  <span className="text-xs font-black text-gray-300 uppercase tracking-tight line-clamp-1">{s.title}</span>
                              </a>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          {/* Workbench Output */}
          <div className="xl:col-span-8">
              <div className="bg-gray-900 border border-gray-700/50 rounded-[2.5rem] shadow-2xl min-h-[700px] flex flex-col overflow-hidden">
                  <div className="px-10 py-6 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <BeakerIcon className="w-5 h-5 text-brand-400" />
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Live Document Workbench</span>
                      </div>
                      {output && (
                          <button 
                            onClick={() => {
                                const blob = new Blob([output], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `synthesized_${docType.replace(/\s+/g, '_')}.md`;
                                a.click();
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            <DownloadIcon className="w-4 h-4" />
                            Export MD
                          </button>
                      )}
                  </div>
                  <div className="flex-grow p-10 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_50%_50%,_#1e293b_0%,_#0f172a_100%)]">
                      {output ? (
                          <div className="prose prose-invert prose-brand max-w-none animate-in fade-in duration-1000">
                             <div className="bg-gray-950/60 p-12 rounded-[2rem] border border-gray-700 shadow-2xl backdrop-blur-sm whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-300">
                                {output}
                             </div>
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                              <BookOpenIcon className="w-20 h-20 text-gray-700" />
                              <div>
                                  <h3 className="text-sm font-black text-gray-600 uppercase tracking-widest">Workbench Idle</h3>
                                  <p className="text-xs text-gray-700 mt-2 font-bold uppercase">Configure parameters to trigger neural synthesis</p>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* Logic Charter */}
      <div className="bg-gray-950 p-12 rounded-[2.5rem] border border-gray-800 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-brand-600 to-transparent"></div>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.5em] mb-6">Documentation Governance Charter</h3>
        <p className="text-xs text-gray-600 max-w-3xl mx-auto leading-relaxed uppercase font-black tracking-widest">
            The Documentation Architect utilizes live internet grounding to ensure SOPs reflect the current legislative landscape. This tool facilitates "Documentation-as-Audit" ensuring legal readiness across diverse operational jurisdictions.
        </p>
      </div>
    </div>
  );
};

export default DocumentationArchitect;
