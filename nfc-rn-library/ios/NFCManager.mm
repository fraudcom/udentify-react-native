//
//  NFCManager.mm
//  NFCLibrary
//
//  Objective-C++ implementation that wraps Swift NFCManager functionality
//

#import "NFCManager.h"
#import <Foundation/Foundation.h>

// Import the generated Swift interface header
#if __has_include("nfc_rn_library-Swift.h")
#import "nfc_rn_library-Swift.h"
#endif

// Forward declare the Swift class - this will be linked at runtime
@interface NFCManagerSwift : NSObject
+ (instancetype)shared;
- (void)isNFCAvailableWithCompletion:(void (^)(BOOL available, NSError * _Nullable error))completion;
- (void)isNFCEnabledWithCompletion:(void (^)(BOOL enabled, NSError * _Nullable error))completion;
- (void)startNFCReadingWithCredentials:(NSDictionary *)credentials completion:(void (^)(BOOL success, NSError * _Nullable error))completion;
- (void)cancelNFCReadingWithCompletion:(void (^)(BOOL success, NSError * _Nullable error))completion;
- (void)getNFCLocationWithServerURL:(NSString *)serverURL completion:(void (^)(NSDictionary * _Nullable result, NSError * _Nullable error))completion;
@end

@implementation NFCManager

+ (instancetype)shared {
    static NFCManager *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[NFCManager alloc] init];
    });
    return sharedInstance;
}

// Helper method to get Swift class with fallback names
- (Class)getSwiftNFCManagerClass {
    Class swiftClass = NSClassFromString(@"nfc_rn_library.NFCManagerSwift");
    if (!swiftClass) {
        swiftClass = NSClassFromString(@"NFCManagerSwift");
    }
    if (!swiftClass) {
        swiftClass = NSClassFromString(@"nfc-rn-library.NFCManagerSwift");
    }
    return swiftClass;
}

- (void)isNFCAvailableWithCompletion:(void (^)(BOOL available, NSError * _Nullable error))completion {
    Class swiftClass = [self getSwiftNFCManagerClass];
    if (swiftClass) {
        NFCManagerSwift *swiftManager = [swiftClass shared];
        [swiftManager isNFCAvailableWithCompletion:completion];
    } else {
        NSError *error = [NSError errorWithDomain:@"NFCManager" 
                                             code:-1 
                                         userInfo:@{NSLocalizedDescriptionKey: @"Swift NFC implementation not available"}];
        completion(NO, error);
    }
}

- (void)isNFCEnabledWithCompletion:(void (^)(BOOL enabled, NSError * _Nullable error))completion {
    Class swiftClass = [self getSwiftNFCManagerClass];
    if (swiftClass) {
        NFCManagerSwift *swiftManager = [swiftClass shared];
        [swiftManager isNFCEnabledWithCompletion:completion];
    } else {
        NSError *error = [NSError errorWithDomain:@"NFCManager" 
                                             code:-1 
                                         userInfo:@{NSLocalizedDescriptionKey: @"Swift NFC implementation not available"}];
        completion(NO, error);
    }
}

- (void)startNFCReadingWithCredentials:(NSDictionary *)credentials completion:(void (^)(BOOL success, NSError * _Nullable error))completion {
    Class swiftClass = [self getSwiftNFCManagerClass];
    if (swiftClass) {
        NFCManagerSwift *swiftManager = [swiftClass shared];
        [swiftManager startNFCReadingWithCredentials:credentials completion:completion];
    } else {
        NSError *error = [NSError errorWithDomain:@"NFCManager" 
                                             code:-1 
                                         userInfo:@{NSLocalizedDescriptionKey: @"Swift NFC implementation not available"}];
        completion(NO, error);
    }
}

- (void)cancelNFCReadingWithCompletion:(void (^)(BOOL success, NSError * _Nullable error))completion {
    Class swiftClass = [self getSwiftNFCManagerClass];
    if (swiftClass) {
        NFCManagerSwift *swiftManager = [swiftClass shared];
        [swiftManager cancelNFCReadingWithCompletion:completion];
    } else {
        NSError *error = [NSError errorWithDomain:@"NFCManager" 
                                             code:-1 
                                         userInfo:@{NSLocalizedDescriptionKey: @"Swift NFC implementation not available"}];
        completion(NO, error);
    }
}

- (void)getNFCLocationWithServerURL:(NSString *)serverURL completion:(void (^)(NSDictionary * _Nullable result, NSError * _Nullable error))completion {
    Class swiftClass = [self getSwiftNFCManagerClass];
    if (swiftClass) {
        NFCManagerSwift *swiftManager = [swiftClass shared];
        [swiftManager getNFCLocationWithServerURL:serverURL completion:completion];
    } else {
        NSError *error = [NSError errorWithDomain:@"NFCManager" 
                                             code:-1 
                                         userInfo:@{NSLocalizedDescriptionKey: @"Swift NFC implementation not available"}];
        completion(nil, error);
    }
}

@end
