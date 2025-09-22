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

  # No source files - this is a pure framework provider
  s.preserve_paths = "ios/Frameworks/**/*"
  s.requires_arc   = true

  # Dependencies
  s.dependency "React-Core"

  # Core shared framework
  s.vendored_frameworks = [
    "ios/Frameworks/UdentifyCommons.xcframework"
  ]
  
  # Framework search paths
  s.xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/udentify-core/ios/Frameworks"',
    'HEADER_SEARCH_PATHS' => '"$(PODS_ROOT)/udentify-core/ios/Frameworks/UdentifyCommons.xcframework/ios-arm64/UdentifyCommons.framework/Headers"',
    'SWIFT_INCLUDE_PATHS' => '"$(PODS_ROOT)/udentify-core/ios/Frameworks/UdentifyCommons.xcframework/ios-arm64/UdentifyCommons.framework/Modules"'
  }
end
