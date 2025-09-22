#import "OCRModule.h"
#import "OCRManager.h"

@implementation OCRModule

RCT_EXPORT_MODULE(OCRModule)

// Singleton instance of OCRManager
static OCRManager *sharedOCRManager = nil;

+ (OCRManager *)sharedOCRManager {
    if (sharedOCRManager == nil) {
        sharedOCRManager = [[OCRManager alloc] init];
    }
    return sharedOCRManager;
}

- (instancetype)init
{
    self = [super init];
    if (self) {
        [self setupNotificationListeners];
    }
    return self;
}

- (void)setupNotificationListeners
{
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleHologramComplete:)
                                                 name:@"OCRHologramComplete"
                                               object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleHologramVideoRecorded:)
                                                 name:@"OCRHologramVideoRecorded"
                                               object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleHologramError:)
                                                 name:@"OCRHologramError"
                                               object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleOCRError:)
                                                 name:@"OCROCRError"
                                               object:nil];
}

- (void)handleHologramComplete:(NSNotification *)notification
{
    NSDictionary *result = notification.userInfo;
    [self emitHologramComplete:result];
}

- (void)handleHologramVideoRecorded:(NSNotification *)notification
{
    NSArray<NSString *> *videoUrls = notification.userInfo[@"videoUrls"];
    [self emitHologramVideoRecorded:videoUrls];
}

- (void)handleHologramError:(NSNotification *)notification
{
    NSString *errorMessage = notification.userInfo[@"message"];
    [self emitHologramError:errorMessage];
}

- (void)handleOCRError:(NSNotification *)notification
{
    NSString *errorMessage = notification.userInfo[@"message"];
    [self emitOCRError:errorMessage];
}

- (void)dealloc
{
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (NSNumber *)multiply:(double)a b:(double)b {
    NSNumber *result = @(a * b);
    return result;
}

// UI Configuration Method
RCT_EXPORT_METHOD(configureUISettings:(NSDictionary *)uiConfig
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"OCRModule - configureUISettings called with config: %@", uiConfig);
    
    @try {
        OCRManager *ocrManager = [OCRModule sharedOCRManager];
        
        // Check if method exists
        if ([ocrManager respondsToSelector:@selector(configureUISettings:completion:)]) {
            [ocrManager configureUISettings:uiConfig
                                  completion:^(BOOL success, NSError *error) {
                if (error) {
                    NSLog(@"OCRModule - UI Configuration Error: %@", error.localizedDescription);
                    reject(@"UI_CONFIG_ERROR", error.localizedDescription, error);
                } else {
                    NSLog(@"OCRModule - UI Configuration Success: %d", success);
                    resolve(@(success));
                }
            }];
        } else {
            NSLog(@"OCRModule - configureUISettings method not found!");
            reject(@"METHOD_ERROR", @"configureUISettings method not found", nil);
        }
    } @catch (NSException *exception) {
        NSLog(@"OCRModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

// OCR Methods
RCT_EXPORT_METHOD(startOCRScanning:(NSString *)serverURL
                  transactionID:(NSString *)transactionID
                  documentType:(NSString *)documentType
                  documentSide:(NSString *)documentSide
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"OCRModule - startOCRScanning called with serverURL: %@", serverURL);
    
    // Use shared OCRManager instance
    @try {
        OCRManager *ocrManager = [OCRModule sharedOCRManager];
        NSLog(@"OCRModule - Using shared OCRManager: %@", ocrManager);
        
        // Test if method exists
        if ([ocrManager respondsToSelector:@selector(startOCRScanning:transactionID:documentType:documentSide:completion:)]) {
            NSLog(@"OCRModule - Method exists, calling...");
            
            [ocrManager startOCRScanning:serverURL
                           transactionID:transactionID
                            documentType:documentType
                            documentSide:documentSide
                              completion:^(BOOL success, NSError *error) {
                if (error) {
                    NSLog(@"OCRModule - Error: %@", error.localizedDescription);
                    reject(@"OCR_ERROR", error.localizedDescription, error);
                } else {
                    NSLog(@"OCRModule - Success: %d", success);
                    // Just resolve with success - performOCR will be called separately
                    resolve(@(success));
                }
            }];
        } else {
            NSLog(@"OCRModule - Method does NOT exist!");
            reject(@"METHOD_ERROR", @"startOCRScanning method not found", nil);
        }
    } @catch (NSException *exception) {
        NSLog(@"OCRModule - Exception: %@", exception.reason);
        reject(@"EXCEPTION", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(performOCR:(NSString *)serverURL
                  transactionID:(NSString *)transactionID
                  frontSideImage:(NSString *)frontSideImage
                  backSideImage:(NSString *)backSideImage
                  documentType:(NSString *)documentType
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"OCRModule - performOCR called with serverURL: %@, transactionID: %@, documentType: %@", serverURL, transactionID, documentType);
    NSLog(@"OCRModule - Front image length: %lu, Back image length: %lu", (unsigned long)frontSideImage.length, (unsigned long)backSideImage.length);
    
    // Validate input parameters
    if (!serverURL || serverURL.length == 0) {
        NSLog(@"OCRModule - Error: Server URL is empty");
        reject(@"OCR_ERROR", @"Server URL cannot be empty", nil);
        return;
    }
    
    if (!transactionID || transactionID.length == 0) {
        NSLog(@"OCRModule - Error: Transaction ID is empty");
        reject(@"OCR_ERROR", @"Transaction ID cannot be empty", nil);
        return;
    }
    
    // Allow empty images - OCRManager will use stored images from document scan
    if ((!frontSideImage || frontSideImage.length == 0) && (!backSideImage || backSideImage.length == 0)) {
        NSLog(@"OCRModule - Empty images provided, OCRManager will use stored images from document scan");
    }
    
    OCRManager *ocrManager = [OCRModule sharedOCRManager];
    [ocrManager performOCR:serverURL
             transactionID:transactionID
            frontSideImage:frontSideImage
             backSideImage:backSideImage
              documentType:documentType
                completion:^(NSDictionary *result, NSError *error) {
        if (error) {
            reject(@"OCR_ERROR", error.localizedDescription, error);
        } else {
            resolve(result);
        }
    }];
}

RCT_EXPORT_METHOD(performDocumentLiveness:(NSString *)serverURL
                  transactionID:(NSString *)transactionID
                  frontSideImage:(NSString *)frontSideImage
                  backSideImage:(NSString *)backSideImage
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    OCRManager *ocrManager = [OCRModule sharedOCRManager];
    [ocrManager performDocumentLiveness:serverURL
                          transactionID:transactionID
                         frontSideImage:frontSideImage
                          backSideImage:backSideImage
                             completion:^(NSDictionary *result, NSError *error) {
        if (error) {
            reject(@"LIVENESS_ERROR", error.localizedDescription, error);
        } else {
            resolve(result);
        }
    }];
}

RCT_EXPORT_METHOD(performOCRAndDocumentLiveness:(NSString *)serverURL
                  transactionID:(NSString *)transactionID
                  frontSideImage:(NSString *)frontSideImage
                  backSideImage:(NSString *)backSideImage
                  documentType:(NSString *)documentType
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSLog(@"OCRModule - performOCRAndDocumentLiveness called with serverURL: %@, transactionID: %@, documentType: %@", serverURL, transactionID, documentType);
    NSLog(@"OCRModule - Front image length: %lu, Back image length: %lu", (unsigned long)frontSideImage.length, (unsigned long)backSideImage.length);
    
    // Validate input parameters
    if (!serverURL || serverURL.length == 0) {
        NSLog(@"OCRModule - Error: Server URL is empty");
        reject(@"OCR_AND_LIVENESS_ERROR", @"Server URL cannot be empty", nil);
        return;
    }
    
    if (!transactionID || transactionID.length == 0) {
        NSLog(@"OCRModule - Error: Transaction ID is empty");
        reject(@"OCR_AND_LIVENESS_ERROR", @"Transaction ID cannot be empty", nil);
        return;
    }
    
    if (!documentType || documentType.length == 0) {
        NSLog(@"OCRModule - Error: Document type is empty");
        reject(@"OCR_AND_LIVENESS_ERROR", @"Document type cannot be empty", nil);
        return;
    }
    
    // Allow empty images - OCRManager will use stored images from document scan
    if ((!frontSideImage || frontSideImage.length == 0) && (!backSideImage || backSideImage.length == 0)) {
        NSLog(@"OCRModule - Empty images provided, OCRManager will use stored images from document scan");
    }
    
    OCRManager *ocrManager = [OCRModule sharedOCRManager];
    [ocrManager performOCRAndDocumentLiveness:serverURL
                                transactionID:transactionID
                               frontSideImage:frontSideImage
                                backSideImage:backSideImage
                                 documentType:documentType
                                   completion:^(NSDictionary *result, NSError *error) {
        if (error) {
            reject(@"OCR_AND_LIVENESS_ERROR", error.localizedDescription, error);
        } else {
            resolve(result);
        }
    }];
}

RCT_EXPORT_METHOD(startHologramCamera:(NSString *)serverURL
                  transactionID:(NSString *)transactionID
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    OCRManager *ocrManager = [OCRModule sharedOCRManager];
    [ocrManager startHologramCamera:serverURL
                      transactionID:transactionID
                         completion:^(BOOL success, NSError *error) {
        if (error) {
            reject(@"HOLOGRAM_ERROR", error.localizedDescription, error);
        } else {
            resolve(@(success));
        }
    }];
}

RCT_EXPORT_METHOD(performHologramCheck:(NSString *)serverURL
                  transactionID:(NSString *)transactionID
                  videoUrls:(NSArray<NSString *> *)videoUrls
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    OCRManager *ocrManager = [OCRModule sharedOCRManager];
    [ocrManager performHologramCheck:serverURL
                       transactionID:transactionID
                           videoUrls:videoUrls
                          completion:^(NSDictionary *result, NSError *error) {
        if (error) {
            reject(@"HOLOGRAM_ERROR", error.localizedDescription, error);
        } else {
            resolve(result);
        }
    }];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeOCRModuleSpecJSI>(params);
}
#endif

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

// MARK: - Event Emitter Support

- (NSArray<NSString *> *)supportedEvents
{
    return @[@"onOCRComplete", @"onOCRError", @"onHologramComplete", @"onHologramVideoRecorded", @"onHologramError"];
}

- (void)emitHologramComplete:(NSDictionary *)result
{
    NSLog(@"OCRModule - Emitting onHologramComplete event");
    [self sendEventWithName:@"onHologramComplete" body:result];
}

- (void)emitHologramVideoRecorded:(NSArray<NSString *> *)videoUrls
{
    NSLog(@"OCRModule - Emitting onHologramVideoRecorded event");
    NSDictionary *params = @{@"videoUrls": videoUrls};
    [self sendEventWithName:@"onHologramVideoRecorded" body:params];
}

- (void)emitHologramError:(NSString *)error
{
    NSLog(@"OCRModule - Emitting onHologramError event");
    NSDictionary *params = @{@"message": error};
    [self sendEventWithName:@"onHologramError" body:params];
}

- (void)emitOCRComplete:(NSDictionary *)result
{
    NSLog(@"OCRModule - Emitting onOCRComplete event");
    [self sendEventWithName:@"onOCRComplete" body:result];
}

- (void)emitOCRError:(NSString *)error
{
    NSLog(@"OCRModule - Emitting onOCRError event");
    NSDictionary *params = @{@"message": error};
    [self sendEventWithName:@"onOCRError" body:params];
}

@end
