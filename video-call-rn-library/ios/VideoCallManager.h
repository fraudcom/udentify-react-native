#import <Foundation/Foundation.h>
#import <React/RCTEventEmitter.h>

// Import UdentifyVC framework if available
#if __has_include(<UdentifyVC/UdentifyVC.h>) && __has_include(<UdentifyCommons/UdentifyCommons.h>)
#import <UdentifyVC/UdentifyVC.h>
#import <UdentifyCommons/UdentifyCommons.h>
#define UDENTIFY_AVAILABLE 1
#else
#define UDENTIFY_AVAILABLE 0
#endif

@interface VideoCallManager : NSObject

@property (nonatomic, weak) RCTEventEmitter *eventEmitter;

#if UDENTIFY_AVAILABLE
@property (nonatomic, strong) UIViewController *videoCallViewController;
@property (nonatomic, strong) id<VCCameraControllerDelegate> videoCallOperator;
#endif

- (instancetype)initWithEventEmitter:(RCTEventEmitter *)eventEmitter;

// Permission methods
- (void)checkPermissionsWithResolver:(RCTPromiseResolveBlock)resolve 
                            rejecter:(RCTPromiseRejectBlock)reject;
- (void)requestPermissionsWithResolver:(RCTPromiseResolveBlock)resolve 
                              rejecter:(RCTPromiseRejectBlock)reject;

// Video call lifecycle methods
- (void)startVideoCallWithCredentials:(NSDictionary *)credentials 
                             resolver:(RCTPromiseResolveBlock)resolve 
                             rejecter:(RCTPromiseRejectBlock)reject;
- (void)endVideoCallWithResolver:(RCTPromiseResolveBlock)resolve 
                        rejecter:(RCTPromiseRejectBlock)reject;
- (void)getVideoCallStatusWithResolver:(RCTPromiseResolveBlock)resolve 
                              rejecter:(RCTPromiseRejectBlock)reject;

// Configuration methods
- (void)configureUISettings:(NSDictionary *)uiConfig 
                   resolver:(RCTPromiseResolveBlock)resolve 
                   rejecter:(RCTPromiseRejectBlock)reject;
- (void)setVideoCallConfigWithConfig:(NSDictionary *)config 
                            resolver:(RCTPromiseResolveBlock)resolve 
                            rejecter:(RCTPromiseRejectBlock)reject;

// Control methods
- (void)toggleCameraWithResolver:(RCTPromiseResolveBlock)resolve 
                        rejecter:(RCTPromiseRejectBlock)reject;
- (void)switchCameraWithResolver:(RCTPromiseResolveBlock)resolve 
                        rejecter:(RCTPromiseRejectBlock)reject;
- (void)toggleMicrophoneWithResolver:(RCTPromiseResolveBlock)resolve 
                            rejecter:(RCTPromiseRejectBlock)reject;
- (void)dismissVideoCallWithResolver:(RCTPromiseResolveBlock)resolve 
                            rejecter:(RCTPromiseRejectBlock)reject;

@end
