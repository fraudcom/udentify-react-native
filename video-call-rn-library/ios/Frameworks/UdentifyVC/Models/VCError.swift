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
    /// The permission has not been asked for yet - the host app should request it before
    /// mounting the call view. This SDK checks the media permissions but never requests them.
    case cameraPermissionRequired
    case api(String)
    case other(Error)
    /// The permission was refused, or is unavailable because of a restriction (parental
    /// controls, MDM). Requesting again will not show a prompt; the host app has to send the
    /// user to Settings.
    case cameraPermissionDenied
    /// See `cameraPermissionRequired`.
    case microphonePermissionRequired
    /// See `cameraPermissionDenied`.
    case microphonePermissionDenied
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
        case .microphonePermissionRequired:
            return "ERR_MICROPHONE_PERMISSION_REQUIRED"
        case .microphonePermissionDenied:
            return "ERR_MICROPHONE_PERMISSION_DENIED"
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
        case .microphonePermissionRequired:
            return "Error occured. Microphone permission is required."
        case .microphonePermissionDenied:
            return "Error occured. Microphone permission is denied."
        case let .other(error):
            return "Other Error occured. Error: \(error)"
        }
    }
}
