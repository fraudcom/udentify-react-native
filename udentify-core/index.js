// udentify-core - Core shared components for Udentify libraries
// This package provides shared native frameworks and utilities used by @udentify/nfc, @udentify/ocr, and liveness libraries

// No JavaScript exports - this is a native framework provider
// The frameworks are automatically linked via CocoaPods/Gradle

module.exports = {
  // Version info for debugging
  version: require('./package.json').version,
  
  // Core framework info
  frameworks: {
    ios: ['UdentifyCommons.xcframework'],
    android: ['commons-25.2.0.aar']  // Now available!
  },
  
  // Platform availability
  platforms: {
    ios: true,
    android: true  // Now supported!
  }
};
