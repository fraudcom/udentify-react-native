#import "MRZModule.h"
#import "MRZManager.h"

@implementation MRZModule

RCT_EXPORT_MODULE()

// Singleton instance of MRZManager
static MRZManager *sharedMRZManager = nil;

+ (MRZManager *)sharedMRZManager {
    if (sharedMRZManager == nil) {
        sharedMRZManager = [[MRZManager alloc] init];
    }
    return sharedMRZManager;
}

#pragma mark - TurboModule Methods

RCT_EXPORT_METHOD(checkPermissions:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    MRZManager *mrzManager = [MRZModule sharedMRZManager];
    [mrzManager checkPermissions:^(BOOL hasPermission) {
        resolve(@(hasPermission));
    }];
}

RCT_EXPORT_METHOD(requestPermissions:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    MRZManager *mrzManager = [MRZModule sharedMRZManager];
    [mrzManager requestPermissions:^(NSString *status) {
        resolve(status);
    }];
}

RCT_EXPORT_METHOD(startMrzCamera:(NSDictionary * _Nullable)customization
                         resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject)
{
    MRZManager *mrzManager = [MRZModule sharedMRZManager];
    [mrzManager startMrzCamera:customization completion:^(NSDictionary *result) {
        resolve(result);
    }];
}

RCT_EXPORT_METHOD(processMrzImage:(NSString *)imageBase64
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    MRZManager *mrzManager = [MRZModule sharedMRZManager];
    [mrzManager processMrzImage:imageBase64 completion:^(NSDictionary *result) {
        resolve(result);
    }];
}

RCT_EXPORT_METHOD(cancelMrzScanning:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    MRZManager *mrzManager = [MRZModule sharedMRZManager];
    [mrzManager cancelMrzScanning:^{
        resolve(nil);
    }];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeMRZModuleSpecJSI>(params);
}
#endif

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

@end
