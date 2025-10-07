import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, File, X, CheckCircle, AlertCircle, Pencil, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileFileInput from './MobileFileInput';
import { DocumentThumbnail } from '@/components/DocumentThumbnail';

interface UploadedFile {
  id?: string;
  name: string;
  display_name?: string;
  size: number;
  url: string;
  type: string;
  category: string;
}

interface DocumentCategory {
  id: string;
  title: string;
  buttonText: string;
  required: boolean;
  examples: string[];
  acceptedTypes: string;
}

interface DocumentUploadProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  onCompletionChange?: (isComplete: boolean) => void;
  caseId?: string;
  existingDocuments?: Array<{
    id: string;
    file_name: string;
    display_name?: string;
    file_size: number;
    file_url: string;
    file_type: string;
    document_category?: string;
  }>;
  onRefreshRequested?: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
  onFilesUploaded, 
  onCompletionChange, 
  caseId, 
  existingDocuments = [],
  onRefreshRequested
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const isMobile = useIsMobile();

  // Show loading state or case not ready message
  if (!caseId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Document Upload
          </CardTitle>
          <CardDescription>
            Upload your legal documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium">Case Not Ready</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your case is still being loaded. Please wait a moment.
              </p>
            </div>
            {onRefreshRequested && (
              <Button variant="outline" onClick={onRefreshRequested}>
                Refresh Cases
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const categories: DocumentCategory[] = [
    {
      id: 'identity',
      title: 'Identity Documents',
      buttonText: 'Upload Passport',
      required: true,
      examples: ['Passport', 'National ID', 'Driver\'s License'],
      acceptedTypes: '.pdf,.jpg,.jpeg,.png'
    },
    {
      id: 'case',
      title: 'Case Related Documents',
      buttonText: 'Upload',
      required: true,
      examples: ['Contracts', 'Correspondence', 'Emails', 'Written agreements'],
      acceptedTypes: '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png'
    },
    {
      id: 'financial',
      title: 'Financial Documents',
      buttonText: 'Upload',
      required: false,
      examples: ['Bank statements', 'Invoices', 'Receipts', 'Tax documents'],
      acceptedTypes: '.pdf,.doc,.docx,.jpg,.jpeg,.png'
    },
    {
      id: 'legal',
      title: 'Legal Documents',
      buttonText: 'Upload',
      required: false,
      examples: ['Court orders', 'Legal notices', 'Previous judgments', 'Legal correspondence'],
      acceptedTypes: '.pdf,.doc,.docx,.jpg,.jpeg,.png'
    }
  ];

  const validateFile = (file: File): string | null => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return 'File size must be less than 20MB';
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOC, DOCX, TXT, JPG, or PNG files.';
    }

    return null;
  };

  const uploadFile = async (file: File, category: string): Promise<UploadedFile | null> => {
    const uploadId = `${category}-${Date.now()}`;
    
    try {
      console.log('DocumentUpload: Starting upload for file:', file.name, 'category:', category, 'caseId:', caseId);
      setIsUploading(prev => ({ ...prev, [uploadId]: true }));
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));

      const validation = validateFile(file);
      if (validation) {
        console.error('DocumentUpload: File validation failed:', validation);
        toast({
          title: "Upload Error",
          description: validation,
          variant: "destructive",
        });
        return null;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('DocumentUpload: Current user:', user?.id);
      if (!user) {
        console.error('DocumentUpload: No authenticated user found');
        toast({
          title: "Authentication Required",
          description: "Please log in to upload files.",
          variant: "destructive",
        });
        return null;
      }

      // Create file path
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${user.id}/${category}/${fileName}`;
      console.log('DocumentUpload: Upload path:', filePath);

      // Upload to Supabase Storage
      console.log('DocumentUpload: Attempting upload to case-documents bucket');
      const { data, error } = await supabase.storage
        .from('case-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('DocumentUpload: Storage upload error:', error);
        toast({
          title: "Upload Failed",
          description: `Storage error: ${error.message}`,
          variant: "destructive",
        });
        return null;
      }

      console.log('DocumentUpload: Upload successful, data:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('case-documents')
        .getPublicUrl(filePath);

      console.log('DocumentUpload: Generated public URL:', publicUrl);

      setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));

      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        url: publicUrl,
        type: file.type,
        category
      };

      // Add to documents table if caseId is available
      if (caseId) {
        console.log('DocumentUpload: Saving to database with caseId:', caseId);
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            case_id: caseId,
            file_name: file.name,
            display_name: file.name.replace(/^\d+_/, ''), // Remove timestamp prefix for cleaner display
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            document_category: category,
            uploaded_by: user.id
          });

        if (dbError) {
          console.error('DocumentUpload: Database save error:', dbError);
          toast({
            title: "Save Failed",
            description: `Database error: ${dbError.message}`,
            variant: "destructive",
          });
        } else {
          console.log('DocumentUpload: Successfully saved to database');
        }
      }

      toast({
        title: "Upload Successful",
        description: `${file.name} has been uploaded successfully.`,
      });

      return uploadedFile;
    } catch (error) {
      console.error('DocumentUpload: Unexpected upload error:', error);
      toast({
        title: "Upload Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(prev => ({ ...prev, [uploadId]: false }));
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });
      }, 2000);
    }
  };

  const handleFileUpload = async (files: FileList | null, category: string) => {
    if (!caseId) {
      toast({
        title: "Case not ready",
        description: "Your case is still loading. Please wait a moment and try refreshing if the issue persists.",
        variant: "destructive",
        action: onRefreshRequested ? (
          <Button variant="outline" size="sm" onClick={onRefreshRequested}>
            Refresh
          </Button>
        ) : undefined,
      });
      return;
    }

    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const uploadPromises = fileArray.map(file => uploadFile(file, category));
    const results = await Promise.all(uploadPromises);
    
    const successfulUploads = results.filter((result): result is UploadedFile => result !== null);
    
    if (successfulUploads.length > 0) {
      setUploadedFiles(prev => [...prev, ...successfulUploads]);
      onFilesUploaded?.(successfulUploads);
    }
  };

  const removeFile = (fileToRemove: UploadedFile) => {
    setUploadedFiles(prev => prev.filter(file => file.url !== fileToRemove.url));
  };

  const handleRename = async (file: UploadedFile, newName: string) => {
    if (!newName.trim() || !file.id) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ display_name: newName.trim() })
        .eq('id', file.id);

      if (error) throw error;

      // Update local state
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === file.id 
            ? { ...f, display_name: newName.trim() }
            : f
        )
      );

      toast({
        title: "Document Renamed",
        description: "The document name has been updated successfully"
      });

      setEditingId(null);
      setEditingName('');
    } catch (error) {
      console.error('Error renaming document:', error);
      toast({
        title: "Rename Failed",
        description: "Failed to rename document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const startEditing = (file: UploadedFile) => {
    setEditingId(file.id || null);
    setEditingName(file.display_name || file.name.replace(/^\d+_/, ''));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const getDisplayName = (file: UploadedFile) => {
    if (file.display_name) return file.display_name;
    // Remove timestamp prefix from filename
    return file.name.replace(/^\d+_/, '');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryFiles = (categoryId: string) => {
    return uploadedFiles.filter(file => file.category === categoryId);
  };

  // Initialize with existing documents
  useEffect(() => {
    if (existingDocuments.length > 0) {
      const formattedExisting = existingDocuments.map(doc => ({
        id: doc.id,
        name: doc.file_name,
        display_name: doc.display_name,
        size: doc.file_size,
        url: doc.file_url,
        type: doc.file_type,
        category: doc.document_category || 'case'
      }));
      setUploadedFiles(formattedExisting);
    }
  }, [existingDocuments]);

  // Check completion status and notify parent
  useEffect(() => {
    const requiredCategories = categories.filter(cat => cat.required);
    const completedCategories = requiredCategories.filter(cat => getCategoryFiles(cat.id).length > 0);
    const isComplete = requiredCategories.length === completedCategories.length;
    
    onCompletionChange?.(isComplete);
  }, [uploadedFiles, onCompletionChange]);

  return (
    <div className="space-y-6">
      {/* Document Categories */}
      <div className="grid md:grid-cols-2 gap-4">
        {categories.map((category) => {
          const categoryFiles = getCategoryFiles(category.id);
          const hasFiles = categoryFiles.length > 0;
          
          return (
            <Card key={category.id} className={`p-4 ${hasFiles && category.required ? 'border-green-500 bg-green-50/50' : category.required ? 'border-orange-400 bg-orange-50/20' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{category.title}</h4>
                  {hasFiles && category.required && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={hasFiles && category.required ? "default" : category.required ? "destructive" : "secondary"}>
                    {category.required 
                      ? (hasFiles ? "Completed" : "Required") 
                      : "Optional"
                    }
                  </Badge>
                  {hasFiles && (
                    <Badge variant="outline" className="text-xs">
                      {categoryFiles.length} file{categoryFiles.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Examples */}
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Examples:</p>
                  <p>{category.examples.join(', ')}</p>
                </div>

                {/* Upload Button */}
                <div>
                  {isMobile ? (
                    <MobileFileInput
                      onFileSelect={(files) => handleFileUpload(files, category.id)}
                      accept={category.acceptedTypes}
                      multiple={true}
                      disabled={!caseId}
                      hasFiles={hasFiles}
                      buttonText={category.buttonText}
                    />
                  ) : (
                    <>
                      <input
                        type="file"
                        id={`upload-${category.id}`}
                        className="hidden"
                        multiple
                        accept={category.acceptedTypes}
                        onChange={(e) => handleFileUpload(e.target.files, category.id)}
                        disabled={!caseId}
                      />
                      <label htmlFor={`upload-${category.id}`}>
                        <Button
                          type="button"
                          variant={hasFiles ? "secondary" : "outline"}
                          className="w-full"
                          disabled={!caseId}
                          asChild
                        >
                          <span className="cursor-pointer flex items-center justify-center">
                            {hasFiles ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {category.buttonText} More
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                {category.buttonText}
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                    </>
                  )}
                </div>

                {/* Uploaded Files */}
                {categoryFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded gap-2 overflow-hidden">
                    <div className="flex items-center space-x-2 flex-1 min-w-0 overflow-hidden">
                      <DocumentThumbnail
                        fileUrl={file.url || ''}
                        fileName={file.name}
                        fileType={file.type}
                        size="small"
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        {editingId === file.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRename(file, editingName);
                                } else if (e.key === 'Escape') {
                                  cancelEditing();
                                }
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRename(file, editingName)}
                              className="h-7 w-7 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full overflow-hidden">
                            <p className="text-sm font-medium truncate">{getDisplayName(file)}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {editingId !== file.id && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {file.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(file)}
                            className="h-7 w-7 p-0"
                            title="Rename document"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file)}
                          className="h-7 w-7 p-0"
                          title="Remove document"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Upload Progress */}
      {Object.entries(uploadProgress).map(([uploadId, progress]) => (
        <div key={uploadId} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      ))}

      {/* Upload Summary & Requirements Status */}
      <Card className="p-4 bg-muted/50">
        <div className="space-y-3">
          {uploadedFiles.length > 0 && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">
                {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded successfully
              </span>
            </div>
          )}
          
          {/* Requirements Checklist */}
          <div>
            <h4 className="font-medium mb-2">Document Requirements:</h4>
            {categories.filter(cat => cat.required).map((category) => {
              const categoryFiles = getCategoryFiles(category.id);
              const isCompleted = categoryFiles.length > 0;
              
              return (
                <div key={category.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2">
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-orange-400" />
                    )}
                    <span className={`text-sm ${isCompleted ? 'text-green-700' : 'text-orange-700'}`}>
                      {category.title}
                    </span>
                  </div>
                  <Badge variant={isCompleted ? "default" : "destructive"} className="text-xs">
                    {isCompleted ? `${categoryFiles.length} uploaded` : "Missing"}
                  </Badge>
                </div>
              );
            })}
            
            {/* Overall Status */}
            {(() => {
              const requiredCategories = categories.filter(cat => cat.required);
              const completedCategories = requiredCategories.filter(cat => getCategoryFiles(cat.id).length > 0);
              const allRequired = requiredCategories.length === completedCategories.length;
              
              return (
                <div className="flex items-center space-x-2 mt-3 pt-3 border-t">
                  <div className="flex items-center space-x-2">
                    {allRequired ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {allRequired 
                        ? "All required documents uploaded!" 
                        : `${requiredCategories.length - completedCategories.length} required document${requiredCategories.length - completedCategories.length !== 1 ? 's' : ''} missing`
                      }
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DocumentUpload;