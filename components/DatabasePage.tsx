
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UploadIcon, DocumentCheckIcon, ExclamationTriangleIcon } from './icons';
import { parseCSV, jsonToCSV } from '../hooks/useTicketData';

interface DatabasePageProps {
  currentCSV: string;
  onSave: (csv: string) => void;
  onReset: () => void;
}

interface ValidationError {
  line: number;
  message: string;
}

const REQUIRED_HEADERS_CAMEL = [
  'ticketIDsSequence',
  'createdOn',
  'assignedTo',
  'subject',
  'stage',
  'priority'
];

const DISPLAY_MAP: Record<string, string> = {
  'ticketIDsSequence': "'Ticket IDs Sequence'",
  'createdOn': "'Created on'",
  'assignedTo': "'Assigned to'",
  'subject': "'Subject'",
  'stage': "'Stage'",
  'priority': "'Priority'",
  'isoClause': "'ISO Clause'"
};

const highlightJSON = (jsonStr: string, errorLines: number[]) => {
    if (!jsonStr) return '';
    const lines = jsonStr.split('\n');
    
    return lines.map((line, idx) => {
        const isError = errorLines.includes(idx + 1);
        // Escape HTML
        let escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Syntax highlighting
        escaped = escaped.replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[\[\]{},:])/g,
            (match) => {
                let cls = 'text-purple-400'; // Numbers
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'text-blue-400 font-semibold'; // Keys
                    } else {
                        cls = 'text-green-400'; // Strings
                    }
                } else if (/true|false|null/.test(match)) {
                    cls = 'text-yellow-400 font-semibold'; // Booleans/Null
                } else if (/[\[\]{},:]/.test(match)) {
                    cls = 'text-gray-500'; // Punctuation
                }
                return `<span class="${cls}">${match}</span>`;
            }
        );

        return `<div class="${isError ? 'bg-red-500/20 border-l-2 border-red-500 -ml-0.5' : ''}">${escaped || ' '}</div>`;
    }).join('');
};

const highlightCSV = (csvStr: string, errorLines: number[]) => {
    if (!csvStr) return '';
    const lines = csvStr.split('\n');
    
    return lines.map((line, idx) => {
        const isError = errorLines.includes(idx + 1);
        const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<div class="${isError ? 'bg-red-500/20 border-l-2 border-red-500 -ml-0.5' : ''}">${escaped || ' '}</div>`;
    }).join('');
};

const DatabasePage: React.FC<DatabasePageProps> = ({ currentCSV, onSave, onReset }) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [text, setText] = useState(currentCSV);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const messageTimerRef = useRef<number | null>(null);

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
        preRef.current.scrollTop = textareaRef.current.scrollTop;
        preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const errorLineIndices = useMemo(() => validationErrors.map(e => e.line), [validationErrors]);

  const highlightedCode = useMemo(() => {
    if (format === 'json') return highlightJSON(text, errorLineIndices);
    return highlightCSV(text, errorLineIndices);
  }, [text, format, errorLineIndices]);

  useEffect(() => {
    if (format === 'csv') {
      setText(currentCSV);
    } else {
        try {
            const parsed = parseCSV(currentCSV);
            setText(JSON.stringify(parsed, null, 2));
        } catch(e) {
            setText("[]");
        }
    }
  }, [currentCSV]);

  // Clean up timer on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    };
  }, []);

  const validateContent = (content: string, currentFormat: 'csv' | 'json'): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    try {
        if (currentFormat === 'json') {
            const json = JSON.parse(content);
            if (!Array.isArray(json)) {
                errors.push({ line: 1, message: "JSON must be an array of objects." });
                return errors;
            }
            
            json.forEach((item, index) => {
                const keys = Object.keys(item);
                const missing = REQUIRED_HEADERS_CAMEL.filter(k => !keys.includes(k));
                if (missing.length > 0) {
                    const missingDisplay = missing.map(m => DISPLAY_MAP[m] || m).join(', ');
                    const lineStr = JSON.stringify(item);
                    const lineNum = content.split('\n').findIndex(l => l.includes(lineStr)) + 1;
                    errors.push({ 
                        line: lineNum > 0 ? lineNum : index + 2, 
                        message: `Item #${index + 1} is missing: ${missingDisplay}` 
                    });
                }
            });
        } else {
            const lines = content.split('\n').filter(l => l.trim());
            if (lines.length === 0) return [];
            
            const headerLine = lines[0].trim();
            const toCamelCase = (s: string) => s.replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '').replace(/^./, (match) => match.toLowerCase());
            const headers = headerLine.split(',').map(h => toCamelCase(h.trim().replace(/^\uFEFF/, '')));
            
            const missingHeaders = REQUIRED_HEADERS_CAMEL.filter(k => !headers.includes(k));
            if (missingHeaders.length > 0) {
                const missingDisplay = missingHeaders.map(m => DISPLAY_MAP[m] || m).join(', ');
                errors.push({ line: 1, message: `Header row is missing required columns: ${missingDisplay}` });
            }

            lines.slice(1).forEach((line, index) => {
                const values = line.split(',');
                if (values.length !== headers.length) {
                    errors.push({ line: index + 2, message: `Row ${index + 2} has ${values.length} columns, but header has ${headers.length}.` });
                }
            });
        }
    } catch (e: any) {
        errors.push({ line: 1, message: `Syntax Error: ${e.message}` });
    }
    
    return errors;
  };

  const handleFormatChange = (newFormat: 'csv' | 'json') => {
    if (format === newFormat) return;
    setMessage(null);
    setValidationErrors([]);

    try {
        if (newFormat === 'json') {
            const parsed = parseCSV(text);
            if (parsed.length === 0 && text.trim().length > 0) {
                 throw new Error("Could not parse CSV to convert to JSON.");
            }
            setText(JSON.stringify(parsed, null, 2));
        } else {
            const json = JSON.parse(text);
            if (!Array.isArray(json)) throw new Error("JSON must be an array of objects.");
            const csv = jsonToCSV(json);
            setText(csv);
        }
        setFormat(newFormat);
    } catch (e: any) {
        setMessage({ type: 'error', text: `Conversion failed: ${e.message}` });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setMessage(null);
    setValidationErrors([]);

    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isJson = fileName.endsWith('.json');
    const isCsv = fileName.endsWith('.csv');

    if (!isJson && !isCsv) {
        setMessage({ type: 'error', text: 'Invalid file type. Please upload a .csv or .json file.' });
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      let content = event.target?.result as string;
      
      try {
          const errors = validateContent(content, isJson ? 'json' : 'csv');
          if (errors.length > 0) {
              setValidationErrors(errors);
              setMessage({ type: 'error', text: `Found ${errors.length} validation issues in the uploaded file.` });
          }

          if (isJson && format === 'csv') {
              const parsed = JSON.parse(content);
              content = jsonToCSV(parsed);
          } else if (isCsv && format === 'json') {
              const parsed = parseCSV(content);
              content = JSON.stringify(parsed, null, 2);
          }

          setText(content);
          if (errors.length === 0) {
            setMessage({ type: 'success', text: `File loaded. Review and click Save.` });
          }

      } catch (e: any) {
          setMessage({ type: 'error', text: `Failed to load file: ${e.message}` });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    // Clear any existing timers
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    setMessage(null);
    setValidationErrors([]);
    
    if (!text.trim()) {
        setMessage({ type: 'error', text: 'Content cannot be empty.' });
        return;
    }
    
    const errors = validateContent(text, format);
    if (errors.length > 0) {
        setValidationErrors(errors);
        setMessage({ type: 'error', text: `Cannot save. Found ${errors.length} validation errors.` });
        return;
    }

    setIsSaving(true);
    try {
        let csvToSave = text;
        if (format === 'json') {
            const json = JSON.parse(text);
            csvToSave = jsonToCSV(json);
        }

        // Simulate processing delay for visual commitment
        await new Promise(resolve => setTimeout(resolve, 800));
        
        onSave(csvToSave);
        
        // Show success message
        setMessage({ type: 'success', text: 'Database updated successfully!' });
        
        // Set timer to clear message after exactly 3 seconds
        messageTimerRef.current = window.setTimeout(() => {
          setMessage(null);
          messageTimerRef.current = null;
        }, 3000);
        
    } catch (e: any) {
        setMessage({ type: 'error', text: `Save failed: ${e.message}` });
    } finally {
        setIsSaving(false);
    }
  };

  const handleReset = () => {
      if(window.confirm('Are you sure you want to reset to the default dataset? This will discard your changes.')) {
          onReset();
          setFormat('csv');
          setValidationErrors([]);
          
          if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
          setMessage({ type: 'success', text: 'Reset to default data.' });
          
          messageTimerRef.current = window.setTimeout(() => {
              setMessage(null);
              messageTimerRef.current = null;
          }, 3000);
      }
  };

  const editorClass = "font-mono text-xs leading-5 p-4 m-0 w-full h-full whitespace-pre overflow-auto";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 min-h-[60px]">
            <div>
                <h2 className="text-2xl font-bold text-white">Database Management</h2>
                <p className="text-gray-400 text-sm mt-1">Manage ticket data via CSV or JSON.</p>
            </div>
            <div className="flex items-center">
                {message && (
                    <div className={`animate-in fade-in slide-in-from-top-2 px-4 py-2 rounded-md text-sm font-medium shadow-lg transition-all ${
                      message.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-700' : 'bg-red-900/50 text-red-200 border border-red-700'
                    }`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>

        <div className="grid gap-6">
            <div className="p-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 transition-colors bg-gray-700/30">
                <div className="flex flex-col items-center justify-center space-y-3">
                    <UploadIcon className="w-10 h-10 text-gray-400" />
                    <div className="text-center">
                        <p className="text-sm text-gray-300"><span className="font-semibold">Click to browse</span></p>
                        <p className="text-xs text-gray-500">Supported formats: .csv, .json</p>
                    </div>
                     <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm shadow-sm">
                        Browse Files
                        <input ref={fileInputRef} type='file' className="hidden" accept=".csv, .json" onChange={handleFileChange} />
                     </label>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-1">
                    <button onClick={() => handleFormatChange('csv')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${format === 'csv' ? 'bg-gray-900 text-white shadow' : 'text-gray-300 hover:text-white'}`}>CSV</button>
                    <button onClick={() => handleFormatChange('json')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${format === 'json' ? 'bg-gray-900 text-white shadow' : 'text-gray-300 hover:text-white'}`}>JSON</button>
                </div>
                <span className="text-xs text-gray-500">{text.split('\n').length} lines</span>
            </div>

            <div className="relative w-full h-96 rounded-lg border border-gray-600 bg-gray-900 overflow-hidden">
                <pre
                    ref={preRef}
                    className={`absolute inset-0 pointer-events-none text-gray-300 ${editorClass}`}
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: highlightedCode + '<div style="height: 100px;"></div>' }} 
                />
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (validationErrors.length > 0) setValidationErrors([]);
                    }}
                    onScroll={handleScroll}
                    className={`absolute inset-0 bg-transparent border-0 outline-none resize-none focus:ring-0 ${editorClass} text-transparent caret-white selection:bg-blue-500/30`}
                    spellCheck={false}
                    placeholder={`Paste ${format.toUpperCase()} data here...`}
                />
            </div>

            {validationErrors.length > 0 && (
                <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
                    <div className="flex items-center text-red-400 text-sm font-bold mb-1">
                        <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                        Validation Errors
                    </div>
                    {validationErrors.map((err, i) => (
                        <div key={i} className="text-xs text-red-300 flex">
                            <span className="font-mono bg-red-900/40 px-1.5 rounded mr-2 h-fit">Line {err.line}</span>
                            <span>{err.message}</span>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
                <button onClick={handleReset} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-red-300 hover:text-white hover:bg-red-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Reset Defaults</button>
                <button onClick={handleSave} disabled={isSaving} className={`flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
                    {isSaving ? 'Saving...' : <><DocumentCheckIcon className="w-5 h-5 mr-2" />Save Changes</>}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DatabasePage;
