require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = "ocr-rn-library"
  s.version        = package["version"]
  s.summary        = package["description"]
  s.homepage       = package["homepage"]
  s.license        = package["license"]
  s.authors        = package["author"]

  s.platforms      = { :ios => "11.0" }
  s.source         = { :git => "https://github.com/example/ocr-rn-library.git", :tag => "#{s.version}" }

  s.source_files   = "ios/*.{h,m,mm,swift}"
  s.resource_bundles = {
    'OCRLibraryResources' => ['ios/Resources/**/*.lproj/*.strings']
  }
  s.requires_arc   = true
  s.swift_version  = "5.0"

  # Dependencies
  s.dependency "React-Core"
  s.dependency "udentify-core"  # Shared core framework dependency

  # New Architecture
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.pod_target_xcconfig    = {
        "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\"",
        "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    }
    s.dependency "ReactCodegen"
    s.dependency "ReactCommon/turbomodule/core"
  end

  # Frameworks for Udentify SDK
  # Only OCR-specific framework (UdentifyCommons provided by udentify-core)
  s.vendored_frameworks = [
    "ios/Frameworks/UdentifyOCR.xcframework"
  ]
  
  # Framework search paths
  # NOTE: Headers/Modules paths are NOT hardcoded per-architecture here.
  # CocoaPods automatically resolves the correct xcframework slice
  # (ios-arm64, ios-arm64_x86_64-simulator, etc.) from vendored_frameworks.
  s.xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/ocr-rn-library/ios/Frameworks"'
  }
end
