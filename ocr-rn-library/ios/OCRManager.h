//
//  OCRManager.h
//  OCRLibrary
//
//  Created by Fraud.com on 04/02/25.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface OCRManager : NSObject

// UI Configuration Methods
- (void)configureUISettings:(NSDictionary *)uiConfig
                 completion:(void (^)(BOOL success, NSError * _Nullable error))completion;

// OCR Methods
- (void)startOCRScanning:(NSString *)serverURL
           transactionID:(NSString *)transactionID
            documentType:(NSString *)documentType
            documentSide:(NSString *)documentSide
              completion:(void (^)(BOOL success, NSError * _Nullable error))completion;

- (void)performOCR:(NSString *)serverURL
     transactionID:(NSString *)transactionID
    frontSideImage:(NSString *)frontSideImage
     backSideImage:(NSString *)backSideImage
      documentType:(NSString *)documentType
        completion:(void (^)(NSDictionary * _Nullable result, NSError * _Nullable error))completion;

- (void)performDocumentLiveness:(NSString *)serverURL
                  transactionID:(NSString *)transactionID
                 frontSideImage:(NSString *)frontSideImage
                  backSideImage:(NSString *)backSideImage
                     completion:(void (^)(NSDictionary * _Nullable result, NSError * _Nullable error))completion;

- (void)performOCRAndDocumentLiveness:(NSString *)serverURL
                        transactionID:(NSString *)transactionID
                       frontSideImage:(NSString *)frontSideImage
                        backSideImage:(NSString *)backSideImage
                         documentType:(NSString *)documentType
                           completion:(void (^)(NSDictionary * _Nullable result, NSError * _Nullable error))completion;

// Hologram Methods
- (void)startHologramCamera:(NSString *)serverURL
              transactionID:(NSString *)transactionID
                 completion:(void (^)(BOOL success, NSError * _Nullable error))completion;

- (void)performHologramCheck:(NSString *)serverURL
               transactionID:(NSString *)transactionID
                   videoUrls:(NSArray<NSString *> *)videoUrls
                  completion:(void (^)(NSDictionary * _Nullable result, NSError * _Nullable error))completion;

@end

NS_ASSUME_NONNULL_END
