require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = "udentify-core"
  s.version        = package["version"]
  s.summary        = package["description"]
  s.homepage       = "https://github.com/yourcompany/udentify-core"
  s.license        = package["license"]
  s.authors        = package["author"]

  s.platforms      = { :ios => "11.0" }
  s.source         = { :git => "https://github.com/udentify/udentify-core.git", :tag => "#{s.version}" }

  # Source files for SSL Pinning module
  s.source_files   = "ios/*.{h,m,mm,swift}"
  s.preserve_paths = "ios/Frameworks/**/*"
  s.requires_arc   = true
  s.swift_version  = "5.0"

  # Dependencies
  s.dependency "React-Core"

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

  # Core shared framework
  s.vendored_frameworks = [
    "ios/Frameworks/UdentifyCommons.xcframework"
  ]
  
  # Framework search paths
  # NOTE: Headers/Modules paths are NOT hardcoded per-architecture here.
  # CocoaPods automatically resolves the correct xcframework slice
  # (ios-arm64, ios-arm64_x86_64-simulator, etc.) from vendored_frameworks.
  s.xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/udentify-core/ios/Frameworks"'
  }
end
