
import React, { useState } from 'react';
import { ShieldCheckIcon, DocumentCheckIcon, ClockIcon, DatabaseIcon, BeakerIcon, ChartBarIcon, ChevronDownIcon } from './icons';

interface StepProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

const GuideStep: React.FC<StepProps> = ({ number, title, description, icon, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative pl-12 pb-12 last:pb-0 group">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-800 group-last:hidden"></div>
      
      {/* Step Number/Icon Circle */}
      <div className="absolute left-0 top-0 w-10 h-10 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center z-10 shadow-lg group-hover:border-brand-500 transition-colors">
        <span className="text-[10px] font-black text-brand-400">{number}</span>
      </div>

      <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6 hover:bg-gray-800/60 transition-all cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="text-brand-400">{icon}</div>
            <div>
              <h3 className="text-white font-black uppercase tracking-widest text-sm">{title}</h3>
              <p className="text-gray-500 text-xs mt-1 font-medium">{description}</p>
            </div>
          </div>
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDownIcon className="w-5 h-5 text-gray-600" />
          </div>
        </div>

        {isOpen && (
          <div className="mt-6 pt-6 border-t border-gray-700/50 space-y-4 animate-in fade-in slide-in-from-top-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

const OperationsGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Operations & Audit Manual</h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
          Standardized protocols for system implementation and daily regulatory auditing. Ensure 100% data fidelity and ISO 9001/41001 compliance.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-4 mb-8">
            <div className="w-8 h-[2px] bg-brand-600"></div>
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Phase I: System Implementation</h2>
        </div>

        <GuideStep 
          number="01" 
          title="Environmental Keying" 
          description="Provisioning AI reasoning capabilities via Gemini 3 Pro."
          icon={<BeakerIcon className="w-5 h-5" />}
        >
          <ul className="text-xs text-gray-400 space-y-3 list-disc pl-5">
            <li>Inject your <code className="text-brand-400">API_KEY</code> into the secure environment variable block.</li>
            <li>Verify connectivity via the <strong>Audit Lab</strong> interface.</li>
            <li>Ensure the model is set to <span className="text-white">gemini-3-pro-preview</span> for complex compliance mapping.</li>
          </ul>
        </GuideStep>

        <GuideStep 
          number="02" 
          title="Schema Alignment" 
          description="Formatting raw data for the Heuristic Parser."
          icon={<DatabaseIcon className="w-5 h-5" />}
        >
          <div className="bg-gray-950 p-4 rounded-xl font-mono text-[10px] text-brand-300 border border-gray-800">
            Ticket IDs Sequence, Created on, Assigned to, Subject, Stage, Priority, ISO Clause
          </div>
          <p className="text-xs text-gray-500 italic mt-2">
            *Ensure these 7 mandatory headers exist in your CSV export to trigger the Neural Repair engine.
          </p>
        </GuideStep>

        <div className="flex items-center space-x-4 mb-8 pt-8">
            <div className="w-8 h-[2px] bg-red-600"></div>
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Phase II: Daily Audit Protocol</h2>
        </div>

        <GuideStep 
          number="03" 
          title="Neural Data Integrity Check" 
          description="Verification of imported operational records."
          icon={<ShieldCheckIcon className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="flex gap-4">
                <div className="flex-1 bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <span className="text-[10px] font-black text-white uppercase block mb-2">Checklist</span>
                    <ul className="text-[11px] text-gray-500 space-y-2">
                        <li className="flex items-center gap-2"><input type="checkbox" className="rounded bg-gray-800 border-gray-700" /> Confirm no "Empty ID" flags in Staging</li>
                        <li className="flex items-center gap-2"><input type="checkbox" className="rounded bg-gray-800 border-gray-700" /> Run "Context-Aware Repair" on malformed rows</li>
                        <li className="flex items-center gap-2"><input type="checkbox" className="rounded bg-gray-800 border-gray-700" /> Validate date format alignment (DD/MM/YYYY)</li>
                    </ul>
                </div>
            </div>
          </div>
        </GuideStep>

        <GuideStep 
          number="04" 
          title="Compliance Mapping Verification" 
          description="Validating ISO clause assignments for the audit trail."
          icon={<DocumentCheckIcon className="w-5 h-5" />}
        >
          <p className="text-xs text-gray-400 leading-relaxed">
            Technical leads must review the <span className="text-white">ISO Clause</span> column in the Database Workspace. 
            Activities related to "Infrastructure" must be mapped to <span className="text-brand-400">ISO 9001 (7.1.3)</span>. 
            Activities related to "FM Operations" require <span className="text-brand-400">ISO 41001 (8.1)</span>.
          </p>
          <button className="mt-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors">
            Review Regulatory Library →
          </button>
        </GuideStep>

        <GuideStep 
          number="05" 
          title="Executive PDF Archival" 
          description="Finalizing the daily operational snapshot."
          icon={<ChartBarIcon className="w-5 h-5" />}
        >
          <ul className="text-xs text-gray-400 space-y-3">
            <li className="flex gap-3">
                <span className="font-black text-brand-500">A.</span> 
                Navigate to <strong>Service Reports</strong>.
            </li>
            <li className="flex gap-3">
                <span className="font-black text-brand-500">B.</span> 
                Verify "Labor Segments" and "Severity Distribution" charts are populated.
            </li>
            <li className="flex gap-3">
                <span className="font-black text-brand-500">C.</span> 
                Execute <strong>Print/Export</strong> using A4 Portrait settings with "Background Graphics" enabled.
            </li>
          </ul>
        </GuideStep>
      </div>

      <div className="mt-16 bg-brand-900/10 border border-brand-500/20 rounded-3xl p-8 text-center">
        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Need Technical Assistance?</h4>
        <p className="text-xs text-gray-500 mb-6">Consult the Advance Setup SOP for specific neural engine tuning and deep-tier troubleshooting.</p>
        <div className="flex justify-center gap-4">
            <div className="px-4 py-2 bg-gray-900 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-800">v2.5 Release Notes</div>
            <div className="px-4 py-2 bg-gray-900 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-800">Support API Docs</div>
        </div>
      </div>
    </div>
  );
};

export default OperationsGuide;
