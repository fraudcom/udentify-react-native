require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = "video-call-rn-library"
  s.version        = package["version"]
  s.summary        = package["description"]
  s.homepage       = package["homepage"]
  s.license        = package["license"]
  s.authors        = package["author"]

  s.platforms      = { :ios => "11.0" }
  s.source         = { :git => "https://github.com/example/video-call-rn-library.git", :tag => "#{s.version}" }

  # IMPORTANT: source_files MUST stay non-recursive at the top level
  # ("ios/*..."). A blanket "ios/**/*" recurses into ios/Frameworks/*.xcframework
  # slices and breaks simulator builds with "Unsupported Swift architecture" /
  # "Swift generated header not found" errors (CocoaPods xcframework handling
  # conflicts with the glob). The UdentifyVC subfolder is included explicitly
  # because it ships as loose Swift sources, not as an .xcframework.
  s.source_files   = [
    "ios/*.{h,m,mm,swift}",
    "ios/Frameworks/UdentifyVC/**/*.swift"
  ]
  # Non-recursive: stays consistent with source_files and prevents
  # accidental exposure of vendored framework headers should one ever
  # be added under ios/Frameworks/ as an xcframework.
  s.public_header_files = "ios/*.h"
  s.resource_bundles = {
    'VideoCallLibraryResources' => ['ios/Resources/**/*.lproj/*.strings']
  }
  s.requires_arc   = true
  s.swift_version  = "5.0"
  
  # Dependencies
  s.dependency "React-Core"
  s.dependency "udentify-core"  # Shared core framework dependency
  s.dependency "LiveKitClient", "~> 2.13.0"

  # Configure build settings
  base_config = {
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'DEFINES_MODULE' => 'YES',
    'SWIFT_OBJC_INTERFACE_HEADER_NAME' => 'video_call_rn_library-Swift.h',
    'PRODUCT_MODULE_NAME' => 'video_call_rn_library'
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

  # Resources - exclude PrivacyInfo.xcprivacy to avoid conflicts with React Native's automatic aggregation.
  # Also exclude the *.lproj folders: they're bundled separately via resource_bundles above, and
  # including them here too would double-bundle Localizable.strings into two different targets.
  s.resources = [
    'ios/Resources/**/*'
  ]
  s.exclude_files = [
    'ios/Resources/PrivacyInfo.xcprivacy',
    'ios/Resources/**/*.lproj/**/*'
  ]
  
  # Framework search paths - include udentify-core frameworks
  # NOTE: Headers/Modules paths are NOT hardcoded per-architecture here.
  # CocoaPods automatically resolves the correct xcframework slice
  # (ios-arm64, ios-arm64_x86_64-simulator, etc.) from vendored_frameworks
  # in udentify-core (UdentifyCommons) and in this pod.
  s.xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/video-call-rn-library/ios/Frameworks" "$(PODS_ROOT)/udentify-core/ios/Frameworks"'
  }
end
