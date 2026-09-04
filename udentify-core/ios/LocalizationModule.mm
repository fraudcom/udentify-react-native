#import "LocalizationModule.h"

#if __has_include("udentify_core-Swift.h")
#import "udentify_core-Swift.h"
#else
#import <udentify_core/udentify_core-Swift.h>
#endif

@implementation LocalizationModule

RCT_EXPORT_MODULE(LocalizationModule)

// Singleton instance of LocalizationManager
static LocalizationManager *sharedLocalizationManager = nil;

+ (LocalizationManager *)sharedLocalizationManager {
    if (sharedLocalizationManager == nil) {
        sharedLocalizationManager = [[LocalizationManager alloc] init];
    }
    return sharedLocalizationManager;
}

/**
 * Instantiate server-based localization
 */
RCT_EXPORT_METHOD(instantiateServerBasedLocalization:(NSString *)language
                  serverUrl:(NSString *)serverUrl
                  transactionId:(NSString *)transactionId
                  requestTimeout:(double)requestTimeout
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"LocalizationModule - instantiateServerBasedLocalization called for language: %@", language);
    
    @try {
        LocalizationManager *manager = [LocalizationModule sharedLocalizationManager];
        
        [manager instantiateServerBasedLocalizationWithLanguage:language
                                                      serverUrl:serverUrl
                                                  transactionId:transactionId
                                                 requestTimeout:requestTimeout
                                                     completion:^(NSError *error) {
            if (error) {
                NSLog(@"LocalizationModule - Error: %@", error.localizedDescription);
                reject(@"LOCALIZATION_ERROR", error.localizedDescription, error);
            } else {
                NSLog(@"LocalizationModule - Localization instantiated successfully");
                resolve([NSNull null]);
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"LocalizationModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

/**
 * Get the localization map
 */
RCT_EXPORT_METHOD(getLocalizationMap:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"LocalizationModule - getLocalizationMap called");
    
    @try {
        LocalizationManager *manager = [LocalizationModule sharedLocalizationManager];
        
        [manager getLocalizationMap:^(NSDictionary<NSString *, NSString *> *localizationMap, NSError *error) {
            if (error) {
                NSLog(@"LocalizationModule - Error: %@", error.localizedDescription);
                reject(@"GET_MAP_ERROR", error.localizedDescription, error);
            } else if (localizationMap) {
                NSLog(@"LocalizationModule - Localization map retrieved");
                resolve(localizationMap);
            } else {
                NSLog(@"LocalizationModule - No localization map available");
                resolve([NSNull null]);
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"LocalizationModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

/**
 * Clear localization cache for a specific language
 */
RCT_EXPORT_METHOD(clearLocalizationCache:(NSString *)language
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"LocalizationModule - clearLocalizationCache called for language: %@", language);
    
    @try {
        LocalizationManager *manager = [LocalizationModule sharedLocalizationManager];
        
        [manager clearLocalizationCacheWithLanguage:language
                                         completion:^(NSError *error) {
            if (error) {
                NSLog(@"LocalizationModule - Error: %@", error.localizedDescription);
                reject(@"CLEAR_CACHE_ERROR", error.localizedDescription, error);
            } else {
                NSLog(@"LocalizationModule - Cache cleared successfully");
                resolve([NSNull null]);
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"LocalizationModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

/**
 * Map system language to enum
 */
RCT_EXPORT_METHOD(mapSystemLanguageToEnum:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"LocalizationModule - mapSystemLanguageToEnum called");
    
    @try {
        LocalizationManager *manager = [LocalizationModule sharedLocalizationManager];
        
        [manager mapSystemLanguageToEnum:^(NSString *language, NSError *error) {
            if (error) {
                NSLog(@"LocalizationModule - Error: %@", error.localizedDescription);
                reject(@"MAP_LANGUAGE_ERROR", error.localizedDescription, error);
            } else if (language) {
                NSLog(@"LocalizationModule - System language mapped to: %@", language);
                resolve(language);
            } else {
                NSLog(@"LocalizationModule - Could not map system language");
                resolve([NSNull null]);
            }
        }];
    } @catch (NSException *exception) {
        NSLog(@"LocalizationModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeLocalizationModuleSpecJSI>(params);
}
#endif

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

@end


