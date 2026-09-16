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

// The call screen is now an embeddable RN native component (VideoCallView /
// VideoCallCameraView), mounted by React Native's own view manager rather
// than held/presented by this bridge module - there is no view controller or
// operator ivar owned here anymore.

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
- (void)getLocalizedStringsWithResolver:(RCTPromiseResolveBlock)resolve
                                rejecter:(RCTPromiseRejectBlock)reject;

// Control methods
- (void)toggleMicrophoneWithResolver:(RCTPromiseResolveBlock)resolve
                            rejecter:(RCTPromiseRejectBlock)reject;
- (void)setMicrophoneEnabled:(BOOL)enabled
                withResolver:(RCTPromiseResolveBlock)resolve
                    rejecter:(RCTPromiseRejectBlock)reject;
- (void)isMicrophoneEnabledWithResolver:(RCTPromiseResolveBlock)resolve
                               rejecter:(RCTPromiseRejectBlock)reject;
- (void)dismissVideoCallWithResolver:(RCTPromiseResolveBlock)resolve
                            rejecter:(RCTPromiseRejectBlock)reject;
- (void)cancelVideoCallWithResolver:(RCTPromiseResolveBlock)resolve
                            rejecter:(RCTPromiseRejectBlock)reject;

@end
