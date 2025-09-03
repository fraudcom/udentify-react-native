//
//  NFCModule.mm
//  NFCLibrary
//
//  Created by React Native on 01/01/25.
//

#import "NFCModule.h"
#import "NFCManager.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNNFCLibrarySpec.h"
#endif

// Import the Swift class properly
@interface NFCManagerSwift : NSObject
+ (instancetype)shared;
- (void)isNFCAvailableWithCompletion:(void (^)(BOOL available, NSError * _Nullable error))completion;
- (void)isNFCEnabledWithCompletion:(void (^)(BOOL enabled, NSError * _Nullable error))completion;
- (void)startNFCReadingWithCredentials:(NSDictionary *)credentials completion:(void (^)(NSDictionary * _Nullable result, NSError * _Nullable error))completion;
- (void)cancelNFCReadingWithCompletion:(void (^)(BOOL success, NSError * _Nullable error))completion;
- (void)getNFCLocationWithServerURL:(NSString *)serverURL completion:(void (^)(NSDictionary * _Nullable result, NSError * _Nullable error))completion;
@end

#ifdef RCT_NEW_ARCH_ENABLED
@interface NFCModule () <NativeNFCModuleSpec>
@end
#endif

@implementation NFCModule

RCT_EXPORT_MODULE(NFCModule)

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

// MARK: - NFC Status Methods

RCT_EXPORT_METHOD(isNFCAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [[NFCManagerSwift shared] isNFCAvailableWithCompletion:^(BOOL available, NSError * _Nullable error) {
        if (error) {
            reject(@"NFC_ERROR", error.localizedDescription, error);
        } else {
            resolve(@(available));
        }
    }];
}

RCT_EXPORT_METHOD(isNFCEnabled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [[NFCManagerSwift shared] isNFCEnabledWithCompletion:^(BOOL enabled, NSError * _Nullable error) {
        if (error) {
            reject(@"NFC_ERROR", error.localizedDescription, error);
        } else {
            resolve(@(enabled));
        }
    }];
}

// MARK: - NFC Reading Methods

RCT_EXPORT_METHOD(startNFCReading:(NSDictionary *)credentials
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [[NFCManagerSwift shared] startNFCReadingWithCredentials:credentials completion:^(NSDictionary * _Nullable result, NSError * _Nullable error) {
        if (error) {
            reject(@"NFC_ERROR", error.localizedDescription, error);
        } else {
            resolve(result ?: @{});
        }
    }];
}

RCT_EXPORT_METHOD(cancelNFCReading:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [[NFCManagerSwift shared] cancelNFCReadingWithCompletion:^(BOOL success, NSError * _Nullable error) {
        if (error) {
            reject(@"NFC_ERROR", error.localizedDescription, error);
        } else {
            resolve(@(success));
        }
    }];
}

// MARK: - NFC Location Methods

RCT_EXPORT_METHOD(getNFCLocation:(NSString *)serverURL
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [[NFCManagerSwift shared] getNFCLocationWithServerURL:serverURL completion:^(NSDictionary * _Nullable result, NSError * _Nullable error) {
        if (error) {
            reject(@"NFC_ERROR", error.localizedDescription, error);
        } else {
            resolve(result ?: @{});
        }
    }];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeNFCModuleSpecJSI>(params);
}
#endif

@end
