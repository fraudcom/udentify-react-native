//
//  MrzCameraViewManager.swift
//  MRZLibrary
//
//  RCTViewManager that exposes MrzCameraView to JS as <MrzCameraView/>.
//

import Foundation
import UIKit

@objc(MrzCameraViewManager)
class MrzCameraViewManager: RCTViewManager {

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        return MrzCameraView()
    }
}
