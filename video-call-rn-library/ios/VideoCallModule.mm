#import "VideoCallModule.h"
#import "VideoCallManager.h"

@interface VideoCallModule()
@property (nonatomic, strong) VideoCallManager *videoCallManager;
@property (nonatomic, assign) BOOL hasListeners;
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
        @"VideoCall_onVideoCallDismissed",
        @"VideoCall_onPhoneCallStateChanged",
        @"VideoCall_onScreenLocked",
        @"VideoCall_onScreenUnlocked",
        @"VideoCall_onMicrophoneStateChanged"
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

RCT_EXPORT_METHOD(getLocalizedStrings:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager getLocalizedStringsWithResolver:resolve rejecter:reject];
}

#pragma mark - Control Methods

RCT_EXPORT_METHOD(toggleMicrophone:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager toggleMicrophoneWithResolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(setMicrophoneEnabled:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager setMicrophoneEnabled:enabled withResolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(isMicrophoneEnabled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager isMicrophoneEnabledWithResolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(dismissVideoCall:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager dismissVideoCallWithResolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(cancelVideoCall:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [self.videoCallManager cancelVideoCallWithResolver:resolve rejecter:reject];
}

#pragma mark - Event Emitter Support

// addListener:/removeListeners: are already exported by RCTEventEmitter and
// keep its internal listener count - overriding them with empty bodies left
// that count at zero, which made the base class drop every VideoCall_* event.
// Only the observation hooks are overridden here.

- (void)startObserving {
    self.hasListeners = YES;
}

- (void)stopObserving {
    self.hasListeners = NO;
}

- (void)sendEventWithName:(NSString *)eventName body:(id)body {
    if (self.hasListeners) {
        [super sendEventWithName:eventName body:body];
    }
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeVideoCallModuleSpecJSI>(params);
}
#endif

@end
