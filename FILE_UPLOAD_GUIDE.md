# File Upload Implementation Guide

## Overview

The ScholarBridge Persona system now supports file uploads for building AI mentor twins. This feature allows mentors to upload research materials directly, making it easier to create accurate AI personas.

## What's New

✅ **PDF Support** - Automatic text extraction from PDF documents
✅ **DOCX Support** - Parse Microsoft Word documents
✅ **Image Support** - Vision LLM-based image understanding
✅ **Text Files** - Plain text and Markdown files
✅ **Multiple Files** - Upload up to 10 files at once
✅ **Size Validation** - Automatic file size validation (10MB limit per file)
✅ **Smart Parsing** - Content cleaning and summarization

## Architecture

### Backend Components

#### 1. File Parser (`lib/persona/file-parser.ts`)

Core parsing functionality for all supported file types:

```typescript
import { parseFile, cleanParsedText, extractSummary } from '@/lib/persona/file-parser';

// Parse a single file
const result = await parseFile(uploadedFile, llmProvider);

if (result.success) {
  const cleanedContent = cleanParsedText(result.content);
  const summary = extractSummary(cleanedContent);
}
```

**Supported File Types:**
- `application/pdf` - PDF documents
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - DOCX files
- `application/msword` - DOC files
- `text/plain` - Plain text
- `text/markdown` - Markdown files
- `image/*` - Images (PNG, JPG, GIF, WebP)

#### 2. Upload Handler (`lib/upload.ts`)

Handles multipart form data parsing in API routes:

```typescript
import { parseMultipartFormData, validateUploadFiles } from '@/lib/upload';

// Parse multipart request
const { fields, files } = await parseMultipartFormData(request);

// Validate files
const validation = validateUploadFiles(files);
if (!validation.valid) {
  return response({ errors: validation.errors }, { status: 400 });
}
```

#### 3. Updated Persona Builder (`lib/persona/builder.ts`)

The PersonaBuilder now integrates with the file parser:

```typescript
const builder = new PersonaBuilder(llmProvider);

const result = await builder.build({
  mentor: { name, affiliation, ... },
  publicUrls: [],
  uploads: uploadedFiles // Array of file buffers
});
```

### Frontend Components

#### FileUpload Component (`components/ui/FileUpload.tsx`)

A complete React component for file uploads:

```tsx
import { FileUpload } from '@/components/ui/FileUpload';

<FileUpload
  accept=".pdf,.docx,.doc,.txt,.md"
  multiple={true}
  maxSize={10 * 1024 * 1024}
  maxFiles={10}
  onFilesSelected={(files) => {
    console.log('Selected files:', files);
  }}
/>
```

**Features:**
- Drag and drop support
- File validation
- Size checking
- Multiple file selection
- Visual feedback
- Error handling

## API Usage

### Method 1: JSON Request (Existing)

```bash
curl -X POST http://localhost:3000/api/personas/build \
  -H "Content-Type: application/json" \
  -H "Cookie: skill-hub-session=YOUR_SESSION" \
  -d '{
    "name": "Dr. Jane Chen",
    "affiliation": "MIT",
    "authorizedBy": "admin@mit.edu",
    "projectText": "Research in machine learning and NLP..."
  }'
```

### Method 2: Multipart Form Data (New)

#### Using cURL

```bash
curl -X POST http://localhost:3000/api/personas/build \
  -H "Cookie: skill-hub-session=YOUR_SESSION" \
  -F "name=Dr. Jane Chen" \
  -F "affiliation=MIT" \
  -F "authorizedBy=admin@mit.edu" \
  -F "projectText=Additional context..." \
  -F "files=@/path/to/research.pdf" \
  -F "files=@/path/to/project.docx"
```

#### Using JavaScript (Browser)

```javascript
const formData = new FormData();

formData.append('name', 'Dr. Jane Chen');
formData.append('affiliation', 'MIT');
formData.append('authorizedBy', 'admin@mit.edu');

// Add files
const fileInput = document.querySelector('#file-upload');
for (const file of fileInput.files) {
  formData.append('files', file);
}

const response = await fetch('/api/personas/build', {
  method: 'POST',
  headers: {
    'Cookie': 'skill-hub-session=YOUR_SESSION'
  },
  body: formData
});

const data = await response.json();
console.log(data);
```

#### Using JavaScript (Node.js with fetch)

```javascript
import fs from 'fs';
import { FormData } from 'node-fetch';

const formData = new FormData();

formData.append('name', 'Dr. Jane Chen');
formData.append('affiliation', 'MIT');
formData.append('authorizedBy', 'admin@mit.edu');

// Add files from filesystem
const fileBuffer = fs.readFileSync('/path/to/research.pdf');
formData.append('files', new Blob([fileBuffer]), {
  filename: 'research.pdf',
  contentType: 'application/pdf'
});

const response = await fetch('http://localhost:3000/api/personas/build', {
  method: 'POST',
  headers: {
    'Cookie': 'skill-hub-session=YOUR_SESSION'
  },
  body: formData
});
```

## File Processing Pipeline

### 1. Upload Flow

```
User uploads files
  ↓
API validates file type & size
  ↓
Files parsed (PDF/DOCX/Text/Images)
  ↓
Content extracted & cleaned
  ↓
Persona built from sources
  ↓
Chunks generated for retrieval
  ↓
Persona saved to database
```

### 2. Content Cleaning

All parsed content goes through automatic cleaning:

```typescript
const cleaned = cleanParsedText(rawContent, 100000);

// Cleaning steps:
// 1. Unified whitespace
// 2. Remove excessive line breaks
// 3. Trim whitespace
// 4. Truncate to max length
// 5. Smart truncation at sentence boundaries
```

### 3. Metadata Extraction

PDFs include metadata extraction:

```typescript
const result = await parsePDF(buffer);

result.metadata = {
  title: "Research Paper",
  author: "Dr. Jane Chen",
  subject: "Machine Learning",
  keywords: "AI, NLP, Deep Learning",
  pageCount: 15
};
```

## Configuration

### Environment Variables

```bash
# File upload limits
MAX_UPLOAD_SIZE_MB=10
ALLOWED_UPLOAD_TYPES=pdf,docx,doc,txt,md,png,jpg,jpeg,gif,webp

# LLM Provider (for images)
PERSONA_LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### Customize Limits

Edit `lib/persona/file-parser.ts`:

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  // ... add more types
];
```

## Testing

### Automated Tests

Run the file upload test suite:

```bash
cd backend

# Set your session cookie
export SESSION_COOKIE="your-session-cookie"

# Run tests
node scripts/test-file-upload.mjs
```

### Manual Testing with cURL

```bash
# Test PDF upload
curl -X POST http://localhost:3000/api/personas/build \
  -H "Cookie: skill-hub-session=YOUR_SESSION" \
  -F "name=Test" \
  -F "affiliation=Test Univ" \
  -F "authorizedBy=test@test.com" \
  -F "files=@./test-sample.pdf"

# Test multiple files
curl -X POST http://localhost:3000/api/personas/build \
  -H "Cookie: skill-hub-session=YOUR_SESSION" \
  -F "name=Test" \
  -F "affiliation=Test Univ" \
  -F "authorizedBy=test@test.com" \
  -F "files=@./cv.pdf" \
  -F "files=@./research.docx" \
  -F "files=@./interests.txt"
```

## Error Handling

### Common Errors

#### 1. File Too Large

```json
{
  "success": false,
  "error": {
    "code": "INVALID_UPLOAD",
    "message": "File upload validation failed",
    "details": [
      "File document.pdf exceeds size limit of 10MB"
    ]
  }
}
```

**Solution**: Compress the file or split into smaller files.

#### 2. Unsupported File Type

```json
{
  "success": false,
  "error": {
    "code": "INVALID_UPLOAD",
    "details": [
      "File video.mp4 has unsupported type: video/mp4"
    ]
  }
}
```

**Solution**: Convert to supported format (PDF, DOCX, TXT, MD).

#### 3. Parsing Failed

```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "title": "[Error] corrupted.pdf",
        "content": "[Failed to parse corrupted.pdf: Invalid PDF structure]"
      }
    ]
  }
}
```

**Solution**: Check file integrity and try re-saving the file.

## Best Practices

### 1. File Preparation

- **PDFs**: Use text-based PDFs, not scanned images
- **DOCX**: Use standard formatting, avoid complex layouts
- **Images**: High resolution with clear text
- **Text**: Plain text or Markdown for best results

### 2. Content Organization

```
Recommended uploads:
├── research-statement.pdf (Main research overview)
├── project-description.docx (Specific project details)
├── publications-list.txt (List of key publications)
└── research-interests.md (Detailed research topics)
```

### 3. File Naming

Use descriptive names:
- ✅ `research-interests-2024.pdf`
- ✅ `project-llm-efficiency.docx`
- ❌ `document1.pdf`
- ❌ `final_final_v3.pdf`

### 4. Size Management

- Keep individual files under 5MB when possible
- Split large documents into chapters/sections
- Compress images while maintaining readability
- Remove unnecessary images from PDFs

## Troubleshooting

### Issue: PDF Returns No Text

**Cause**: PDF might be image-based (scanned)

**Solution**:
1. Check if PDF has selectable text
2. Use OCR tool to convert images to text
3. Re-save as text-based PDF

### Issue: DOCX Parsing Incomplete

**Cause**: Complex formatting or embedded objects

**Solution**:
1. Simplify document formatting
2. Extract embedded objects separately
3. Use plain text version if needed

### Issue: Image Parsing Fails

**Cause**: No vision-capable LLM configured

**Solution**:
```bash
# Configure Anthropic Claude (supports vision)
PERSONA_LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-latest
```

### Issue: Memory Errors

**Cause**: Too many large files uploaded at once

**Solution**:
1. Reduce number of simultaneous uploads
2. Process files sequentially
3. Increase Node.js memory limit: `NODE_OPTIONS="--max-old-space-size=4096"`

## Performance Considerations

### Processing Times

| File Type | Size | Processing Time |
|-----------|------|-----------------|
| Text/MD   | <1MB | <100ms |
| PDF       | 5MB  | 1-3s |
| DOCX      | 3MB  | 500ms-2s |
| Image     | 2MB  | 2-5s (with vision LLM) |

### Optimization Tips

1. **Batch Processing**: Upload multiple files in one request
2. **Async Processing**: For very large files, consider async jobs
3. **Caching**: Reuse parsed content for repeated builds
4. **Compression**: Use compressed PDFs when possible

## Security Considerations

### File Validation

All uploads are validated:
- ✅ File type checking (MIME type)
- ✅ File size limits
- ✅ File name sanitization
- ✅ Content validation

### Safe File Handling

```typescript
// Files are never executed
// Only text extraction is performed
// No shell commands are run on uploads
// All parsing happens in memory
```

### Storage Options

Currently files are processed in-memory. For persistent storage:

```typescript
// Save to disk (optional)
const filePath = await saveFile(uploadedFile, './uploads');

// Or use cloud storage (S3, etc.)
const s3Key = await uploadToS3(uploadedFile);
```

## Future Enhancements

Planned improvements:

- [ ] Asynchronous processing for large files
- [ ] Progress indicators for long-running parses
- [ ] Batch processing queues
- [ ] Cloud storage integration (S3, GCS)
- [ ] OCR support for scanned PDFs
- [ ] PowerPoint (PPTX) support
- [ ] Excel (XLSX) data extraction
- [ ] Video transcript extraction
- [ ] Audio transcription integration

## Support

For issues or questions:

1. Check this guide first
2. Review test cases in `scripts/test-file-upload.mjs`
3. Check error messages in API responses
4. Enable debug logging: `DEBUG=persona:*`

## Changelog

### Version 1.0.0 (2026-04-13)

- ✅ Initial file upload implementation
- ✅ PDF, DOCX, Text, Markdown support
- ✅ Image support with vision LLM
- ✅ FileUpload React component
- ✅ Multipart form data API
- ✅ Comprehensive validation
- ✅ Test suite
- ✅ Documentation
