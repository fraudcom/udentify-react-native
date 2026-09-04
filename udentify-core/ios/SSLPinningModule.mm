#import "SSLPinningModule.h"

#if __has_include("udentify_core-Swift.h")
#import "udentify_core-Swift.h"
#else
#import <udentify_core/udentify_core-Swift.h>
#endif

@implementation SSLPinningModule

RCT_EXPORT_MODULE(SSLPinningModule)

// Singleton instance of SSLPinningManager
static SSLPinningManager *sharedSSLPinningManager = nil;

+ (SSLPinningManager *)sharedSSLPinningManager {
    if (sharedSSLPinningManager == nil) {
        sharedSSLPinningManager = [[SSLPinningManager alloc] init];
    }
    return sharedSSLPinningManager;
}

/**
 * Load a certificate from the app bundle and set it for SSL pinning
 */
RCT_EXPORT_METHOD(loadCertificateFromAssets:(NSString *)certificateName
                  extension:(NSString *)extension
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"SSLPinningModule - loadCertificateFromAssets called: %@.%@", certificateName, extension);
    
    @try {
        SSLPinningManager *manager = [SSLPinningModule sharedSSLPinningManager];
        
        [manager loadCertificateFromAssets:certificateName
                                 extension:extension
                                completion:^(BOOL success, NSError *error) {
            if (error) {
                NSLog(@"SSLPinningModule - Error loading certificate: %@", error.localizedDescription);
                reject(@"LOAD_CERT_ERROR", error.localizedDescription, error);
            } else {
                NSLog(@"SSLPinningModule - Certificate loaded and set successfully");
                resolve(@(success));
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"SSLPinningModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

/**
 * Set SSL certificate using base64 encoded data
 */
RCT_EXPORT_METHOD(setSSLCertificateBase64:(NSString *)certificateBase64
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"SSLPinningModule - setSSLCertificateBase64 called");
    
    @try {
        SSLPinningManager *manager = [SSLPinningModule sharedSSLPinningManager];
        
        [manager setSSLCertificateBase64:certificateBase64
                              completion:^(BOOL success, NSError *error) {
            if (error) {
                NSLog(@"SSLPinningModule - Error setting certificate: %@", error.localizedDescription);
                reject(@"SET_CERT_ERROR", error.localizedDescription, error);
            } else {
                NSLog(@"SSLPinningModule - Certificate set successfully");
                resolve(@(success));
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"SSLPinningModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

/**
 * Remove the currently set SSL certificate
 */
RCT_EXPORT_METHOD(removeSSLCertificate:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"SSLPinningModule - removeSSLCertificate called");
    
    @try {
        SSLPinningManager *manager = [SSLPinningModule sharedSSLPinningManager];
        
        [manager removeSSLCertificate:^(BOOL success, NSError *error) {
            if (error) {
                NSLog(@"SSLPinningModule - Error removing certificate: %@", error.localizedDescription);
                reject(@"REMOVE_CERT_ERROR", error.localizedDescription, error);
            } else {
                NSLog(@"SSLPinningModule - Certificate removed successfully");
                resolve(@(success));
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"SSLPinningModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

/**
 * Get the currently set SSL certificate as base64 string
 */
RCT_EXPORT_METHOD(getSSLCertificateBase64:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"SSLPinningModule - getSSLCertificateBase64 called");
    
    @try {
        SSLPinningManager *manager = [SSLPinningModule sharedSSLPinningManager];
        
        [manager getSSLCertificateBase64:^(NSString *certificateBase64, NSError *error) {
            if (error) {
                NSLog(@"SSLPinningModule - Error getting certificate: %@", error.localizedDescription);
                reject(@"GET_CERT_ERROR", error.localizedDescription, error);
            } else {
                NSLog(@"SSLPinningModule - Certificate retrieved successfully");
                resolve(certificateBase64);
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"SSLPinningModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

/**
 * Check if SSL pinning is enabled
 */
RCT_EXPORT_METHOD(isSSLPinningEnabled:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"SSLPinningModule - isSSLPinningEnabled called");
    
    @try {
        SSLPinningManager *manager = [SSLPinningModule sharedSSLPinningManager];
        
        [manager isSSLPinningEnabled:^(BOOL enabled, NSError *error) {
            if (error) {
                NSLog(@"SSLPinningModule - Error checking SSL pinning status: %@", error.localizedDescription);
                reject(@"CHECK_STATUS_ERROR", error.localizedDescription, error);
            } else {
                NSLog(@"SSLPinningModule - SSL pinning enabled: %d", enabled);
                resolve(@(enabled));
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"SSLPinningModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

/**
 * 26.1.3: Fetch transaction properties (e.g. U18) for a transaction and cache them
 */
RCT_EXPORT_METHOD(fetchTransactionProperties:(NSString *)serverURL
                  transactionID:(NSString *)transactionID
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"SSLPinningModule - fetchTransactionProperties called");

    @try {
        SSLPinningManager *manager = [SSLPinningModule sharedSSLPinningManager];

        [manager fetchTransactionProperties:serverURL
                              transactionID:transactionID
                                 completion:^(NSArray<NSString *> *names, NSError *error) {
            if (error) {
                reject(@"FETCH_TRANSACTION_PROPERTIES_ERROR", error.localizedDescription, error);
            } else {
                resolve(names);
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"SSLPinningModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

/**
 * 26.1.3: Clear any cached transaction properties
 */
RCT_EXPORT_METHOD(resetTransactionProperties:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"SSLPinningModule - resetTransactionProperties called");

    @try {
        SSLPinningManager *manager = [SSLPinningModule sharedSSLPinningManager];

        [manager resetTransactionProperties:^(NSError *error) {
            if (error) {
                reject(@"RESET_TRANSACTION_PROPERTIES_ERROR", error.localizedDescription, error);
            } else {
                resolve(nil);
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"SSLPinningModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(setDeviceInfoSubPath:(NSString *)subPath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"SSLPinningModule - setDeviceInfoSubPath called: %@", subPath);

    @try {
        SSLPinningManager *manager = [SSLPinningModule sharedSSLPinningManager];

        [manager setDeviceInfoSubPath:subPath completion:^(NSError *error) {
            if (error) {
                reject(@"SET_DEVICE_INFO_SUBPATH_ERROR", error.localizedDescription, error);
            } else {
                resolve(nil);
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"SSLPinningModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getDeviceInfoSubPath:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"SSLPinningModule - getDeviceInfoSubPath called");

    @try {
        SSLPinningManager *manager = [SSLPinningModule sharedSSLPinningManager];

        [manager getDeviceInfoSubPath:^(NSString *subPath, NSError *error) {
            if (error) {
                reject(@"GET_DEVICE_INFO_SUBPATH_ERROR", error.localizedDescription, error);
            } else {
                resolve(subPath);
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"SSLPinningModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeSSLPinningModuleSpecJSI>(params);
}
#endif

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

@end

