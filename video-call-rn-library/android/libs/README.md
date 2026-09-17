# Udentify SDK AAR Files

This directory should contain the Udentify SDK AAR files for Android integration.

## Required Files

Place the following AAR files in this directory:

1. `udentify-video-call-android.aar` - Main Udentify Video Call SDK
2. Any additional dependency AAR files as specified by Udentify

## Integration Notes

- These AAR files are provided separately by Udentify
- The build.gradle file is configured to automatically include all AAR files from this directory
- Make sure to use the correct version compatible with your project

## File Structure
```
android/libs/
├── README.md (this file)
├── udentify-video-call-android.aar
└── [other-dependency-files].aar
```

## For More Information

Refer to the native Android documentation: `native-lib-video-call/video-call-android.rtf`
