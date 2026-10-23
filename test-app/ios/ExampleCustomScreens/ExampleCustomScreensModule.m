#import <React/RCTBridgeModule.h>

#if __has_include("ExampleCustomScreens-Swift.h")
#import "ExampleCustomScreens-Swift.h"
#else
#import <ExampleCustomScreens/ExampleCustomScreens-Swift.h>
#endif

// JS name "CustomScreens", the same on both platforms.
@interface ExampleCustomScreensModule : NSObject <RCTBridgeModule>
@end

@implementation ExampleCustomScreensModule

RCT_EXPORT_MODULE(CustomScreens)

+ (BOOL)requiresMainQueueSetup { return NO; }

RCT_EXPORT_METHOD(setEnabled:(BOOL)enabled
                  language:(NSString *)language
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve([ExampleCustomScreensController setEnabled:enabled language:language]);
    });
}

@end
