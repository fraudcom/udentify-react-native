# Android NFC SDK Libraries

This directory should contain the Udentify NFC SDK AAR files:

- `commons-25.2.0.aar` - Udentify Commons library (shared with OCR)
- `nfc-25.2.0.aar` - Udentify NFC library

## How to Obtain These Libraries

1. **Contact Udentify Support** to get the latest SDK libraries
2. **Download from Udentify Developer Portal** if you have access
3. **Copy from a working Udentify NFC project**

## Installation

1. Place the AAR files in this directory
2. The `build.gradle` file is already configured to include them:
   ```gradle
   api files('libs/commons-25.2.0.aar')
   api files('libs/nfc-25.2.0.aar')
   ```

## Current Status

✅ **Libraries Available** - Both required AAR files are present and configured.

**Commons Library**: `commons-25.2.0.aar` - ✅ Available
**NFC Library**: `nfc-25.2.0.aar` - ✅ Available

The NFC library should now be fully functional.