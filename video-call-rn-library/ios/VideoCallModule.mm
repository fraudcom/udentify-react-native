#import "VideoCallModule.h"
#import "VideoCallManager.h"

@interface VideoCallModule()
@property (nonatomic, strong) VideoCallManager *videoCallManager;
@end

@implementation VideoCallModule

RCT_EXPORT_MODULE()

- (instancetype)init {
    self = [super init];
    if (self) {
        self.videoCallManager = [[VideoCallManager alloc] initWithEventEmitter:self];
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"VideoCall_onStatusChanged",
        @"VideoCall_onError", 
        @"VideoCall_onUserStateChanged",
        @"VideoCall_onParticipantStateChanged",
        @"VideoCall_onVideoCallEnded",
        @"VideoCall_onVideoCallDismissed"
    ];
}

#pragma mark - Permission Methods

RCT_EXPORT_METHOD(checkPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager checkPermissionsWithResolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(requestPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager requestPermissionsWithResolver:resolve rejecter:reject];
}

#pragma mark - Video Call Lifecycle Methods

RCT_EXPORT_METHOD(startVideoCall:(NSDictionary *)credentials
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager startVideoCallWithCredentials:credentials resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(endVideoCall:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager endVideoCallWithResolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(getVideoCallStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager getVideoCallStatusWithResolver:resolve rejecter:reject];
}

#pragma mark - Configuration Methods

RCT_EXPORT_METHOD(configureUISettings:(NSDictionary *)uiConfig
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager configureUISettings:uiConfig resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(setVideoCallConfig:(NSDictionary *)config
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager setVideoCallConfigWithConfig:config resolver:resolve rejecter:reject];
}

#pragma mark - Control Methods

RCT_EXPORT_METHOD(toggleCamera:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager toggleCameraWithResolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(switchCamera:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager switchCameraWithResolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(toggleMicrophone:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager toggleMicrophoneWithResolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(dismissVideoCall:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager dismissVideoCallWithResolver:resolve rejecter:reject];
}

#pragma mark - Event Emitter Support

RCT_EXPORT_METHOD(addListener:(NSString *)eventName) {
    // Required for RCTEventEmitter
}

RCT_EXPORT_METHOD(removeListeners:(NSInteger)count) {
    // Required for RCTEventEmitter
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeVideoCallModuleSpecJSI>(params);
}
#endif

@end
