//
//  LivenessModule.mm
//  liveness-rn-library
//
//  Created by Liveness RN Library on 2024-01-01.
//

#import "LivenessModule.h"
#import "LivenessManager.h"

@interface LivenessModule ()
@property (nonatomic, strong) LivenessManager *livenessManager;
@end

@implementation LivenessModule

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _livenessManager = [[LivenessManager alloc] initWithEventEmitter:self];
    }
    return self;
}

- (NSArray<NSString *> *)supportedEvents
{
    return @[
        @"onFaceRecognitionResult",
        @"onFaceRecognitionFailure", 
        @"onFaceRecognitionError",
        @"onPhotoTaken",
        @"onSelfieTaken",
        @"onActiveLivenessResult",
        @"onActiveLivenessFailure",
        @"onWillDismiss",
        @"onDidDismiss",
        @"onBackButtonPressed",
        @"onVideoTaken"
    ];
}

// MARK: - Permission Management

RCT_EXPORT_METHOD(checkPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager checkPermissions:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(requestPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager requestPermissions:resolve rejecter:reject];
}

// MARK: - Camera-based Face Recognition

RCT_EXPORT_METHOD(startFaceRecognitionRegistration:(NSDictionary *)credentials
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager startFaceRecognitionRegistration:credentials resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(startFaceRecognitionAuthentication:(NSDictionary *)credentials
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager startFaceRecognitionAuthentication:credentials resolver:resolve rejecter:reject];
}

// MARK: - Liveness Detection

RCT_EXPORT_METHOD(startActiveLiveness:(NSDictionary *)credentials
                  isAuthentication:(BOOL)isAuthentication
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager startActiveLiveness:credentials isAuthentication:isAuthentication resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(startHybridLiveness:(NSDictionary *)credentials
                  isAuthentication:(BOOL)isAuthentication
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager startHybridLiveness:credentials isAuthentication:isAuthentication resolver:resolve rejecter:reject];
}

// MARK: - Selfie Capture

RCT_EXPORT_METHOD(startSelfieCapture:(NSDictionary *)credentials
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager startSelfieCapture:credentials resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(performFaceRecognitionWithSelfie:(NSDictionary *)credentials
                  base64Image:(NSString *)base64Image
                  isAuthentication:(BOOL)isAuthentication
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager performFaceRecognitionWithSelfie:credentials base64Image:base64Image isAuthentication:isAuthentication resolver:resolve rejecter:reject];
}

// MARK: - Photo-based Recognition

RCT_EXPORT_METHOD(registerUserWithPhoto:(NSDictionary *)credentials
                  base64Image:(NSString *)base64Image
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager registerUserWithPhoto:credentials base64Image:base64Image resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(authenticateUserWithPhoto:(NSDictionary *)credentials
                  base64Image:(NSString *)base64Image
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager authenticateUserWithPhoto:credentials base64Image:base64Image resolver:resolve rejecter:reject];
}

// MARK: - Face Recognition Control

RCT_EXPORT_METHOD(cancelFaceRecognition:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager cancelFaceRecognition:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(isFaceRecognitionInProgress:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager isFaceRecognitionInProgress:resolve rejecter:reject];
}

// MARK: - List Operations

RCT_EXPORT_METHOD(addUserToList:(NSString *)serverURL
                  transactionId:(NSString *)transactionId
                  status:(NSString *)status
                  metadata:(NSDictionary * _Nullable)metadata
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager addUserToList:serverURL transactionId:transactionId status:status metadata:metadata resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(startFaceRecognitionIdentification:(NSString *)serverURL
                  transactionId:(NSString *)transactionId
                  listName:(NSString *)listName
                  logLevel:(NSString * _Nullable)logLevel
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager startFaceRecognitionIdentification:serverURL transactionId:transactionId listName:listName logLevel:logLevel resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(deleteUserFromList:(NSString *)serverURL
                  transactionId:(NSString *)transactionId
                  listName:(NSString *)listName
                  photoBase64:(NSString *)photoBase64
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager deleteUserFromList:serverURL transactionId:transactionId listName:listName photoBase64:photoBase64 resolver:resolve rejecter:reject];
}

// MARK: - UI Configuration

RCT_EXPORT_METHOD(configureUISettings:(NSDictionary *)settings
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager configureUISettings:settings resolver:resolve rejecter:reject];
}

RCT_EXPORT_METHOD(setLocalization:(NSString *)languageCode
                  customStrings:(NSDictionary * _Nullable)customStrings
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self.livenessManager setLocalization:languageCode customStrings:customStrings resolver:resolve rejecter:reject];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeLivenessModuleSpecJSI>(params);
}
#endif

@end
