# File Upload Modal Guide

## Overview

The new File Upload Modal provides a guided, step-by-step process for users to upload files to specific courses and assignments. This replaces the previous direct upload functionality and prevents the error that was occurring when "upload" was used as a course ID.

## Features

### 🎯 **Three-Step Upload Process**

1. **Course Selection**: Users choose which course to upload files to
2. **Assignment Selection** (Optional): Users can optionally select a specific assignment
3. **File Upload**: Users upload their files with progress tracking

### 🎨 **Modern UI Design**

- **Smooth Animations**: Framer Motion animations between steps
- **Progress Indicator**: Visual progress bar showing current step
- **Responsive Design**: Works on all screen sizes
- **Dark Mode Support**: Automatic theme switching

### 🔒 **Security & Validation**

- **User Authentication**: Only authenticated users can upload
- **Course Access Control**: Users can only upload to their enrolled courses
- **File Type Validation**: Supports common academic file types
- **File Size Limits**: Configurable size limits (default 100MB)

## Usage

### In the Files Page

The modal is automatically triggered when users click the "Upload Files" button in the Files page:

```typescript
<FileUploadModal
  isOpen={showUploadModal}
  onClose={() => setShowUploadModal(false)}
  onFileUploaded={(fileId) => {
    console.log("File uploaded successfully");
    // Handle successful upload
  }}
/>
```

### Component Props

```typescript
interface FileUploadModalProps {
  isOpen: boolean;                    // Controls modal visibility
  onClose: () => void;               // Called when modal is closed
  onFileUploaded?: (fileId: Id<"files">) => void; // Called after successful upload
}
```

## Implementation Details

### Course Selection

The modal fetches user courses using the Convex query:

```typescript
const courses = useQuery(api.courses.getUserCourses, 
  user?.id ? { clerkUserId: user.id } : "skip"
);
```

### Assignment Selection

Assignments are filtered by the selected course:

```typescript
const courseAssignments = assignments?.filter(
  assignment => assignment.courseId === selectedCourseId
) || [];
```

### File Upload Integration

The modal uses the existing `FileUpload` component with proper course and assignment context:

```typescript
<FileUpload
  courseId={selectedCourseId}
  assignmentId={selectedAssignmentId}
  onFileUploaded={handleFileUploaded}
/>
```

## Error Handling

### Course Access Validation

The modal only shows courses that the user has access to, preventing unauthorized uploads.

### File Validation

- **File Types**: Validates against accepted file types
- **File Size**: Enforces maximum file size limits
- **Multiple Files**: Supports uploading multiple files at once

### Error States

- **No Courses**: Shows helpful message if user has no courses
- **No Assignments**: Allows skipping assignment selection
- **Upload Failures**: Displays specific error messages

## Navigation

### Step Navigation

Users can navigate between steps using:
- **Next**: Automatic progression when selections are made
- **Back**: Return to previous step
- **Skip**: Skip assignment selection and upload directly to course
- **Cancel**: Close modal and return to files page

### Progress Indicator

Visual progress bar shows:
- ✅ Completed steps (green)
- 🔄 Current step (purple)
- ⭕ Future steps (gray)

## File Types Supported

The modal supports common academic file types:

- **Documents**: PDF, DOC, DOCX, TXT
- **Images**: JPG, JPEG, PNG, BMP, TIFF, WEBP
- **Other**: Any file type can be configured

## File Size Limits

Default limits:
- **Maximum Size**: 100MB per file
- **Maximum Files**: 10 files per upload session

## Integration with Existing Features

### File Management

Uploaded files are automatically:
- Associated with the selected course and assignment
- Added to the user's file library
- Available for viewing, sharing, and downloading

### OCR Processing

Files are automatically processed for text recognition when supported file types are uploaded.

### Real-time Updates

The file list updates automatically after successful uploads without requiring page refresh.

## Troubleshooting

### Common Issues

1. **No Courses Available**
   - Ensure user is enrolled in courses
   - Check course enrollment in Convex database

2. **Upload Failures**
   - Verify file size is within limits
   - Check file type is supported
   - Ensure stable internet connection

3. **Assignment Not Showing**
   - Verify assignments exist for the selected course
   - Check assignment status and visibility

### Debug Mode

In development mode, additional error information is displayed to help with troubleshooting.

## Future Enhancements

### Planned Features

- **Drag & Drop**: Support for dragging files directly onto course cards
- **Bulk Upload**: Upload multiple files to multiple assignments
- **File Templates**: Pre-configured upload templates for common file types
- **Upload Scheduling**: Schedule uploads for later processing

### Integration Opportunities

- **Calendar Integration**: Upload files with due date reminders
- **Grade Tracking**: Link uploaded files to grade submissions
- **Collaboration**: Share files with classmates and instructors

---

The File Upload Modal provides a much better user experience compared to the previous direct upload functionality, with proper validation, error handling, and a guided workflow that prevents common issues.
