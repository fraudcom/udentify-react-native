# iOS Frameworks Directory

Please place the Udentify NFC SDK frameworks in this directory:

## Required Files:
- `UdentifyNFC.xcframework/` - NFC passport reading framework

## File Structure:
```
Frameworks/
└── UdentifyNFC.xcframework/
    ├── Info.plist
    ├── ios-arm64/
    └── ios-arm64_x86_64-simulator/
```

## Note:
- `UdentifyCommons.xcframework` is provided by the `ocr-rn-library` dependency
- Only `UdentifyNFC.xcframework` needs to be placed in this directory
- The framework will be automatically linked via the nfc-rn-library.podspec file
