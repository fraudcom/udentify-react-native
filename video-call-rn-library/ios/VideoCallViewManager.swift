//  VideoCallViewManager.swift
//  video-call-rn-library
//  RCTViewManager that exposes VideoCallCameraView to JS as <VideoCallView/>,
//  mirroring mrz-rn-library's MrzCameraViewManager.

import Foundation
import UIKit
import React

/// Keeps the device screen awake for as long as a video call is on screen,
/// via a reference-counted `UIApplication.isIdleTimerDisabled`. See
/// INTERNALS-REACT.md "iOS screen-lock reference counting (VideoCallScreenLock)".
enum VideoCallScreenLock {

    // Mutated on the main thread only (see `onMain`), so it needs no
    // further synchronization.
    private static var holders = 0

    /// Disables the idle timer. Every `acquire()` must be balanced by a
    /// `release()`, or subsumed by a `releaseAll()`.
    static func acquire() {
        onMain {
            holders += 1
            apply()
        }
    }

    /// Gives back a single hold taken by `acquire()`.
    static func release() {
        onMain {
            holders = max(0, holders - 1)
            apply()
        }
    }

    /// Drops every outstanding hold. Used by the call-is-over paths, which
    /// mean the screen may sleep again no matter how many holds are open.
    static func releaseAll() {
        onMain {
            holders = 0
            apply()
        }
    }

    /// Whether the idle timer is currently being held disabled. Main thread
    /// only; exposed for debugging a screen that dims when it should not.
    static var isHeld: Bool { holders > 0 }

    private static func apply() {
        let shouldDisable = holders > 0
        guard UIApplication.shared.isIdleTimerDisabled != shouldDisable else { return }
        UIApplication.shared.isIdleTimerDisabled = shouldDisable
        print("VideoCallScreenLock - idle timer \(shouldDisable ? "disabled (screen stays on)" : "re-enabled")")
    }

    // isIdleTimerDisabled is UIKit state and must only be touched on the
    // main thread. The delegate callbacks that release the lock are already
    // main-queue, but deinit is not guaranteed to be.
    private static func onMain(_ work: @escaping () -> Void) {
        if Thread.isMainThread {
            work()
        } else {
            DispatchQueue.main.async(execute: work)
        }
    }
}

/// RN-owned subclass of the SDK's call view.
/// The SDK view has no notion of keeping the screen awake, while the Android
/// wrapper raises FLAG_KEEP_SCREEN_ON for exactly as long as the call
/// fragment is mounted. This reproduces that behaviour at the same lifecycle
class RNVideoCallCameraView: VideoCallCameraView {

    private var isHoldingScreenLock = false

    override func didMoveToWindow() {
        super.didMoveToWindow()

        // The SDK starts the call when this view gains a window and tears
        // down when it loses one, so these are the exact iOS counterparts of
        // Android's mount/teardown pair. didMoveToWindow can fire repeatedly
        // with a non-nil window (a view moving between windows), hence the
        // guard keeping holds 1:1 with attach/detach.
        if window != nil {
            guard !isHoldingScreenLock else { return }
            isHoldingScreenLock = true
            VideoCallScreenLock.acquire()
        } else {
            releaseScreenLockIfNeeded()
        }
    }

    deinit {
        releaseScreenLockIfNeeded()
    }

    private func releaseScreenLockIfNeeded() {
        guard isHoldingScreenLock else { return }
        isHoldingScreenLock = false
        VideoCallScreenLock.release()
    }
}

@objc(VideoCallViewManager)
class VideoCallViewManager: RCTViewManager {

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        return RNVideoCallCameraView()
    }
}
