//
//  NFCManager.h
//  NFCLibrary
//
//  Created by React Native on 01/01/25.
//

#import <Foundation/Foundation.h>

@interface NFCManager : NSObject

+ (instancetype)shared;

// NFC Status
- (void)isNFCAvailableWithCompletion:(void (^)(BOOL available, NSError * _Nullable error))completion;
- (void)isNFCEnabledWithCompletion:(void (^)(BOOL enabled, NSError * _Nullable error))completion;

// NFC Passport Reading
- (void)startNFCReadingWithCredentials:(NSDictionary *)credentials completion:(void (^)(BOOL success, NSError * _Nullable error))completion;
- (void)cancelNFCReadingWithCompletion:(void (^)(BOOL success, NSError * _Nullable error))completion;

// NFC Location
- (void)getNFCLocationWithServerURL:(NSString *)serverURL completion:(void (^)(NSDictionary * _Nullable result, NSError * _Nullable error))completion;

@end
