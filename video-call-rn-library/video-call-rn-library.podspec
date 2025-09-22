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

  s.source_files   = "ios/**/*.{h,m,mm,swift}"
  s.public_header_files = "ios/**/*.h"
  s.resource_bundles = {
    'VideoCallLibraryResources' => ['ios/Localizable.strings']
  }
  s.requires_arc   = true
  s.swift_version  = "5.0"
  
  # Dependencies
  s.dependency "React-Core"
  s.dependency "udentify-core"  # Shared core framework dependency
  s.dependency "LiveKitClient", "~> 2.3.0"

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
    s.dependency "React-Codegen"
    s.dependency "ReactCommon/turbomodule/core"
  end

  s.pod_target_xcconfig = base_config

  # Resources - exclude PrivacyInfo.xcprivacy to avoid conflicts with React Native's automatic aggregation
  s.resources = [
    'ios/Resources/**/*'
  ]
  s.exclude_files = [
    'ios/Resources/PrivacyInfo.xcprivacy'
  ]
  
  # Framework search paths - include udentify-core frameworks
  s.xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/video-call-rn-library/ios/Frameworks" "$(PODS_ROOT)/udentify-core/ios/Frameworks"',
    'HEADER_SEARCH_PATHS' => '"$(PODS_ROOT)/video-call-rn-library/ios/Frameworks" "$(PODS_ROOT)/udentify-core/ios/Frameworks/UdentifyCommons.xcframework/ios-arm64/UdentifyCommons.framework/Headers"',
    'SWIFT_INCLUDE_PATHS' => '"$(PODS_ROOT)/udentify-core/ios/Frameworks/UdentifyCommons.xcframework/ios-arm64/UdentifyCommons.framework/Modules"'
  }
end
