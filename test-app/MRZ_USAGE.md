# MRZ Test App Usage Guide

This document explains how to use the MRZ (Machine Readable Zone) functionality in the OCR Test App.

## 🎯 What is MRZ?

Machine Readable Zone (MRZ) is a standardized format found on the bottom of ID cards and passports. It contains essential information needed for NFC reading including:

- Document number
- Date of birth
- Date of expiration
- Personal information (name, nationality, gender)
- BAC credentials for NFC chip access

## 📱 MRZ Tab Features

The MRZ tab provides comprehensive testing and usage of the MRZ library:

### Basic Features
- **Camera Permissions**: Check and request camera access
- **MRZ Camera Scanning**: Real-time document scanning with progress tracking
- **Image Processing**: Process MRZ from Base64 encoded images
- **Mode Selection**: Choose between Fast and Accurate scanning modes

### Advanced Features
- **Automated Testing**: Run predefined test scenarios
- **Data Validation**: Validate extracted MRZ data completeness
- **Performance Tracking**: Monitor scan duration and success rates
- **Export Functionality**: Export MRZ data for debugging
- **NFC Integration**: Generate BAC credentials for NFC reading

## 🚀 How to Use

### 1. Basic MRZ Scanning

```typescript
import { startMrzCamera, MrzReaderMode } from 'mrz-rn-library';

// Check permissions first
const hasPermissions = await checkPermissions();
if (!hasPermissions) {
  await requestPermissions();
}

// Start scanning
const result = await startMrzCamera(
  MrzReaderMode.ACCURATE,
  (progress) => console.log(`Progress: ${progress}%`)
);

if (result.success) {
  console.log('Document Number:', result.mrzData?.documentNumber);
  console.log('Full Name:', getFullName(result.mrzData));
}
```

### 2. Image Processing

```typescript
import { processMrzImage } from 'mrz-rn-library';

const result = await processMrzImage(
  base64ImageString,
  MrzReaderMode.FAST
);

if (result.success) {
  // Use the extracted MRZ data
  const mrzData = result.mrzData;
}
```

### 3. NFC Integration

```typescript
// After successful MRZ scan
const bacCredentials = result.bacCredentials;

// Use these credentials for NFC reading
if (bacCredentials) {
  console.log('Document Number:', bacCredentials.documentNumber);
  console.log('Date of Birth:', bacCredentials.dateOfBirth);
  console.log('Date of Expiration:', bacCredentials.dateOfExpiration);
}
```

## 🧪 Testing Features

### Automated Tests
The test page includes automated tests for:
- Permission checking
- Mode switching functionality
- Basic initialization tests

### Manual Testing
- **Fast vs Accurate Mode**: Compare scanning performance
- **Progress Tracking**: Monitor real-time scan progress
- **Error Handling**: Test various failure scenarios
- **Data Validation**: Verify extracted data completeness

### Performance Monitoring
- Scan duration tracking
- Success/failure rate monitoring
- Test result history (last 10 tests)

## 📊 Data Formats

### MRZ Data Structure
```typescript
interface MrzData {
  documentType: string;        // P for passport, I for ID
  issuingCountry: string;      // 3-letter country code
  documentNumber: string;      // Document/passport number
  dateOfBirth: string;         // YYMMDD format
  gender: string;              // M/F/X
  dateOfExpiration: string;    // YYMMDD format
  nationality: string;         // 3-letter nationality code
  surname: string;             // Family name
  givenNames: string;          // First names
  // Optional fields
  optionalData1?: string;
  optionalData2?: string;
}
```

### BAC Credentials
```typescript
interface BACCredentials {
  documentNumber: string;      // For NFC authentication
  dateOfBirth: string;         // YYMMDD format
  dateOfExpiration: string;    // YYMMDD format
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **Camera Permission Denied**
   - Solution: Use "Request Permissions" button or check device settings

2. **MRZ Not Found**
   - Ensure good lighting
   - Hold document steady
   - Try different angles
   - Use Accurate mode for better results

3. **Scan Timeout**
   - Try Fast mode for quicker results
   - Ensure MRZ area is clearly visible
   - Cancel and restart if needed

4. **Invalid Data**
   - Use the "Validate Data" feature to check completeness
   - Some fields may be optional depending on document type

### Performance Tips

- **Lighting**: Ensure good, even lighting on the document
- **Stability**: Hold the device steady during scanning
- **Focus**: Make sure the MRZ area is in focus
- **Mode Selection**: Use Accurate mode for final results, Fast mode for testing

## 🔗 Integration with Other Modules

### NFC Module Integration
After successful MRZ scanning:
1. Extract BAC credentials from the result
2. Switch to NFC tab (automatic with "Use for NFC" button)
3. Use credentials for secure NFC chip reading

### OCR Module Integration
MRZ data can complement OCR results:
- Document number verification
- Expiration date cross-check
- Personal information validation

## 📝 Example Components

The test app includes three MRZ components:

1. **MRZTab**: Basic functionality matching Flutter implementation
2. **MRZTestPage**: Comprehensive testing with advanced features
3. **MRZUsageExample**: Simple usage demonstration

Choose the appropriate component based on your testing needs:
- Use **MRZTab** for standard testing
- Use **MRZTestPage** for advanced testing and debugging
- Use **MRZUsageExample** for learning basic implementation

## 🔧 Configuration

### Available Modes
- **MrzReaderMode.FAST**: Quicker scanning, may be less accurate
- **MrzReaderMode.ACCURATE**: Slower but more reliable results

### Platform Differences
- iOS: Requires camera usage description in Info.plist
- Android: Requires camera permission in AndroidManifest.xml

### SDK Requirements
- Udentify MRZ SDK frameworks must be properly installed
- Check SDK availability using the provided error messages

## 📱 Testing Workflow

1. **Start**: Open MRZ tab in test app
2. **Permissions**: Check/request camera permissions
3. **Configure**: Select scanning mode (Fast/Accurate)
4. **Scan**: Use "Start MRZ Camera" for live scanning
5. **Validate**: Check extracted data completeness
6. **Use**: Export data or use for NFC reading
7. **Test**: Run automated tests for comprehensive validation

## 🎉 Success Indicators

- ✅ Green status messages
- 📊 Progress bar completion
- 📄 Complete MRZ data extraction
- 🔗 BAC credentials generation
- ⏱️ Reasonable scan duration (< 10 seconds)

This implementation provides a complete testing environment for the MRZ functionality, closely matching the Flutter version while adding React Native-specific enhancements.
