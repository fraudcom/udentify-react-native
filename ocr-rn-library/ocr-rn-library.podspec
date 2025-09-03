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

  s.source_files   = "ios/**/*.{h,m,mm,swift}"
  s.resource_bundles = {
    'OCRLibraryResources' => ['ios/Localizable.strings']
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
    s.dependency "React-Codegen"
    s.dependency "ReactCommon/turbomodule/core"
  end

  # Frameworks for Udentify SDK
  # Only OCR-specific framework (UdentifyCommons provided by udentify-core)
  s.vendored_frameworks = [
    "ios/Frameworks/UdentifyOCR.xcframework"
  ]
  
  # Framework search paths  
  s.xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/ocr-rn-library/ios/Frameworks"',
    'HEADER_SEARCH_PATHS' => '"$(PODS_ROOT)/ocr-rn-library/ios/Frameworks/UdentifyOCR.xcframework/ios-arm64/UdentifyOCR.framework/Headers"',
    'SWIFT_INCLUDE_PATHS' => '"$(PODS_ROOT)/ocr-rn-library/ios/Frameworks/UdentifyOCR.xcframework/ios-arm64/UdentifyOCR.framework/Modules"'
  }
end
