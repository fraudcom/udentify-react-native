//
//  LivenessManager.h
//  liveness-rn-library
//
//  Created by Liveness RN Library on 2024-01-01.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

NS_ASSUME_NONNULL_BEGIN

@interface LivenessManager : NSObject

@property (nonatomic, weak) RCTEventEmitter *eventEmitter;

- (instancetype)initWithEventEmitter:(RCTEventEmitter *)eventEmitter;

// Permission management
- (void)checkPermissions:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)requestPermissions:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;

// Camera-based face recognition
- (void)startFaceRecognitionRegistration:(NSDictionary *)credentials resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)startFaceRecognitionAuthentication:(NSDictionary *)credentials resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;

// Liveness detection
- (void)startActiveLiveness:(NSDictionary *)credentials isAuthentication:(BOOL)isAuthentication resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)startHybridLiveness:(NSDictionary *)credentials isAuthentication:(BOOL)isAuthentication resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;

// Selfie capture functionality
- (void)startSelfieCapture:(NSDictionary *)credentials resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)performFaceRecognitionWithSelfie:(NSDictionary *)credentials base64Image:(NSString *)base64Image isAuthentication:(BOOL)isAuthentication resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;

// Photo-based recognition
- (void)registerUserWithPhoto:(NSDictionary *)credentials base64Image:(NSString *)base64Image resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)authenticateUserWithPhoto:(NSDictionary *)credentials base64Image:(NSString *)base64Image resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;

// Face recognition control
- (void)cancelFaceRecognition:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)isFaceRecognitionInProgress:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;

// List operations
- (void)addUserToList:(NSString *)serverURL transactionId:(NSString *)transactionId status:(NSString *)status metadata:(NSDictionary * _Nullable)metadata resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)startFaceRecognitionIdentification:(NSString *)serverURL transactionId:(NSString *)transactionId listName:(NSString *)listName logLevel:(NSString * _Nullable)logLevel resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)deleteUserFromList:(NSString *)serverURL transactionId:(NSString *)transactionId listName:(NSString *)listName photoBase64:(NSString *)photoBase64 resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;

// UI configuration
- (void)configureUISettings:(NSDictionary *)settings resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)setLocalization:(NSString *)languageCode customStrings:(NSDictionary * _Nullable)customStrings resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;

@end

NS_ASSUME_NONNULL_END
