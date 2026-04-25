# File Upload Feature - Quick Reference

## 🎯 What's New

The Persona system now supports **direct file uploads** for building AI mentor twins. No more copy-pasting text - just upload your research materials!

## 📤 Supported File Types

| Type | Extensions | Notes |
|------|------------|-------|
| PDF | `.pdf` | Automatic text extraction |
| Word | `.docx`, `.doc` | DOCX recommended |
| Text | `.txt`, `.md` | Plain text or Markdown |
| Images | `.png`, `.jpg`, `.gif`, `.webp` | Vision LLM required |

## 🚀 Quick Start

### 1. Upload via cURL

```bash
curl -X POST http://localhost:3000/api/personas/build \
  -H "Cookie: skill-hub-session=YOUR_SESSION" \
  -F "name=Dr. Jane Chen" \
  -F "affiliation=MIT" \
  -F "authorizedBy=admin@mit.edu" \
  -F "files=@research.pdf" \
  -F "files=@project.docx"
```

### 2. Upload via React Component

```tsx
import { FileUpload } from '@/components/ui/FileUpload';

<FileUpload
  multiple={true}
  maxFiles={10}
  onFilesSelected={(files) => handleUpload(files)}
/>
```

### 3. Upload via JavaScript

```javascript
const formData = new FormData();
formData.append('name', 'Dr. Jane Chen');
formData.append('affiliation', 'MIT');
formData.append('files', fileInput.files[0]);

fetch('/api/personas/build', {
  method: 'POST',
  body: formData
});
```

## 📋 Limits & Validation

- **Max files per request**: 10
- **Max file size**: 10MB per file
- **Automatic validation**: File type and size checked
- **Error messages**: Clear feedback for invalid files

## 🔧 Technical Details

### Backend Files

```
lib/persona/file-parser.ts    # Core parsing logic
lib/upload.ts                  # Multipart handling
app/api/personas/build/route.ts # Updated API endpoint
```

### Frontend Files

```
components/ui/FileUpload.tsx   # Upload component
```

### Test Files

```
scripts/test-file-upload.mjs   # Automated tests
```

## 📚 Documentation

- **Full Guide**: [FILE_UPLOAD_GUIDE.md](./FILE_UPLOAD_GUIDE.md)
- **API Examples**: [backend/PERSONA_API_EXAMPLES.md](./backend/PERSONA_API_EXAMPLES.md)

## ✨ Features

### File Parser (`lib/persona/file-parser.ts`)

```typescript
// Parse any supported file type
const result = await parseFile(uploadedFile, llmProvider);

if (result.success) {
  console.log(result.content);    // Extracted text
  console.log(result.metadata);   // File metadata
}
```

**Capabilities**:
- ✅ PDF text extraction with metadata
- ✅ DOCX content parsing
- ✅ Image understanding (Vision LLM)
- ✅ Text file reading
- ✅ Content cleaning and summarization
- ✅ Batch processing support

### Upload Handler (`lib/upload.ts`)

```typescript
// Parse multipart form data
const { fields, files } = await parseMultipartFormData(request);

// Validate uploads
const validation = validateUploadFiles(files);
```

**Capabilities**:
- ✅ Multipart form parsing
- ✅ File validation
- ✅ Size checking
- ✅ Type verification
- ✅ Error handling

## 🧪 Testing

### Run Test Suite

```bash
cd backend

# Set session cookie
export SESSION_COOKIE="your-session-value"

# Run tests
node scripts/test-file-upload.mjs
```

### Test Coverage

- ✅ Single file upload
- ✅ Multiple file upload
- ✅ File size validation
- ✅ Type validation
- ✅ Content extraction
- ✅ Persona building with files

## 📊 Performance

| File Type | Size | Time |
|-----------|------|------|
| Text/MD   | <1MB | <100ms |
| PDF       | 5MB  | 1-3s |
| DOCX      | 3MB  | 0.5-2s |
| Image     | 2MB  | 2-5s |

## 🔒 Security

- ✅ File type validation (MIME check)
- ✅ Size limits enforced
- ✅ File name sanitization
- ✅ Content validation
- ✅ No file execution
- ✅ Memory-safe processing

## 💡 Tips

### Best Practices

1. **Use text-based PDFs** - Scanned PDFs need OCR
2. **Organize files** - Related files together
3. **Descriptive names** - Helps with organization
4. **Split large files** - Under 5MB recommended
5. **Test first** - Use test script to verify

### File Preparation

```
Recommended:
✅ research-interests.pdf (text-based)
✅ project-description.docx (clean formatting)
✅ publications-list.txt (plain text)
✅ research-topics.md (markdown)

Not recommended:
❌ scanned-documents.pdf (needs OCR)
❌ complex-layouts.docx (hard to parse)
❌ huge-files.pdf (>10MB)
```

## 🐛 Troubleshooting

### "No text extracted from PDF"

**Cause**: PDF is image-based (scanned)

**Solution**: Convert using OCR tool or save as text-based PDF

### "File too large"

**Cause**: File exceeds 10MB limit

**Solution**: Split into smaller files or compress

### "Unsupported file type"

**Cause**: File type not in allowlist

**Solution**: Convert to supported format (PDF, DOCX, TXT, MD)

### "Image parsing failed"

**Cause**: No vision-capable LLM

**Solution**: Configure Anthropic Claude for vision support

```bash
PERSONA_LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

## 📈 Status

**Implementation**: ✅ Complete
**Testing**: ✅ Test suite available
**Documentation**: ✅ Comprehensive guide
**Components**: ✅ React UI component
**API**: ✅ Multipart support

**Version**: 1.0.0
**Date**: 2026-04-13

## 🎓 Examples

See `FILE_UPLOAD_GUIDE.md` for complete examples including:
- cURL examples
- JavaScript/TypeScript examples
- React component examples
- Error handling patterns
- Batch processing
- And more...

---

**Need help?** Check the full guide or run the test script!
