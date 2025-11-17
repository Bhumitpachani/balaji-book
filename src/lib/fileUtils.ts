import { FileText, FileSpreadsheet, Image, File } from 'lucide-react';

export interface FileInfo {
  url: string;
  name: string;
  type: 'image' | 'pdf' | 'excel' | 'other';
}

export const getFileType = (url: string): 'image' | 'pdf' | 'excel' | 'other' => {
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
    return 'image';
  }
  if (extension === 'pdf') {
    return 'pdf';
  }
  if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
    return 'excel';
  }
  return 'other';
};

export const getFileIcon = (type: 'image' | 'pdf' | 'excel' | 'other') => {
  switch (type) {
    case 'image':
      return Image;
    case 'pdf':
      return FileText;
    case 'excel':
      return FileSpreadsheet;
    default:
      return File;
  }
};

export const getFileName = (url: string): string => {
  try {
    // Extract filename from Firebase Storage URL
    const decodedUrl = decodeURIComponent(url);
    const parts = decodedUrl.split('/');
    const fileNameWithParams = parts[parts.length - 1];
    const fileName = fileNameWithParams.split('?')[0];
    
    // Remove timestamp prefix if present (e.g., "1234567890_document.pdf" -> "document.pdf")
    const cleanName = fileName.replace(/^\d+_/, '');
    
    return cleanName || 'Download File';
  } catch {
    return 'Download File';
  }
};
