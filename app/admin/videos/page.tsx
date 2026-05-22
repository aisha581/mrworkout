"use client";

import { useState } from 'react';
import { EXERCISE_LIBRARY } from '@/data/libraryData';
import { supabase } from '@/lib/supabase';
import { Upload, CheckCircle, Video, AlertCircle } from 'lucide-react';

export default function VideoUploadDashboard() {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setUploadStatus({ type: null, message: '' });

            // Create local preview
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedExerciseId) {
            setUploadStatus({ type: 'error', message: 'Please select both a file and an exercise.' });
            return;
        }

        setIsUploading(true);
        setUploadStatus({ type: null, message: '' });

        try {
            // Upload to Supabase 'exercise-library' bucket
            // Naming convention: {exercise_id}.mp4
            const fileName = `${selectedExerciseId}.mp4`;

            // Upload via VIP backend route to bypass RLS
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileName', fileName);

            const response = await fetch('/api/admin/videos/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to upload video via VIP route.');
            }

            setUploadStatus({ type: 'success', message: `Successfully mapped replacing ${fileName}!` });
            
            // clear form
            setFile(null);
            setPreviewUrl(null);
            setSelectedExerciseId('');

        } catch (err: any) {
            console.error('Upload error:', err);
            setUploadStatus({ type: 'error', message: err.message || 'Failed to upload video.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] p-8 text-white flex justify-center items-center font-sans">
            <div className="w-full max-w-2xl bg-[#121212] p-8 rounded-3xl border border-[#00FFFF]/20 shadow-[0_0_40px_rgba(0,255,255,0.05)]">
                <div className="mb-8 border-b border-white/10 pb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-widest text-white">
                            Video Ingestion
                        </h1>
                        <p className="text-sm text-[#00FFFF]/60 tracking-wider mt-1 font-mono uppercase">
                            Supabase Bucket Map: 'exercise-library'
                        </p>
                    </div>
                </div>

                {/* Status Message */}
                {uploadStatus.type === 'success' && (
                    <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3 text-green-400">
                        <CheckCircle size={20} />
                        <span className="font-medium text-sm">{uploadStatus.message}</span>
                    </div>
                )}
                {uploadStatus.type === 'error' && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-500">
                        <AlertCircle size={20} />
                        <span className="font-medium text-sm">{uploadStatus.message}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Left Col: Upload Zone */}
                    <div className="flex flex-col gap-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/50">1. Select Unnamed MP4</label>
                        
                        <div className="relative aspect-square md:aspect-[4/5] rounded-2xl border-2 border-dashed border-[#00FFFF]/30 hover:border-[#00FFFF] bg-black/40 flex flex-col items-center justify-center transition cursor-pointer overflow-hidden group">
                            
                            {previewUrl ? (
                                <video src={previewUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                            ) : (
                                <div className="text-center p-6 flex flex-col items-center">
                                    <Upload size={32} className="text-[#00FFFF]/50 group-hover:text-[#00FFFF] mb-3 transition" />
                                    <p className="text-sm font-medium text-white/70">Click to Browse</p>
                                    <p className="text-xs text-white/40 mt-2">6-second loop recommended</p>
                                </div>
                            )}

                            <input 
                                type="file" 
                                accept="video/mp4" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileSelect}
                            />
                        </div>
                    </div>

                    {/* Right Col: Mapping Form */}
                    <div className="flex flex-col gap-6 pt-2">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-white/50">2. Assign to Library</label>
                            <select 
                                value={selectedExerciseId}
                                onChange={(e) => setSelectedExerciseId(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#00FFFF] hover:border-white/30 transition appearance-none"
                                style={{ WebkitAppearance: 'none' }}
                            >
                                <option value="" disabled>Select Target Exercise...</option>
                                {EXERCISE_LIBRARY.map(ex => (
                                    <option key={ex.id} value={ex.id}>
                                        {ex.name} ({ex.category})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-auto">
                           <button 
                                onClick={handleUpload}
                                disabled={isUploading || !file || !selectedExerciseId}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#00FFFF] text-black font-black uppercase tracking-widest hover:bg-white hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                           >
                               {isUploading ? (
                                   <span className="animate-pulse">Syncing...</span>
                               ) : (
                                   <>
                                      <Video size={18} /> MAP & UPLOAD
                                   </>
                               )}
                           </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
