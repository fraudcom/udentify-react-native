require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = "nfc-rn-library"
  s.version        = package["version"]
  s.summary        = package["description"]
  s.homepage       = package["homepage"]
  s.license        = package["license"]
  s.authors        = package["author"]

  s.platforms      = { :ios => "15.1" }
  s.source         = { :git => "https://github.com/example/nfc-rn-library.git", :tag => "#{s.version}" }

  s.source_files   = "ios/*.{h,m,mm,swift}"
  # Non-recursive: avoid pulling xcframework-internal headers
  # (e.g. UdentifyNFC-Swift.h inside the vendored xcframework slices)
  # into the pod's public umbrella header.
  s.public_header_files = "ios/*.h"
  s.resource_bundles = {
    'NFCLibraryResources' => ['ios/Resources/**/*']
  }
  s.requires_arc   = true
  s.swift_version  = "5.0"
  
  # Dependencies
  s.dependency "React-Core"
  s.dependency "udentify-core"  # Shared core framework dependency

  # Configure build settings
  base_config = {
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'DEFINES_MODULE' => 'YES',
    'SWIFT_OBJC_INTERFACE_HEADER_NAME' => 'nfc_rn_library-Swift.h',
    'PRODUCT_MODULE_NAME' => 'nfc_rn_library'
  }

  # New Architecture
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    base_config.merge!({
        "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\"",
        "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32",
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    })
    s.dependency "ReactCodegen"
    s.dependency "ReactCommon/turbomodule/core"
  end

  s.pod_target_xcconfig = base_config

  # Frameworks for Udentify NFC SDK 
  # Only NFC-specific framework (UdentifyCommons provided by udentify-core)
  s.vendored_frameworks = [
    "ios/Frameworks/UdentifyNFC.xcframework"
  ]
  
  # Framework search paths and module configuration
  # NOTE: Headers/Modules paths are NOT hardcoded per-architecture here.
  # CocoaPods automatically resolves the correct xcframework slice
  # (ios-arm64, ios-arm64_x86_64-simulator, etc.) from vendored_frameworks.
  s.xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/nfc-rn-library/ios/Frameworks"'
  }
end
