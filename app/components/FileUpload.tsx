import React, { useState, useRef } from 'react';
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import type { Id } from "../../convex/_generated/dataModel";
import { processFileForOCRClient, shouldProcessFileForOCRClient } from "../utils/ocr-client";

interface FileUploadProps {
  assignmentId?: Id<"assignments">;
  courseId?: Id<"courses">;
  onFileUploaded?: (fileId: Id<"files">) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'processing-ocr' | 'success' | 'error';
  error?: string;
}

export default function FileUpload({
  assignmentId,
  courseId,
  onFileUploaded,
  maxFiles = 5,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp', '.doc', '.docx', '.txt'],
  maxSize = 10 * 1024 * 1024 // 10MB default
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useUser();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const updateOCRText = useMutation(api.files.updateOCRText);
  const markOCRFailed = useMutation(api.files.markOCRFailed);

  const handleFiles = async (files: FileList) => {
    if (!user?.id) return;

    const fileArray = Array.from(files);

    // Validate file count
    if (uploadingFiles.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    const validFiles = fileArray.filter(file => {
      // Check file size
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`);
        return false;
      }

      // Check file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(fileExtension)) {
        alert(`File type "${fileExtension}" is not supported. Accepted types: ${acceptedTypes.join(', ')}`);
        return false;
      }

      return true;
    });

    // Create uploading file objects
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload each file
    for (const uploadingFile of newUploadingFiles) {
      try {
      // Generate authenticated upload URL
      const uploadUrl = await generateUploadUrl({
        clerkUserId: user.id
      });

        // Upload file to Convex storage
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": uploadingFile.file.type },
          body: uploadingFile.file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed: ${result.statusText}`);
        }

        const { storageId } = await result.json();

        // Update progress
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, progress: 90 }
              : f
          )
        );

        // Save file metadata
        const fileId = await saveFile({
          clerkUserId: user.id,
          assignmentId,
          courseId,
          fileName: uploadingFile.file.name,
          originalFileName: uploadingFile.file.name,
          fileSize: uploadingFile.file.size,
          mimeType: uploadingFile.file.type,
          storageId,
        });

        // Start OCR processing if supported and in browser environment
        if (typeof window !== 'undefined') {
          const shouldProcess = shouldProcessFileForOCRClient(uploadingFile.file.type);
          
          console.log('🔍 OCR check:', {
            fileName: uploadingFile.file.name,
            fileType: uploadingFile.file.type,
            fileSize: uploadingFile.file.size,
            shouldProcess
          });
          
          if (shouldProcess) {
            setUploadingFiles(prev => 
              prev.map(f => 
                f.id === uploadingFile.id 
                  ? { ...f, progress: 95, status: 'processing-ocr' as const } 
                  : f
              )
            );

            try {
              console.log('🚀 Starting OCR processing for:', uploadingFile.file.name);
              // Process OCR
              const ocrResult = await processFileForOCRClient(uploadingFile.file, uploadingFile.file.type);
              
              console.log('✅ OCR processing completed:', {
                textLength: ocrResult.text.length,
                confidence: ocrResult.confidence,
                preview: ocrResult.text.substring(0, 200)
              });

              if (ocrResult.text && ocrResult.text.trim().length > 0) {
                // Update file with OCR text
                await updateOCRText({
                  fileId,
                  ocrText: ocrResult.text,
                  confidence: ocrResult.confidence
                });
                console.log('💾 OCR text saved to database');
              } else {
                // Mark as processed but with no text
                await updateOCRText({
                  fileId,
                  ocrText: "",
                  confidence: 0
                });
                console.log('💾 OCR processed but no text found');
              }
            } catch (ocrError) {
              console.warn('OCR processing failed:', ocrError);
              // Mark OCR as failed but don't fail the upload
              await markOCRFailed({
                fileId,
                error: ocrError instanceof Error ? ocrError.message : 'OCR processing failed'
              });
            }
          }
        }

        // Mark as success
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === uploadingFile.id 
              ? { ...f, progress: 100, status: 'success' as const } 
              : f
          )
        );

        // Call callback
        if (onFileUploaded) {
          onFileUploaded(fileId);
        }

      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? {
                  ...f,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : 'Upload failed'
                }
              : f
          )
        );
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
        return (
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />

        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-medium text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300"
          >
            Click to upload
          </button>
          {' '}or drag and drop
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Images and PDFs up to {Math.round(maxSize / (1024 * 1024))}MB • Text recognition enabled
        </p>
        </div>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Uploading Files
          </h4>
          {uploadingFiles.map((uploadingFile) => (
            <div key={uploadingFile.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-shrink-0">
                {getFileIcon(uploadingFile.file.name)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {uploadingFile.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(uploadingFile.file.size)}
                </p>

                {(uploadingFile.status === 'uploading' || uploadingFile.status === 'processing-ocr') && (
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                      <div 
                        className="bg-purple-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                    {uploadingFile.status === 'processing-ocr' && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        {uploadingFile.file.type === 'application/pdf' 
                          ? 'Processing PDF pages for text recognition...' 
                          : 'Processing text recognition...'
                        }
                      </p>
                    )}
                  </div>
                )}

                {uploadingFile.status === 'error' && (
                  <p className="text-xs text-red-500 mt-1">
                    {uploadingFile.error}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                {uploadingFile.status === 'success' && (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}

                {uploadingFile.status === 'error' && (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}

                <button
                  onClick={() => removeUploadingFile(uploadingFile.id)}
                  className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
