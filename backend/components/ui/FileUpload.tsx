'use client';

import { useState, useRef } from 'react';
import { Button } from './Button';
import { Badge } from './Badge';

interface FileUploadProps {
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
}

interface FileWithStatus extends File {
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function FileUpload({
  onFilesSelected,
  accept = '.pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.gif,.webp',
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  disabled = false
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large (max ${formatFileSize(maxSize)})`
      };
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Unsupported file type'
      };
    }

    return { valid: true };
  };

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    if (files.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const filesWithStatus: FileWithStatus[] = fileArray.map(file => {
      const validation = validateFile(file);
      return {
        ...file,
        id: Math.random().toString(36).substring(7),
        status: validation.valid ? 'pending' : 'error',
        error: validation.error
      };
    });

    const validFiles = filesWithStatus.filter(f => f.status === 'error').length === 0
      ? filesWithStatus
      : filesWithStatus.filter(f => f.status !== 'error');

    setFiles(prev => [...prev, ...validFiles]);

    if (onFilesSelected && validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== id);
      if (onFilesSelected) {
        onFilesSelected(newFiles);
      }
      return newFiles;
    });
  };

  const getFileIcon = (type: string): string => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('text') || type.includes('markdown')) return '📃';
    if (type.includes('image')) return '🖼️';
    return '📎';
  };

  const getStatusBadge = (status: FileWithStatus['status'], error?: string) => {
    if (status === 'error') {
      return <Badge variant="red">{error || 'Error'}</Badge>;
    }
    if (status === 'uploading') {
      return <Badge variant="blue">Uploading...</Badge>;
    }
    if (status === 'success') {
      return <Badge variant="green">Ready</Badge>;
    }
    return <Badge variant="gold">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-[#2C5F7C] bg-[rgba(44,95,124,0.05)]'
            : 'border-[#E0D8CC] bg-white'
        } ${disabled ? 'bg-[#F5F2ED] text-[#6B6B6B] cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-3">
          <div className="text-4xl">📤</div>
          <div>
            <p className="text-[14px] font-medium text-[#1A1A1A]">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-[12px] text-[#6B6B6B] mt-1">
              or click to browse (PDF, DOCX, TXT, MD, PNG, JPG, GIF, WebP)
            </p>
          </div>
          <p className="text-[11px] text-[#6B6B6B]">
            Max {maxFiles} files · {formatFileSize(maxSize)} per file
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-[#6B6B6B]">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>

          {files.map(file => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-white border border-[#E0D8CC] rounded-lg"
            >
              <div className="text-2xl">{getFileIcon(file.type)}</div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1A1A1A] truncate">
                  {file.name}
                </p>
                <p className="text-[11px] text-[#6B6B6B]">
                  {formatFileSize(file.size)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(file.status, file.error)}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className="rounded border border-[#E0D8CC] bg-white px-2 py-1 text-[#1A1A1A] hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant="gold"
            size="md"
            onClick={() => {
              // Trigger upload logic here
              console.log('Uploading files:', files);
            }}
          >
            Upload Files
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              setFiles([]);
              if (onFilesSelected) {
                onFilesSelected([]);
              }
            }}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
