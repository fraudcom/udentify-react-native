//
//  VCError.swift
//  UdentifyVC
//
//  Created by Sercan Çobanoğlu on 14.02.2025.
//

import UIKit
import UdentifyCommons

public enum VCError : Error{
    
    case transactionIDMissing
    case serverURLMissing
    case cameraPermissionRequired
    case api(String)
    case other(Error)
    case cameraPermissionDenied
}

extension VCError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case let .api(message):
            return message
        case .transactionIDMissing:
            return "ERR_TRANSACTION_ID_MISSING"
        case .serverURLMissing:
            return "ERR_SERVER_URL_MISSING"
        case .cameraPermissionRequired:
            return "ERR_CAMERA_PERMISSION_REQUIRED"
        case .cameraPermissionDenied:
            return "ERR_CAMERA_PERMISSION_DENIED"
        case let .other(error):
            return "Other Error occured. Error: \(error)"
        }
    }
    
    
    public var causeDescription: String? {
        switch self {
        case let .api(message):
            return "Api Error occured. Error message: \(message)"
        case .transactionIDMissing:
            return "Error occured. Transaction id is missing."
        case .serverURLMissing:
            return "Error occured. Server url is missing."
        case .cameraPermissionRequired:
            return "Error occured. Camera permission is required."
        case .cameraPermissionDenied:
            return "Error occured. Camera permission is denied."
        case let .other(error):
            return "Other Error occured. Error: \(error)"
        }
    }
}
