import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FileUploadModalProps {
  entityType: 'driver' | 'vehicle';
  entityId?: string;
  trigger?: React.ReactNode;
  onUploadComplete?: () => void;
}

const documentTypes = {
  driver: [
    { value: 'license', label: 'Driving License' },
    { value: 'aadhar', label: 'Aadhar Card' },
    { value: 'pan', label: 'PAN Card' },
    { value: 'photo', label: 'Profile Photo' }
  ],
  vehicle: [
    { value: 'registration', label: 'Registration Certificate' },
    { value: 'insurance', label: 'Insurance Policy' },
    { value: 'pollution', label: 'Pollution Certificate' },
    { value: 'permit', label: 'Commercial Permit' },
    { value: 'fitness', label: 'Fitness Certificate' }
  ]
};

export const FileUploadModal: React.FC<FileUploadModalProps> = ({ 
  entityType, 
  entityId, 
  trigger,
  onUploadComplete 
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    documentType: '',
    documentName: '',
    description: '',
    file: null as File | null
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPEG, and PNG files are allowed');
        return;
      }

      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!user || !formData.file || !formData.documentType || !formData.documentName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${user.id}/${entityType}/${entityId}/${formData.documentType}_${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, formData.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Save document record to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          [entityType === 'driver' ? 'driver_id' : 'vehicle_id']: entityId,
          document_type: formData.documentType,
          document_name: formData.documentName,
          file_url: publicUrl,
          file_size: formData.file.size,
          mime_type: formData.file.type,
          status: 'uploaded',
          review_notes: formData.description
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      setFormData({
        documentType: '',
        documentName: '',
        description: '',
        file: null
      });
      setIsOpen(false);
      onUploadComplete?.();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="documentType">Document Type *</Label>
            <Select
              value={formData.documentType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, documentType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes[entityType].map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="documentName">Document Name *</Label>
            <Input
              id="documentName"
              value={formData.documentName}
              onChange={(e) => setFormData(prev => ({ ...prev, documentName: e.target.value }))}
              placeholder="Enter document name"
            />
          </div>

          <div>
            <Label htmlFor="file">Select File * (PDF, JPEG, PNG - Max 10MB)</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            {formData.file && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add any notes about this document"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !formData.file || !formData.documentType || !formData.documentName}
              className="flex-1"
            >
              {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};