
import React, { useState, useEffect, useRef } from 'react';
import { UploadIcon, DocumentCheckIcon } from './icons';

interface DatabasePageProps {
  currentCSV: string;
  onSave: (csv: string) => void;
  onReset: () => void;
}

const REQUIRED_HEADERS = [
  'Ticket IDs Sequence',
  'Created on',
  'Assigned to',
  'Subject',
  'Stage',
  'Priority'
];

const DatabasePage: React.FC<DatabasePageProps> = ({ currentCSV, onSave, onReset }) => {
  const [text, setText] = useState(currentCSV);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(currentCSV);
  }, [currentCSV]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setMessage(null);

    if (!file) return;

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
        setMessage({ type: 'error', text: 'Invalid file type. Please upload a .csv file.' });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      // Validate headers
      const lines = content.trim().split('\n');
      if (lines.length === 0) {
        setMessage({ type: 'error', text: 'The file appears to be empty.' });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const headerLine = lines[0].replace(/\r$/, '');
      const uploadedHeaders = headerLine.replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      const missingHeaders = REQUIRED_HEADERS.filter(req => !uploadedHeaders.includes(req));

      if (missingHeaders.length > 0) {
        setMessage({ 
            type: 'error', 
            text: `Invalid CSV format. Missing required columns: ${missingHeaders.join(', ')}` 
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setText(content);
      setMessage({ type: 'success', text: 'File loaded. Review and click Save.' });
    };
    
    reader.onerror = () => {
        setMessage({ type: 'error', text: 'Failed to read file.' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
    // Reset input value to allow selecting the same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!text.trim()) {
        setMessage({ type: 'error', text: 'CSV content cannot be empty.' });
        return;
    }
    
    setIsSaving(true);
    // Artificial delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 800));

    onSave(text);
    
    setIsSaving(false);
    setMessage({ type: 'success', text: 'Database updated successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleReset = () => {
      if(window.confirm('Are you sure you want to reset to the default dataset? This will discard your changes.')) {
          onReset();
          setMessage({ type: 'success', text: 'Reset to default data.' });
      }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Database Management</h2>
                <p className="text-gray-400 text-sm mt-1">Upload new ticket data or edit the raw CSV directly.</p>
            </div>
            {message && (
                <div className={`px-4 py-2 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-700' : 'bg-red-900/50 text-red-200 border border-red-700'}`}>
                    {message.text}
                </div>
            )}
        </div>

        <div className="grid gap-6">
            {/* Upload Area */}
            <div className="p-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 transition-colors bg-gray-700/30">
                <div className="flex flex-col items-center justify-center space-y-3">
                    <UploadIcon className="w-10 h-10 text-gray-400" />
                    <div className="text-center">
                        <p className="text-sm text-gray-300">
                            <span className="font-semibold">Click to browse</span>
                        </p>
                        <p className="text-xs text-gray-500">CSV files only</p>
                    </div>
                     <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm shadow-sm">
                        Browse Files
                        <input 
                            ref={fileInputRef}
                            type='file' 
                            className="hidden" 
                            accept=".csv" 
                            onChange={handleFileChange} 
                        />
                     </label>
                </div>
            </div>

            {/* Editor */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex justify-between">
                    <span>Raw CSV Data</span>
                    <span className="text-xs text-gray-500">{text.split('\n').length} rows</span>
                </label>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full h-96 bg-gray-900 text-gray-300 font-mono text-xs p-4 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                    spellCheck={false}
                    placeholder="Paste CSV data here..."
                />
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
                <button 
                    onClick={handleReset}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-red-300 hover:text-white hover:bg-red-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Reset to Default
                </button>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {isSaving ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                        </>
                    ) : (
                        <>
                            <DocumentCheckIcon className="w-5 h-5 mr-2" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DatabasePage;
