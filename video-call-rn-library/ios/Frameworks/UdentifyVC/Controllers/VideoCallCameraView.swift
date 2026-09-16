////
////  VideoCallCameraView.swift
////  UdentifyVC
////
////  Originally VCCameraController.swift, created by Sercan Çobanoğlu on 30.01.2025.
////  Converted from a full-screen UIViewController into an embeddable UIView so it
////  can be mounted as a React Native native component (<VideoCallView/>) instead of
////  being presented modally - see VideoCallViewManager.swift.
////

import UIKit
import UdentifyCommons
import LiveKitClient
import AVFoundation
import CallKit

// MARK: - Delegate Protocol

public protocol VCCameraControllerDelegate: AnyObject {
    func cameraController(_ controller: VideoCallCameraView, didChangeUserState state: UserState)
    func cameraController(_ controller: VideoCallCameraView, participantType: ParticipantType, didChangeState state: ParticipantState)
    func cameraController(_ controller: VideoCallCameraView, didFailWithError error: Error)
    func cameraControllerDidDismiss(_ controller: VideoCallCameraView)
    func cameraControllerDidEndSessionSuccessfully(_ controller: VideoCallCameraView)
    func cameraController(_ controller: VideoCallCameraView, didChangePhoneCallState state: PhoneCallState)

    func onScreenLocked()
    func onScreenUnlocked()
}

public extension VCCameraControllerDelegate {
    func cameraController(_ controller: VideoCallCameraView, didChangePhoneCallState state: PhoneCallState) {}
    func onScreenLocked() {}
    func onScreenUnlocked() {}
}

public enum UserState {
    case initiating
    case tokenFetching
    case tokenFetched
    case connecting
    case connected
    case disconnected
    case reconnecting
}

public enum ParticipantState {
    case connected
    case videoTrackActivated
    case videoTrackPaused
    case disconnected
}

public enum ParticipantType {
    case agent
    case supervisor
}

public enum PhoneCallState {
    case incoming
    case outgoing
    case connected
    case ended
}

// MARK: - VideoCallCameraView
public class VideoCallCameraView: UIView {

    // MARK: - Properties
    public weak var delegate: VCCameraControllerDelegate?
    private static weak var currentInstance: VideoCallCameraView?
    /// Called on the main actor with `true` when the microphone becomes enabled, for every
    /// source: the mute button, the agent's signals and `setMicrophoneEnabled(_:)`.
    ///
    /// Type-level rather than per-instance because the SDK exposes the microphone controls
    /// the same way, so nothing holding a view reference is needed to observe them. Nothing
    /// clears it on its own - startIfReady() installs it and teardown() drops it, so it can
    /// never outlive the call it reports on.
    public static var onMicrophoneStateChanged: ((Bool) -> Void)?
    private var lastNotifiedMicrophoneEnabled: Bool?

    private var activeTasks = [TaskEntry]()
    private var remoteParticipants: [RemoteParticipant] = []
    private var currentSettings: VCSettings = VCSettings()

    @MainActor private var currentState: UserState {
        didSet {
            if oldValue != currentState {
                delegate?.cameraController(self, didChangeUserState: currentState)
            }
        }
    }

    // Populated from the `credentials` prop once it carries all required
    // fields - see startIfReady(). Empty/default until then.
    private var serverURL: String = ""
    private var wsURL: String = ""
    private var transactionID: String = ""
    private var username: String = ""
    private var idleTimeout: Int = 100

    private var isMuted: Bool = false
    private var isSwitchedToRearCamera: Bool = false
    private var isDismissalInProgress = false
    /// The mute state from just before the app was backgrounded, or `nil` when media is not
    /// suspended. Doubles as the "is suspended" flag, so the handlers cannot double-apply.
    ///
    /// Stored rather than recomputed because backgrounding mutes the microphone itself: without
    /// it, coming back would unmute a user who had deliberately muted, or one the agent muted
    /// with `CLIENT_MICROPHONE_MUTE_SIGNAL`.
    private var muteStateBeforeBackground: Bool?
    /// Remote audio publications unsubscribed for the duration of a background, so exactly that
    /// set is restored on return - a participant that joined or left meanwhile must not be
    /// silently re-subscribed, or left unsubscribed.
    private var suspendedRemoteAudioPublications: [RemoteTrackPublication] = []
    /// True once the call-initiation countdown has finished - the call is actually running,
    /// not just joined to the room. The Android SDK's `isCallStarted`.
    private var hasCallStarted = false
    public var roomName: String?

    // MARK: - Call Observer (CallKit)
    /// Observes phone/VoIP call activity on the device (cellular, FaceTime, or other CallKit-based
    /// VoIP apps) so the host app can be notified via `cameraController(_:didChangePhoneCallState:)`.
    private lazy var callObserver = CXCallObserver()
    /// Tracks whether we currently believe a call is in progress, so we can synthesize a
    /// missed `.ended` notification if the app was suspended in the background (e.g. the
    /// system's full-screen call UI took over after the call was answered) and CallKit's
    /// `callObserver(_:callChanged:)` event never reached us.
    private var isTrackingActivePhoneCall = false

    // MARK: - Idle Timer
    /// Holds the app's `isIdleTimerDisabled` value from before the video call started,
    /// so it can be restored exactly as it was once the call ends.
    private var previousIdleTimerDisabledState: Bool = false
    /// True only while THIS instance is the one holding the idle timer disabled.
    /// Prevents teardown from guessing based on the current global state, which could
    /// be wrong if this instance never started, or if a newer call has since started.
    private var hasDisabledIdleTimer = false

    // Guards against re-entering the connect flow multiple times while
    // already connecting/connected. Reset on teardown so a fresh window
    // attachment (or new credentials) can start a new call.
    private var hasStartedConnecting = false

    // Bridges this view's delegate callbacks to VideoCall_on* RCTEventEmitter
    // events, created once real credentials arrive - see startIfReady().
    private var operatorBridge: VideoCallOperatorImpl?

    // MARK: - RN-bridgeable props
    // Both are single dictionary props (rather than one prop per field) to
    // match VideoCallCredentials/VideoCallConfig's JS shape 1:1.
    @objc public var credentials: NSDictionary? {
        didSet { startIfReady() }
    }
    @objc public var config: NSDictionary? {
        didSet { startIfReady() }
    }

    // MARK: - Countdown Properties
    private var countdownTimer: Timer? {
        didSet {
            if countdownTimer == nil {
                countdownSeconds = 0
            }
        }
    }
    private var waitTimeInSeconds = 3
    private var countdownSeconds = 0

    // MARK: - LiveKit
    private lazy var room: Room = .init(delegate: self)

    // MARK: - Video Views
    private lazy var remoteVideoView: VideoView = {
        let v = VideoView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = currentSettings.backgroundColor
        v.contentMode = .scaleAspectFit
        return v
    }()

    private lazy var localVideoView: VideoView = {
        let v = VideoView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = currentSettings.pipViewStyle.backgroundColor
        v.contentMode = .scaleAspectFit
        v.layer.cornerRadius = currentSettings.pipViewStyle.cornerRadius
        v.layer.borderColor = currentSettings.pipViewStyle.borderColor.cgColor
        v.layer.borderWidth = currentSettings.pipViewStyle.borderWidth
        v.layer.masksToBounds = true

        return v
    }()

    // MARK: - Waiting Screen UI
    private lazy var waitingScreenLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.textAlignment = currentSettings.instructionLabelStyle.textAlignment
        label.numberOfLines = currentSettings.instructionLabelStyle.numberOfLines
        label.lineBreakMode = currentSettings.instructionLabelStyle.lineBreakMode
        return label
    }()

    // The label's own text, kept so applyInstructionLabelStyle() can re-render
    // it with a new font/color without needing the call flow to re-supply it.
    private var waitingScreenText: String = Localization.notificationLabelTokenFetch

    // Leading/trailing/vertical constraints for the label, held so the
    // `config` prop's insets and vertical placement can replace the ones
    // commonInit() built from the compile-time defaults.
    private var waitingScreenLabelConstraints: [NSLayoutConstraint] = []

    // Single entry point for the waiting-screen text.
    //
    // The label has to be written as an attributed string every time: the
    // instruction style's `lineHeightMultiple` lives in an
    // NSParagraphStyle, and assigning plain `.text` discards it (UILabel has
    // no lineHeightMultiple property to carry it over), so a later status
    // update would silently drop the app's configured line spacing.
    @MainActor
    private func setWaitingScreenText(_ text: String) {
        waitingScreenText = text
        let style = currentSettings.instructionLabelStyle
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = style.lineHeightMultiple
        paragraphStyle.alignment = style.textAlignment
        paragraphStyle.lineBreakMode = style.lineBreakMode
        waitingScreenLabel.attributedText = NSAttributedString(
            string: text,
            attributes: [
                .paragraphStyle: paragraphStyle,
                .font: style.font,
                .foregroundColor: style.textColor
            ]
        )
    }

    private lazy var waitingScreenView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false

        // If a background image was provided, use it.
        if let backgroundImageStyle = currentSettings.backgroundStyle {

            let backgroundImageView = UIImageView(image: backgroundImageStyle.image)
            backgroundImageView.translatesAutoresizingMaskIntoConstraints = false
            backgroundImageView.contentMode = backgroundImageStyle.contentMode
            backgroundImageView.layer.opacity = Float(backgroundImageStyle.opacity)

            view.addSubview(backgroundImageView)
            NSLayoutConstraint.activate([
                backgroundImageView.topAnchor.constraint(equalTo: view.topAnchor),
                backgroundImageView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                backgroundImageView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                backgroundImageView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
            ])

        }
        else{
            view.backgroundColor = currentSettings.backgroundColor
        }

        if let iconStyle = currentSettings.overlayImageStyle {

            let iconImageView = UIImageView(image: iconStyle.image)
            iconImageView.translatesAutoresizingMaskIntoConstraints = false
            iconImageView.contentMode = iconStyle.contentMode
            iconImageView.layer.opacity = Float(iconStyle.opacity)

            view.addSubview(iconImageView)
            let iconConstraints = generateChildConstraints(
                for: iconImageView,
                in: view,
                horizontalSizing: iconStyle.horizontalSizing,
                verticalSizing: iconStyle.verticalSizing
            )
            NSLayoutConstraint.activate(iconConstraints)

        }

        // Add the waiting screen label on top
        view.addSubview(waitingScreenLabel)

        waitingScreenLabelConstraints =
            generateWaitingScreenLabelConstraints(in: view, from: currentSettings)
        NSLayoutConstraint.activate(waitingScreenLabelConstraints)
        return view
    }()

    // Extracted from the waitingScreenView initializer so applyStyling() can
    // regenerate the same constraints from the settings the `config` prop
    // produced - the initializer runs during commonInit(), before any prop
    // has landed.
    private func generateWaitingScreenLabelConstraints(
        in container: UIView,
        from settings: VCSettings
    ) -> [NSLayoutConstraint] {
        let style = settings.instructionLabelStyle
        var constraints = [
            waitingScreenLabel.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            waitingScreenLabel.leadingAnchor.constraint(
                greaterThanOrEqualTo: container.leadingAnchor, constant: style.leading),
            waitingScreenLabel.trailingAnchor.constraint(
                lessThanOrEqualTo: container.trailingAnchor, constant: -style.trailing)
        ]

        if let verticalPosition = style.verticalPosition {
            switch verticalPosition {
            case .center:
                constraints.append(waitingScreenLabel.centerYAnchor.constraint(equalTo: container.centerYAnchor))
            case .top(offset: let offset):
                constraints.append(waitingScreenLabel.topAnchor.constraint(equalTo: container.topAnchor, constant: offset))
            case .bottom(offset: let offset):
                constraints.append(waitingScreenLabel.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -offset))
            case .custom(y: let y):
                constraints.append(waitingScreenLabel.topAnchor.constraint(equalTo: container.topAnchor, constant: y))
            @unknown default:
                constraints.append(waitingScreenLabel.centerYAnchor.constraint(equalTo: container.centerYAnchor))
            }
        } else {
            // Fallback: center vertically if no verticalPosition is provided.
            constraints.append(waitingScreenLabel.centerYAnchor.constraint(equalTo: container.centerYAnchor))
        }

        return constraints
    }

    private lazy var muteButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(muteButtonTapped), for: .touchUpInside)
        return button
    }()

    private lazy var cameraSwitchButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(cameraSwitchTapped), for: .touchUpInside)
        return button
    }()

    private lazy var remoteFrozenOverlayView: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = .black
        v.isUserInteractionEnabled = false
        v.isHidden = true
        return v
    }()

    // MARK: - Constraints
    private var localPipConstraints: [NSLayoutConstraint] = []
    private var remoteFullScreenConstraints: [NSLayoutConstraint] = []
    // Kept so applyStyling() can swap in constraints regenerated from the
    // `config` prop - commonInit() runs before any prop has landed, so the
    // first set is always built from VCSettings' compile-time defaults.
    private var muteButtonConstraints: [NSLayoutConstraint] = []
    private var cameraSwitchButtonConstraints: [NSLayoutConstraint] = []

    // Per-element visibility from the `config` prop. These gate every place
    // that would otherwise unhide an element unconditionally when the call
    // connects, so `visible: false` survives the whole call lifecycle.
    private var styleOverrides = VideoCallStyleOverrides()

    // MARK: - Mic update
    private var micUpdateTask: Task<Void, Never>?

    // MARK: - Initializer
    public override init(frame: CGRect) {
        self.currentState = .initiating
        super.init(frame: frame)
        commonInit()
    }

    public required init?(coder: NSCoder) {
        self.currentState = .initiating
        super.init(coder: coder)
        commonInit()
    }

    // MARK: - Setup (formerly loadView())
    private func commonInit() {
        addSubview(localVideoView)
        updateMuteButtonAppearance(forMutedState: isMuted)
        updateCameraSwitchButtonAppearance()
        localVideoView.isHidden = true

        // Set up constraints for localVideoView
        localPipConstraints = generateChildConstraints(for: localVideoView,
                                                       in: self,
                                                       horizontalSizing: currentSettings.pipViewStyle.horizontalSizing!,
                                                       verticalSizing: currentSettings.pipViewStyle.verticalSizing!,
                                                       centerOffsetX: styleOverrides.pipViewCenterOffsetX)
        remoteFullScreenConstraints = [
            remoteVideoView.topAnchor.constraint(equalTo: topAnchor),
            remoteVideoView.leadingAnchor.constraint(equalTo: leadingAnchor),
            remoteVideoView.trailingAnchor.constraint(equalTo: trailingAnchor),
            remoteVideoView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ]

        NSLayoutConstraint.activate(localPipConstraints)
        addSubview(waitingScreenView)
        NSLayoutConstraint.activate([
            waitingScreenView.topAnchor.constraint(equalTo: topAnchor),
            waitingScreenView.bottomAnchor.constraint(equalTo: bottomAnchor),
            waitingScreenView.leadingAnchor.constraint(equalTo: leadingAnchor),
            waitingScreenView.trailingAnchor.constraint(equalTo: trailingAnchor)
        ])

        addSubview(muteButton)

        muteButton.isHidden = true
        muteButtonConstraints = generateChildConstraints(
            for: muteButton,
            in: self,
            horizontalSizing: .fixed(
                width: currentSettings.muteButtonStyle.size,
                horizontalPosition: currentSettings.muteButtonStyle.horizontalPosition
            ),
            verticalSizing: .fixed(
                height: currentSettings.muteButtonStyle.size,
                verticalPosition: currentSettings.muteButtonStyle.verticalPosition
            ),
            centerOffsetX: styleOverrides.muteButtonCenterOffsetX
        )
        NSLayoutConstraint.activate(muteButtonConstraints)

        addSubview(cameraSwitchButton)

        cameraSwitchButton.isHidden = true
        cameraSwitchButtonConstraints = generateChildConstraints(
            for: cameraSwitchButton,
            in: self,
            horizontalSizing: .fixed(
                width: currentSettings.cameraSwitchButtonStyle.size,
                horizontalPosition: currentSettings.cameraSwitchButtonStyle.horizontalPosition
            ),
            verticalSizing: .fixed(
                height: currentSettings.cameraSwitchButtonStyle.size,
                verticalPosition: currentSettings.cameraSwitchButtonStyle.verticalPosition
            ),
            centerOffsetX: styleOverrides.cameraSwitchButtonCenterOffsetX
        )
        NSLayoutConstraint.activate(cameraSwitchButtonConstraints)

        registerScreenLockObservers()
        registerCallStateReconciliationObserver()
        registerBackgroundMediaObserver()
        callObserver.setDelegate(self, queue: nil)
    }

    // MARK: - Lifecycle (formerly viewWillAppear/viewWillDisappear)
    public override func didMoveToWindow() {
        super.didMoveToWindow()
        if window == nil {
            teardown()
        } else {
            startIfReady()
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self,
                                                    name: UIApplication.protectedDataWillBecomeUnavailableNotification,
                                                    object: nil)
        NotificationCenter.default.removeObserver(self,
                                                    name: UIApplication.protectedDataDidBecomeAvailableNotification,
                                                    object: nil)
        NotificationCenter.default.removeObserver(self,
                                                    name: UIApplication.didBecomeActiveNotification,
                                                    object: nil)
        NotificationCenter.default.removeObserver(self,
                                                    name: UIApplication.didEnterBackgroundNotification,
                                                    object: nil)
        callObserver.setDelegate(nil, queue: nil)

        countdownTimer?.invalidate()
        activeTasks.forEach { $0.task.cancel() }

        guard hasDisabledIdleTimer else { return }
        let restoreValue = previousIdleTimerDisabledState
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = restoreValue
        }
    }

    // MARK: - Screen Lock Observers
    private func registerScreenLockObservers() {
        NotificationCenter.default.addObserver(self,
                                                selector: #selector(handleScreenLocked),
                                                name: UIApplication.protectedDataWillBecomeUnavailableNotification,
                                                object: nil)
        NotificationCenter.default.addObserver(self,
                                                selector: #selector(handleScreenUnlocked),
                                                name: UIApplication.protectedDataDidBecomeAvailableNotification,
                                                object: nil)
    }

    @objc private func handleScreenLocked() {
        VCSettings.logger?.info(logMessage: "Screen has been locked.", logPeriod: .onProcess)
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.onScreenLocked()
        }
    }

    @objc private func handleScreenUnlocked() {
        VCSettings.logger?.info(logMessage: "Screen has been unlocked.", logPeriod: .onProcess)
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.delegate?.onScreenUnlocked()
        }
    }

    // MARK: - Call State Reconciliation (CallKit)
    private func registerCallStateReconciliationObserver() {
        NotificationCenter.default.addObserver(self,
                                                selector: #selector(handleAppDidBecomeActive),
                                                name: UIApplication.didBecomeActiveNotification,
                                                object: nil)
    }

    @objc private func handleAppDidBecomeActive() {
        reconcilePhoneCallStateIfNeeded()
        resumeMediaAfterBackground()
    }

    // MARK: - Background Media Suspension

    /// Restored from `didBecomeActive` rather than `willEnterForeground`: reactivating the audio
    /// session before the app is actually active can fail, and `didBecomeActive` also fires for
    /// transient interruptions that never backgrounded us - which `muteStateBeforeBackground`
    /// makes a no-op.
    private func registerBackgroundMediaObserver() {
        NotificationCenter.default.addObserver(self,
                                                selector: #selector(handleAppDidEnterBackground),
                                                name: UIApplication.didEnterBackgroundNotification,
                                                object: nil)
    }

    /// Tells the server to stop forwarding the agent's audio while the app is away, and to
    /// resume on return.
    ///
    /// `setEngineAvailability(.none)` below only stops *playout*: the subscription stays live, so
    /// the SFU keeps forwarding and the packets pile up in WebRTC's jitter buffer and - once iOS
    /// suspends the process - in the socket receive buffer. Restarting the engine then drains that
    /// backlog, which the user hears as the agent's voice from while they were away.
    ///
    /// Uses `set(subscribed:)` rather than the lighter `set(enabled:)`: the room is connected with
    /// `adaptiveStream: true` (see `connectToRoom`), and `set(enabled:)` refuses with
    /// `.invalidState` whenever adaptiveStream is on.
    @MainActor
    private func setRemoteAudioSubscribed(_ subscribed: Bool) async {
        let publications: [RemoteTrackPublication]
        if subscribed {
            publications = suspendedRemoteAudioPublications
            suspendedRemoteAudioPublications = []
        } else {
            publications = room.remoteParticipants.values
                .flatMap { $0.audioTracks }
                .compactMap { $0 as? RemoteTrackPublication }
                .filter { $0.isSubscribed }
            suspendedRemoteAudioPublications = publications
        }

        var changed = 0
        for publication in publications {
            do {
                try await publication.set(subscribed: subscribed)
                changed += 1
            } catch {
                VCSettings.logger?.error(logMessage: "Failed to set remote audio subscribed=\(subscribed): \(error)", logPeriod: .onProcess)
            }
        }
        VCSettings.logger?.info(logMessage: "Remote audio subscribed=\(subscribed) applied to \(changed)/\(publications.count) publication(s).", logPeriod: .onProcess)
    }

    /// Stops sending and playing audio while the app is not on screen, and lets the agent see why.
    ///
    /// Only reachable at all when the host app declares the `audio` background mode - otherwise
    /// iOS suspends the process and this never runs (audio stops anyway, just not cleanly). With
    /// that mode the process stays alive, so a call would otherwise keep capturing the user's
    /// microphone and playing the agent's voice while the user is somewhere else entirely.
    ///
    /// Three levers, because no one of them is enough:
    /// - muting the publication stops the outgoing audio *and* shows the agent a mute indicator,
    ///   so they understand why they stopped hearing the user;
    /// - `setRemoteAudioSubscribed(false)` stops the server *sending* the agent's audio - without
    ///   it the stream keeps arriving with nothing draining it, and replays on return;
    /// - `setEngineAvailability(.none)` stops the engine itself, which also ends playout - muting
    ///   the microphone alone would leave the agent audible to an absent user.
    @objc private func handleAppDidEnterBackground() {
        Task { @MainActor [weak self] in
            guard let self = self,
                  self.hasCallStarted,
                  !self.isDismissalInProgress,
                  self.muteStateBeforeBackground == nil else { return }

            self.muteStateBeforeBackground = self.isMuted

            // Routed through the signal handler rather than `updateLocalMicrophoneState` directly:
            // it also publishes CLIENT_MICROPHONE_MUTE_RESPONSE, which is what the agent console
            // listens to. The LiveKit track mute alone would only surface as a track-level event.
            self.handleRemoteMicrophoneSignal(shouldMute: true, source: "Background")
            // Let the mute reach the server before the engine goes away, so the agent gets the
            // indicator rather than unexplained silence.
            await self.micUpdateTask?.value

            // Also before the engine goes away: stop the server forwarding the agent's audio.
            // Otherwise it accumulates while playout is stopped and replays on return.
            await self.setRemoteAudioSubscribed(false)

            do {
                try AudioManager.shared.setEngineAvailability(.none)
                VCSettings.logger?.info(logMessage: "Media suspended for background.", logPeriod: .onProcess)
            } catch {
                VCSettings.logger?.error(logMessage: "Failed to suspend the audio engine: \(error)", logPeriod: .onProcess)
            }
        }
    }

    private func resumeMediaAfterBackground() {
        Task { @MainActor [weak self] in
            guard let self = self,
                  let previousMuteState = self.muteStateBeforeBackground,
                  !self.isDismissalInProgress else { return }
            self.muteStateBeforeBackground = nil

            do {
                try AudioManager.shared.setEngineAvailability(.default)
            } catch {
                VCSettings.logger?.error(logMessage: "Failed to resume the audio engine: \(error)", logPeriod: .onProcess)
            }

            await self.setRemoteAudioSubscribed(true)

            // The stored intent, never a hard-coded `false`: backgrounding set `isMuted` to true,
            // so `shouldMute: false` would sail past the handler's "already in that state" guard
            // and unmute a user who had muted themselves - or whom the agent had muted with
            // CLIENT_MICROPHONE_MUTE_SIGNAL. Passing the intent also re-notifies the agent, either
            // with CLIENT_MICROPHONE_UNMUTE_RESPONSE or with a "still muted" MUTE_RESPONSE.
            self.handleRemoteMicrophoneSignal(shouldMute: previousMuteState, source: "Foreground")
            VCSettings.logger?.info(logMessage: "Media resumed after background (microphone muted: \(previousMuteState)).", logPeriod: .onProcess)
        }
    }

    /// `AudioManager` is a process-wide singleton, so leaving the call while suspended would leave
    /// the engine disabled for the whole app. Always hand it back.
    private func restoreAudioEngineAvailabilityIfSuspended() {
        guard muteStateBeforeBackground != nil else { return }
        muteStateBeforeBackground = nil
        // No need to re-subscribe: teardown disconnects the room immediately after this.
        suspendedRemoteAudioPublications.removeAll()
        do {
            try AudioManager.shared.setEngineAvailability(.default)
        } catch {
            VCSettings.logger?.error(logMessage: "Failed to restore the audio engine on teardown: \(error)", logPeriod: .postProcess)
        }
    }

    /// While this app is backgrounded (e.g. the system shows its full-screen call UI after the
    /// user answers a call), iOS may suspend the process, and `CXCallObserver` can miss
    /// `callObserver(_:callChanged:)` events entirely during that time. When we come back to the
    /// foreground, re-check the current call state directly from `callObserver.calls` so the host
    /// app still gets an accurate notification even if an intermediate state was missed.
    private func reconcilePhoneCallStateIfNeeded() {
        guard !isDismissalInProgress else { return }

        if let call = callObserver.calls.first {
            notifyPhoneCallState(for: call)
        } else if isTrackingActivePhoneCall {
            isTrackingActivePhoneCall = false
            VCSettings.logger?.info(logMessage: "Phone call state changed: ended (reconciled after returning to foreground)", logPeriod: .onProcess)
            delegate?.cameraController(self, didChangePhoneCallState: .ended)
        }
    }

    private func notifyPhoneCallState(for call: CXCall) {
        let state: PhoneCallState
        if call.hasEnded {
            state = .ended
        } else if call.hasConnected {
            state = .connected
        } else if call.isOutgoing {
            state = .outgoing
        } else {
            state = .incoming
        }

        isTrackingActivePhoneCall = (state != .ended)

        VCSettings.logger?.info(logMessage: "Phone call state changed: \(state)", logPeriod: .onProcess)
        delegate?.cameraController(self, didChangePhoneCallState: state)
    }

    // Applies the `credentials`/`config` props to already-created views once
    // both are present and the view is attached to a window. Re-styles and
    // re-lays-out the views built in commonInit() with placeholder defaults,
    // so the PiP preview and the mute/camera-switch buttons pick up the
    // size, position and visibility the app configured from JS.
    private func startIfReady() {
        guard !hasStartedConnecting, window != nil,
              let creds = credentials,
              let newServerURL = creds["serverURL"] as? String, !newServerURL.isEmpty,
              let newWsURL = creds["wssURL"] as? String, !newWsURL.isEmpty,
              let newTransactionID = creds["transactionID"] as? String, !newTransactionID.isEmpty,
              let newUsername = creds["clientName"] as? String, !newUsername.isEmpty
        else { return }

        hasStartedConnecting = true

        if !hasDisabledIdleTimer {
            previousIdleTimerDisabledState = UIApplication.shared.isIdleTimerDisabled
            UIApplication.shared.isIdleTimerDisabled = true
            hasDisabledIdleTimer = true
            VCSettings.logger?.info(logMessage: "Idle timer disabled for video call.", logPeriod: .preProcess)
        }

        serverURL = newServerURL
        wsURL = newWsURL
        transactionID = newTransactionID
        username = newUsername
        if let idleTimeoutValue = creds["idleTimeout"] {
            if let intValue = idleTimeoutValue as? Int {
                idleTimeout = intValue
            } else if let stringValue = idleTimeoutValue as? String, let intValue = Int(stringValue) {
                idleTimeout = intValue
            }
        }

        let bundle = VideoCallBundleHelper.localizationBundle ?? .main
        let customSettings = CustomVideoCallSettings(
            localizationBundle: bundle, uiConfig: config as? [String: Any])
        let newSettings = customSettings.createVCSettings()
        currentSettings = newSettings
        styleOverrides = customSettings.createStyleOverrides()

        VCSettings.logger = LogHeader(logLevel: .info, txid: transactionID, os: .iOS, dateProcessStart: Date(), module: .VIDEO_CALL)
        LocalizationConfiguration.tableName = newSettings.tableName
        LocalizationConfiguration.bundle = newSettings.bundle

        applyStyling(from: newSettings)

        let userID = (creds["userID"] as? String) ?? ""
        let operatorBridge = VideoCallOperatorImpl(
            serverURL: serverURL,
            wssURL: wsURL,
            userID: userID,
            transactionID: transactionID,
            clientName: username,
            idleTimeout: String(idleTimeout),
            eventEmitter: VideoCallManager.sharedEventEmitter
        )
        self.operatorBridge = operatorBridge
        self.delegate = operatorBridge

        // Weak, because the type-level closure would otherwise keep this call's bridge (and
        // the RCTEventEmitter it holds) alive for the whole process. Cleared in teardown()
        // alongside the bridge itself.
        VideoCallCameraView.onMicrophoneStateChanged = { [weak operatorBridge] enabled in
            operatorBridge?.onMicrophoneStateChanged(enabled)
        }

        // Sent directly, not via `currentState`: `init` already stored `.initiating`, so the
        // didSet would dedupe it away. The delegate only exists from this point on, so the
        // initial state would otherwise never reach the host.
        delegate?.cameraController(self, didChangeUserState: .initiating)

        VideoCallCameraView.currentInstance = self
        VCSettings.logger?.debug(logMessage: "Starting VideoCallCameraView...", logPeriod: .preProcess)

        // Gate the whole flow before anything starts: a call without camera or microphone
        // access cannot work, so no token is fetched and no room is connected - the host is
        // just told why. This SDK checks the media permissions but never requests them; iOS
        // spends its one prompt per install on whoever asks first, so the wording and the
        // timing belong to the host app.
        //
        // Reported on the next runloop rather than inline: this runs from didMoveToWindow,
        // and failing the host while React Native is still attaching the view leaves the
        // mount half-finished. Upstream defers the same report from viewWillAppear to
        // viewDidAppear for the equivalent reason.
        if let permissionError = Self.missingMediaPermission() {
            postLogs("Video call cannot start without camera and microphone access.",
                     error: permissionError,
                     logPeriod: .preProcess)
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.delegate?.cameraController(self, didFailWithError: permissionError)
                self.dismissController()
            }
            return
        }

        beginTokenFetchAndConnect()
    }

    // MARK: - Media Permission Gate

    private static func missingMediaPermission() -> VCError? {
        if let cameraError = missingCameraPermission() { return cameraError }
        if let microphoneError = missingMicrophonePermission() { return microphoneError }
        return nil
    }

    private static func missingCameraPermission() -> VCError? {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            return nil
        case .notDetermined:
            return .cameraPermissionRequired
        case .denied, .restricted:
            return .cameraPermissionDenied
        @unknown default:
            return .cameraPermissionDenied
        }
    }

    private static func missingMicrophonePermission() -> VCError? {
        if #available(iOS 17.0, *) {
            switch AVAudioApplication.shared.recordPermission {
            case .granted:
                return nil
            case .undetermined:
                return .microphonePermissionRequired
            case .denied:
                return .microphonePermissionDenied
            @unknown default:
                return .microphonePermissionDenied
            }
        } else {
            switch AVAudioSession.sharedInstance().recordPermission {
            case .granted:
                return nil
            case .undetermined:
                return .microphonePermissionRequired
            case .denied:
                return .microphonePermissionDenied
            @unknown default:
                return .microphonePermissionDenied
            }
        }
    }

    // Re-applies settings-derived colors/fonts to views already built by
    // commonInit() with placeholder defaults, now that real config landed,
    // and rebuilds their layout constraints so size/position changes from
    // the `config` prop take effect too.
    private func applyStyling(from settings: VCSettings) {
        remoteVideoView.backgroundColor = settings.backgroundColor
        // VCSettings.init always forces the PiP container's backgroundColor
        // to .clear, so the app's own choice arrives via styleOverrides.
        localVideoView.backgroundColor = styleOverrides.pipViewBackgroundColor
        localVideoView.layer.cornerRadius = settings.pipViewStyle.cornerRadius
        localVideoView.layer.borderColor = settings.pipViewStyle.borderColor.cgColor
        localVideoView.layer.borderWidth = settings.pipViewStyle.borderWidth
        if settings.backgroundStyle == nil {
            waitingScreenView.backgroundColor = settings.backgroundColor
        }
        applyInstructionLabelStyle(from: settings)
        updateMuteButtonAppearance(forMutedState: isMuted)
        updateCameraSwitchButtonAppearance()
        applyLayout(from: settings)
    }

    // Re-applies `instructionLabelStyle`; not optional book-keeping, see
    // INTERNALS.md "Waiting-screen label style on iOS (applyInstructionLabelStyle)".
    @MainActor
    private func applyInstructionLabelStyle(from settings: VCSettings) {
        let style = settings.instructionLabelStyle
        waitingScreenLabel.textAlignment = style.textAlignment
        waitingScreenLabel.numberOfLines = style.numberOfLines
        waitingScreenLabel.lineBreakMode = style.lineBreakMode
        // Re-renders the current text with the new font/color/line height.
        setWaitingScreenText(waitingScreenText)

        NSLayoutConstraint.deactivate(waitingScreenLabelConstraints)
        waitingScreenLabelConstraints =
            generateWaitingScreenLabelConstraints(in: waitingScreenView, from: settings)
        NSLayoutConstraint.activate(waitingScreenLabelConstraints)
    }

    // Swaps commonInit()'s default-derived constraints for ones generated
    // from `settings`. Each set is deactivated before being replaced so the
    // old constraints don't linger and conflict with the new ones; the PiP
    // set stays activated here to match commonInit()'s behaviour, after
    // which updateVideoLayout() keeps owning when it's on or off.
    private func applyLayout(from settings: VCSettings) {
        guard let pipHorizontalSizing = settings.pipViewStyle.horizontalSizing,
              let pipVerticalSizing = settings.pipViewStyle.verticalSizing
        else { return }

        NSLayoutConstraint.deactivate(localPipConstraints)
        localPipConstraints = generateChildConstraints(
            for: localVideoView,
            in: self,
            horizontalSizing: pipHorizontalSizing,
            verticalSizing: pipVerticalSizing,
            centerOffsetX: styleOverrides.pipViewCenterOffsetX
        )
        NSLayoutConstraint.activate(localPipConstraints)

        NSLayoutConstraint.deactivate(muteButtonConstraints)
        muteButtonConstraints = generateChildConstraints(
            for: muteButton,
            in: self,
            horizontalSizing: .fixed(
                width: settings.muteButtonStyle.size,
                horizontalPosition: settings.muteButtonStyle.horizontalPosition
            ),
            verticalSizing: .fixed(
                height: settings.muteButtonStyle.size,
                verticalPosition: settings.muteButtonStyle.verticalPosition
            ),
            centerOffsetX: styleOverrides.muteButtonCenterOffsetX
        )
        NSLayoutConstraint.activate(muteButtonConstraints)

        NSLayoutConstraint.deactivate(cameraSwitchButtonConstraints)
        cameraSwitchButtonConstraints = generateChildConstraints(
            for: cameraSwitchButton,
            in: self,
            horizontalSizing: .fixed(
                width: settings.cameraSwitchButtonStyle.size,
                horizontalPosition: settings.cameraSwitchButtonStyle.horizontalPosition
            ),
            verticalSizing: .fixed(
                height: settings.cameraSwitchButtonStyle.size,
                verticalPosition: settings.cameraSwitchButtonStyle.verticalPosition
            ),
            centerOffsetX: styleOverrides.cameraSwitchButtonCenterOffsetX
        )
        NSLayoutConstraint.activate(cameraSwitchButtonConstraints)
    }

    // Single place that decides whether the in-call controls are on screen,
    // so `config`'s per-element `visible: false` is respected everywhere the
    // call lifecycle would otherwise reveal them.
    @MainActor
    private func setInCallControlsVisible(_ visible: Bool) {
        muteButton.isHidden = !(visible && styleOverrides.isMuteButtonVisible)
        cameraSwitchButton.isHidden = !(visible && styleOverrides.isCameraSwitchButtonVisible)
        localVideoView.isHidden = !(visible && styleOverrides.isPipViewVisible)
    }

    private func beginTokenFetchAndConnect() {
        let id = generateUniqueID()

        let tokenTask = Task { @MainActor [weak self] in
            guard let self = self else { return }
            defer {
                Task { @MainActor in
                    self.activeTasks.removeAll { $0.id == id }
                }
            }

            self.currentState = .tokenFetching
            let tokenService = TokenService(baseURL: self.serverURL)
            let params = ["162": self.username]
            do {
                let newToken = try await withCheckedThrowingContinuation { continuation in
                    tokenService.getAccessToken(transactionId: self.transactionID, params: params) { result in
                        switch result {
                        case .success(let token):
                            continuation.resume(returning: token)
                        case .failure(let error):
                            continuation.resume(throwing: error)
                        }
                    }
                }
                self.currentState = .tokenFetched
                self.setWaitingScreenText(Localization.notificationLabelDefault)
                self.connectToServer(token: newToken)
            } catch {
                self.postLogs("Failed to get access token: \(error)", error: error)
                self.delegate?.cameraController(self, didFailWithError: error)
                self.dismissController()
            }

        }

        activeTasks.append(TaskEntry(id: id, task: tokenTask))
    }

    func generateUniqueID() -> UUID {
        var newID = UUID()
        // Check if the id already exists in activeTasks.
        while activeTasks.contains(where: { $0.id == newID }) {
            VCSettings.logger?.warning(logMessage: "Duplicate UUID detected: \(newID). Generating a new one.", logPeriod: .onProcess)
            newID = UUID()
        }
        return newID
    }

    private func teardown() {
        VCSettings.logger?.info(logMessage: "VideoCallCameraView is tearing down; disconnecting room...", logPeriod: .postProcess)

        // Before anything else: AudioManager is process-wide, so ending a call while
        // backgrounded would otherwise leave the whole app's audio engine disabled.
        restoreAudioEngineAvailabilityIfSuspended()

        if hasDisabledIdleTimer {
            UIApplication.shared.isIdleTimerDisabled = previousIdleTimerDisabledState
            hasDisabledIdleTimer = false
            VCSettings.logger?.info(logMessage: "Idle timer restored to previous state (\(previousIdleTimerDisabledState)).", logPeriod: .postProcess)
        }

        countdownTimer?.invalidate()
        countdownTimer = nil

        activeTasks.forEach { $0.task.cancel() }
        activeTasks.removeAll()

        remoteParticipants.removeAll()
        hasStartedConnecting = false
        // Reset alongside `hasStartedConnecting`: this view can be torn down and
        // started again, and a stale `true` would skip the initiation countdown
        // (and so the camera/mic enable) on the next call.
        hasCallStarted = false
        operatorBridge = nil
        delegate = nil
        // Reset so the dedupe does not suppress the next call's first event.
        lastNotifiedMicrophoneEnabled = nil
        if VideoCallCameraView.currentInstance === self {
            VideoCallCameraView.currentInstance = nil
            // Guarded the same way, and for the same reason: a newer call may already have
            // installed its own closure, and this teardown must not silence it.
            VideoCallCameraView.onMicrophoneStateChanged = nil
        }

        Task { @MainActor in
            await room.disconnect()
        }
    }

    // MARK: - Constraint Helpers
    // `centerOffsetX` shifts a horizontally centred child off the container's
    // centre (positive = towards the trailing edge). It is a separate
    // parameter because UdentifyHorizontalPosition.center carries no offset,
    // and it is what lets two buttons share the centre as a group with a
    // fixed gap between them.
    private func generateChildConstraints(for childView: UIView, in container: UIView, horizontalSizing: UdentifyHorizontalSizing, verticalSizing: UdentifyVerticalSizing, centerOffsetX: CGFloat = 0) -> [NSLayoutConstraint] {
        var constraints = [NSLayoutConstraint]()

        switch horizontalSizing {
        case .fixed(let width, let horizontalPosition):
            constraints.append(childView.widthAnchor.constraint(equalToConstant: width))
            switch horizontalPosition {
            case .center:
                constraints.append(childView.centerXAnchor.constraint(equalTo: container.centerXAnchor, constant: centerOffsetX))
            case .left(let offset):
                constraints.append(childView.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: offset))
            case .right(let offset):
                constraints.append(childView.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -offset))
            case .custom(x: let x):
                constraints.append(childView.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: x))
            }
        case .anchors(leading: let leading, trailing: let trailing):
            constraints.append(childView.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: leading))
            constraints.append(childView.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -trailing))
        }

        switch verticalSizing {
        case .fixed(let height, let verticalPosition):
            constraints.append(childView.heightAnchor.constraint(equalToConstant: height))
            switch verticalPosition {
            case .center:
                constraints.append(childView.centerYAnchor.constraint(equalTo: container.centerYAnchor))
            case .top(let offset):
                constraints.append(childView.topAnchor.constraint(equalTo: container.topAnchor, constant: offset))
            case .bottom(let offset):
                // Plain container edge, not safeAreaLayoutGuide: an embedded RN
                // view is not necessarily screen-edge-aligned, so safe-area
                // insets would be zero/meaningless here (see library notes).
                constraints.append(childView.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -offset))
            case .custom(y: let y):
                constraints.append(childView.topAnchor.constraint(equalTo: container.topAnchor, constant: y))
            }
        case .anchors(top: let top, bottom: let bottom):
            constraints.append(childView.topAnchor.constraint(equalTo: container.topAnchor, constant: top))
            constraints.append(childView.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -bottom))
        }

        return constraints
    }

    // MARK: - Server Connection
    private func connectToServer(token: String) {
        let options = RoomOptions(adaptiveStream: true, dynacast: true)
        let id = generateUniqueID()
        let roomConnectionTask = Task { [weak self] in
            guard let self = self else { return }
            defer {
                Task { @MainActor in
                    self.activeTasks.removeAll { $0.id == id }
                }
            }

            do {
                // Emitted manually: a fast connect can skip LiveKit's `.connecting` transition
                // and leave the host on `.tokenFetched`. Matches Android; the didSet dedupes.
                await MainActor.run {
                    // Token task outlives cancellation, so a host that cancelled must not
                    // then be told `connecting`.
                    guard !self.isDismissalInProgress else { return }
                    self.currentState = .connecting
                }
                try await self.room.connect(
                    url: self.wsURL,
                    token: token,
                    roomOptions: options
                )
                self.roomName = self.room.name
                try await self.room.localParticipant.setCamera(enabled: false)
                try await self.updateLocalMicrophoneState(toMuted: isMuted)
                await setParticipants()
            } catch {
                self.postLogs("Failed to connect to server", error: error, logPeriod: .preProcess)
                self.delegate?.cameraController(self, didFailWithError: error)
                await self.dismissController()
            }
        }
        activeTasks.append(TaskEntry(id: id, task: roomConnectionTask))
    }

    public func dismissController() {
        Task { @MainActor [weak self] in
            guard let self = self else { return }

            self.countdownTimer?.invalidate()

            if self.isDismissalInProgress {
                VCSettings.logger?.warning(logMessage: "Multiple dismissals attempted.", logPeriod: .preProcess)
                return
            }
            self.isDismissalInProgress = true
            VCSettings.logger?.info(logMessage: "Tearing down VideoCallCameraView...", logPeriod: .preProcess)

            Task { @MainActor in
                await room.disconnect()
            }

            // No UIViewController to pop/dismiss anymore - JS owns whether/how
            // to remove this component from the tree. We just notify it.
            self.delegate?.cameraControllerDidDismiss(self)
        }
    }

    // MARK: - Manage Participants

    /// Points the PiP preview at whichever local video track is currently published.
    ///
    /// Must run after every `setCamera(enabled: true)`, not just the one at call start.
    /// `setCamera(enabled: false)` mutes the publication when one exists, but a full
    /// LiveKit reconnect drops it - so re-enabling afterwards goes down
    /// `LocalParticipant.set(source:enabled:)`'s create-and-publish branch and hands us a
    /// *new* `LocalVideoTrack`. `localVideoView` would still hold the previous, stopped
    /// one and render nothing, while the agent sees the new track perfectly well: the
    /// publish succeeded, only the local preview was left behind.
    @MainActor
    private func attachLocalVideoTrack() {
        guard let localTrack = room.localParticipant.videoTracks.first?.track as? VideoTrack else {
            VCSettings.logger?.warning(logMessage: "No local video track to attach to the PiP view.", logPeriod: .onProcess)
            return
        }
        localVideoView.track = localTrack
    }

    @MainActor
    private func setParticipants() async {
        VCSettings.logger?.info(logMessage: "Setting participants...", logPeriod: .preProcess)

        if room.remoteParticipants.count > 0 {
            // Detect an agent reconnect so the in-call layout can be restored below;
            // see INTERNALS.md "iOS agent-reconnect handling (VideoCallCameraView)".
            let wasShowingWaitingScreen = waitingScreenView.superview != nil

            for participant in room.remoteParticipants.values {
                if participant.metadata == "agent" {
                    VCSettings.logger?.debug(logMessage: "Found an agent participant: \(participant.identity)", logPeriod: .preProcess)
                    if let remoteTrack = participant.videoTracks.first?.track as? VideoTrack {
                        VCSettings.logger?.debug(logMessage: "Found remote video track", logPeriod: .preProcess)
                        remoteVideoView.track = remoteTrack
                        if remoteVideoView.superview == nil {
                            insertSubview(remoteVideoView, belowSubview: localVideoView)
                            NSLayoutConstraint.activate(remoteFullScreenConstraints)
                        }
                    } else {
                        VCSettings.logger?.warning(logMessage: "No remote video track found", logPeriod: .preProcess)
                    }
                    break
                }
            }

            if hasCallStarted && wasShowingWaitingScreen {
                VCSettings.logger?.info(logMessage: "Agent is back after a reconnect; restoring in-call layout.", logPeriod: .onProcess)
                transitionToOperatorJoinedLayout()
                self.setInCallControlsVisible(true)
                do {
                    try await room.localParticipant.setCamera(enabled: true)
                    self.updateLocalMicrophoneState(toMuted: false)
                } catch {
                    VCSettings.logger?.error(logMessage: "Error re-enabling camera after reconnect: \(error)", logPeriod: .onProcess)
                }
                self.attachLocalVideoTrack()
            }
        } else {
            addWaitingScreenIfNeeded()
            setWaitingScreenText(Localization.notificationLabelDefault)
            do {
                self.setInCallControlsVisible(false)
                try await room.localParticipant.setCamera(enabled: false)
                self.updateLocalMicrophoneState(toMuted: true)
            } catch {
                VCSettings.logger?.error(logMessage: "Error disabling camera: \(error)", logPeriod: .onProcess)
            }
            removeRemoteVideoViewIfNeeded()
            updateVideoLayout()
        }
    }

    private func addWaitingScreenIfNeeded() {
        if waitingScreenView.superview == nil {
            addSubview(waitingScreenView)
            NSLayoutConstraint.activate([
                waitingScreenView.topAnchor.constraint(equalTo: topAnchor),
                waitingScreenView.bottomAnchor.constraint(equalTo: bottomAnchor),
                waitingScreenView.leadingAnchor.constraint(equalTo: leadingAnchor),
                waitingScreenView.trailingAnchor.constraint(equalTo: trailingAnchor)
            ])
        }
    }

    private func removeRemoteVideoViewIfNeeded() {
        guard remoteVideoView.superview != nil else { return }
        NSLayoutConstraint.deactivate(remoteFullScreenConstraints)
        remoteVideoView.removeFromSuperview()
        remoteVideoView.track = nil
    }

    @MainActor
    private func showAgentFrozenOverlay() {
        guard !isDismissalInProgress, remoteVideoView.superview != nil else { return }
        if remoteFrozenOverlayView.superview == nil {
            insertSubview(remoteFrozenOverlayView, aboveSubview: remoteVideoView)
            NSLayoutConstraint.activate([
                remoteFrozenOverlayView.topAnchor.constraint(equalTo: remoteVideoView.topAnchor),
                remoteFrozenOverlayView.leadingAnchor.constraint(equalTo: remoteVideoView.leadingAnchor),
                remoteFrozenOverlayView.trailingAnchor.constraint(equalTo: remoteVideoView.trailingAnchor),
                remoteFrozenOverlayView.bottomAnchor.constraint(equalTo: remoteVideoView.bottomAnchor)
            ])
        }
        remoteFrozenOverlayView.isHidden = false
    }

    @MainActor
    private func hideAgentFrozenOverlay() {
        remoteFrozenOverlayView.isHidden = true
    }

    @objc private func muteButtonTapped() {
        isMuted.toggle()
        updateLocalMicrophoneState(toMuted: isMuted)
    }

    /// Compared against the last notified value, not `isMuted`: callers like `muteButtonTapped`
    /// already set `isMuted` before the update runs, so every change would look like a no-op.
    @MainActor
    private func notifyMicrophoneStateChanged(isEnabled: Bool) {
        guard lastNotifiedMicrophoneEnabled != isEnabled else { return }
        lastNotifiedMicrophoneEnabled = isEnabled
        VideoCallCameraView.onMicrophoneStateChanged?(isEnabled)
    }

    @objc private func cameraSwitchTapped() {
        Task { @MainActor [weak self] in
            guard let self = self,
                  let publication = self.room.localParticipant.videoTracks.first,
                  let localTrack = publication.track as? LocalVideoTrack,
                  let capturer = localTrack.capturer as? CameraCapturer else {
                VCSettings.logger?.warning(logMessage: "No local video track or capturer available for switch", logPeriod: .onProcess)
                return
            }
            do {
                try await capturer.switchCameraPosition()
                self.isSwitchedToRearCamera.toggle()
                self.updateCameraSwitchButtonAppearance()
            } catch {
                VCSettings.logger?.error(logMessage: "Failed to switch camera via LiveKit: \(error)", logPeriod: .onProcess)
            }
        }
    }

    private func updateLocalMicrophoneState(toMuted muted: Bool) {
        let previousTask = micUpdateTask
        micUpdateTask = Task { @MainActor [weak self] in
            await previousTask?.value
            guard let self = self else { return }
            guard self.room.connectionState == .connected else { return }

            self.isMuted = muted
            do {
                try await self.room.localParticipant.setMicrophone(enabled: !muted)
                self.updateMuteButtonAppearance(forMutedState: muted)
                // The one funnel every microphone change passes through; inside the `do` so the
                // host is only told once the change took effect.
                self.notifyMicrophoneStateChanged(isEnabled: !muted)
            } catch {
                VCSettings.logger?.error(logMessage: "Error toggling microphone: \(error)", logPeriod: .onProcess)
            }
        }
    }

    @MainActor
    private func updateMuteButtonAppearance(forMutedState muted: Bool) {
        let imageName = muted ? "mic.slash.fill" : "mic.fill"
        let configuration = UIImage.SymbolConfiguration(pointSize: currentSettings.muteButtonStyle.size / 2, weight: .regular)
        let image = UIImage(systemName: imageName, withConfiguration: configuration)
        muteButton.setImage(image, for: .normal)
        muteButton.tintColor = muted ? currentSettings.muteButtonStyle.mutedColor : currentSettings.muteButtonStyle.unmutedColor
    }

    @MainActor
    private func updateCameraSwitchButtonAppearance() {
        let imageName = "camera.rotate.fill"
        let configuration = UIImage.SymbolConfiguration(pointSize: currentSettings.cameraSwitchButtonStyle.size / 2, weight: .regular)
        let image = UIImage(systemName: imageName, withConfiguration: configuration)
        cameraSwitchButton.setImage(image, for: .normal)
        // A single static tint, like any other button - the SDK ships one
        // icon for this button on both platforms and there is no per-facing
        // distinction to render, matching Android (where this colour is
        // typically the SDK package's own default rather than an app
        // override - see VideoCallCameraSwitchButtonStyle.color).
        cameraSwitchButton.tintColor = currentSettings.cameraSwitchButtonStyle.color
    }

    // MARK: - Dynamic Layout Updates
    @MainActor
    private func updateVideoLayout() {
        let hasRemote = !room.remoteParticipants.isEmpty && remoteVideoView.track != nil
        NSLayoutConstraint.deactivate(localPipConstraints)
        if hasRemote {
            NSLayoutConstraint.activate(localPipConstraints)
        }

        if !hasRemote {
            removeRemoteVideoViewIfNeeded()
        }
    }

    @MainActor
    private func transitionToOperatorJoinedLayout() {
        waitingScreenView.removeFromSuperview()
        NSLayoutConstraint.deactivate(localPipConstraints)
        NSLayoutConstraint.activate(localPipConstraints)
        if remoteVideoView.superview == nil {
            insertSubview(remoteVideoView, belowSubview: localVideoView)
            NSLayoutConstraint.activate(remoteFullScreenConstraints)
        }
    }

    private func startCountdown(from seconds: Int) {
        countdownTimer?.invalidate()
        countdownTimer = nil
        countdownSeconds = seconds
        updateCountdownLabel()

        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else { return }
            self.countdownSeconds -= 1
            if self.countdownSeconds <= 0 {
                timer.invalidate()
                self.countdownTimer = nil
                Task { @MainActor [weak self] in
                    guard let self = self else { return }
                    do {
                        self.setInCallControlsVisible(true)
                        try await self.room.localParticipant.setCamera(enabled: true)
                        self.updateLocalMicrophoneState(toMuted: false)
                    } catch {
                        VCSettings.logger?.error(logMessage: "Error enabling camera.", logPeriod: .preProcess)
                        VCSettings.logger?.error(error: error, logPeriod: .preProcess)
                    }
                    self.attachLocalVideoTrack()
                    self.transitionToOperatorJoinedLayout()
                    // Mic is live and tracks are attached - this, not the room join, is
                    // `connected`. Same point as the Android SDK.
                    self.hasCallStarted = true
                    self.currentState = .connected
                }
            } else {
                self.updateCountdownLabel()
            }
        }
    }

    private func startCountdownForDisconnection(from seconds: Int) {
        countdownTimer?.invalidate()
        countdownTimer = nil
        countdownSeconds = seconds

        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else { return }
            self.countdownSeconds -= 1
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                VCSettings.logger?.info(logMessage: "Disconnect in \(self.countdownSeconds) seconds", logPeriod: .preProcess)
            }
            if self.countdownSeconds <= 0 {
                timer.invalidate()
                self.countdownTimer = nil
                Task { @MainActor [weak self] in
                    guard let self = self else { return }
                    self.postLogs("Video call has been completed.", error: nil)
                    self.delegate?.cameraController(self, didFailWithError: VCError.api("Idle Timeout exceeded!"))
                    self.dismissController()
                }
            }
        }
    }

    private func updateCountdownLabel() {
        setWaitingScreenText(String(format: Localization.notificationLabelCountdown, countdownSeconds))
    }

    private func postLogs(_ message: String?, error: Error?, logPeriod currentStage: LogPeriod = .onProcess) {
        if let error = error {
            if let message = message {
                VCSettings.logger?.error(logMessage: message, logPeriod: currentStage)
            } else {
                VCSettings.logger?.error(logMessage: "Error occurred: \(error.localizedDescription)", logPeriod: currentStage)
            }
        } else if let message = message {
            VCSettings.logger?.info(logMessage: message, logPeriod: currentStage)
        }
        VCSettings.logger?.postLogs(serverURL: serverURL, error: error, webService: WebService.shared)
    }
}

//MARK: - Cancel VideoCall / static access to the currently mounted instance
extension VideoCallCameraView {

    public static var hasActiveInstance: Bool { currentInstance != nil }
    public static var activeServerURL: String? { currentInstance?.serverURL }
    public static var activeTransactionID: String? { currentInstance?.transactionID }

    public static func currentUserStatus() -> String {
        guard let instance = currentInstance else { return "idle" }
        switch instance.currentState {
        case .initiating: return "idle"
        case .tokenFetching, .tokenFetched, .connecting: return "connecting"
        case .connected: return "connected"
        case .disconnected: return "disconnected"
        case .reconnecting: return "connecting"
        }
    }

    public static func endActiveCall() {
        currentInstance?.dismissController()
    }

    /// Turns the microphone of the active call on or off.
    ///
    /// Routed through the agent-signal path, so the agent console gets a
    /// `CLIENT_MICROPHONE_*_RESPONSE` and the built-in mute button stays in sync.
    ///
    /// - Returns: `false` when there is no active call. `true` only means the request was
    ///   taken up - the change itself is applied asynchronously and is reported by
    ///   `onMicrophoneStateChanged`.
    @discardableResult
    public static func setMicrophoneEnabled(_ enabled: Bool) -> Bool {
        guard let instance = currentInstance else {
            VCSettings.logger?.warning(logMessage: "setMicrophoneEnabled(\(enabled)) ignored: no active call instance.", logPeriod: .onProcess)
            return false
        }

        DispatchQueue.main.async {
            instance.handleRemoteMicrophoneSignal(shouldMute: !enabled, source: "Host app")
        }
        return true
    }

    /// Whether the microphone is currently live; `false` when there is no active call.
    public static func isMicrophoneEnabled() -> Bool {
        guard let instance = currentInstance else { return false }
        return !instance.isMuted
    }

    /// - Warning: Deprecated in favour of `setMicrophoneEnabled(_:)`, which is explicit rather
    ///   than relative to a state the SDK can change on its own, and which also notifies the
    ///   agent. This one writes the LiveKit track directly, so the agent console's mute
    ///   indicator does not follow it.
    @available(*, deprecated, message: "Use setMicrophoneEnabled(_:) instead.")
    @discardableResult
    public static func toggleMicrophone() -> Bool {
        guard let instance = currentInstance else { return false }
        instance.isMuted.toggle()
        instance.updateLocalMicrophoneState(toMuted: instance.isMuted)
        return !instance.isMuted
    }

    public static func cancelVideoCall(serverUrl: String,
                                        transactionId: String,
                                        completion: @escaping (Result<Bool, Error>) -> Void) {

        guard let activeInstance = VideoCallCameraView.currentInstance else {
            completion(.failure(VCError.api("No active call instance to cancel.")))
            return
        }

        guard let roomId = activeInstance.roomName else {
            VCSettings.logger?.error(logMessage: "cancelVideoCall: roomId is nil, cannot cancel video call.", logPeriod: .preProcess)
            completion(.failure(VCError.api("Room ID is missing; cannot cancel video call.")))
            return
        }

        let params = ["168": roomId]
        let videoCallService = VideoCallService(baseURL: serverUrl)

        videoCallService.cancelVideoCall(transactionId: transactionId, params: params) { result in
            switch result {
            case .success(let success):
                VCSettings.logger?.info(logMessage: "cancelVideoCall completed, response: \(success)", logPeriod: .postProcess)
            case .failure(let error):
                VCSettings.logger?.error(logMessage: "cancelVideoCall failed: \(error.localizedDescription)", logPeriod: .postProcess)
            }

            DispatchQueue.main.async {
                activeInstance.dismissController()
            }

            completion(result)
        }
    }
}

// MARK: - RoomDelegate
extension VideoCallCameraView: RoomDelegate {
    public func room(_ room: Room, didUpdateConnectionState connectionState: ConnectionState, from _: ConnectionState) {
        VCSettings.logger?.debug(logMessage: "Connection state updated: \(connectionState)", logPeriod: .onProcess)
        Task { @MainActor [weak self] in
            guard let self = self else { return }
            switch connectionState {
            case .disconnected:
                currentState = .disconnected
                remoteParticipants = []
                removeRemoteVideoViewIfNeeded()
                self.addWaitingScreenIfNeeded()
                setWaitingScreenText(Localization.notificationLabelDefault)
                self.setInCallControlsVisible(false)
                self.isMuted = true
                self.updateMuteButtonAppearance(forMutedState: true)
                self.dismissController()
            case .connecting:

                if self.isDismissalInProgress { return }
                currentState = .connecting
            case .reconnecting:

                if self.isDismissalInProgress { return }
                currentState = .reconnecting
            case .connected:

                if self.isDismissalInProgress { return }
                // Post-start only, i.e. a reconnect. The first `.connected` is just the room
                // join; the host stays on `.connecting` until the countdown finishes.
                if hasCallStarted {
                    currentState = .connected
                }
                await setParticipants()
            case .disconnecting:

                if self.isDismissalInProgress { return }
                VCSettings.logger?.info(logMessage: "Connection is disconnecting...", logPeriod: .onProcess)
            }
        }
    }

    public func room(_ room: Room, participantDidConnect participant: RemoteParticipant) {
        VCSettings.logger?.debug(logMessage: "Remote participant connected: \(participant.identity)", logPeriod: .onProcess)
        let participantMetadata = participant.metadata

        Task { @MainActor [weak self] in
            guard let self = self else { return }

            if self.isDismissalInProgress { return }

            if participantMetadata == "agent" {
                // Cancel the disconnection countdown if it's still running when the agent
                // reconnects; see INTERNALS.md "iOS agent-reconnect handling
                // (VideoCallCameraView)".
                if hasCallStarted, countdownTimer != nil {
                    VCSettings.logger?.info(logMessage: "Agent reconnected before the disconnection countdown finished; cancelling it.", logPeriod: .onProcess)
                    countdownTimer?.invalidate()
                    countdownTimer = nil
                }
                delegate?.cameraController(self, participantType: .agent, didChangeState: .connected)
            }
            else if participantMetadata == "supervisor" {
                delegate?.cameraController(self, participantType: .supervisor, didChangeState: .connected)
            }

            remoteParticipants.append(participant)
            await setParticipants()
        }
    }

    public func room(_ room: Room, participantDidDisconnect participant: RemoteParticipant) {
        VCSettings.logger?.debug(logMessage: "Remote participant disconnected: \(participant.identity)", logPeriod: .onProcess)
        let participantMetadata = participant.metadata

        Task { @MainActor [weak self] in
            guard let self = self else { return }

            if self.isDismissalInProgress { return }

            if participantMetadata == "agent" {
                self.startCountdownForDisconnection(from: idleTimeout)
                delegate?.cameraController(self, participantType: .agent, didChangeState: .disconnected)
            }
            else if participantMetadata == "supervisor" {
                delegate?.cameraController(self, participantType: .supervisor, didChangeState: .disconnected)
            }

            remoteParticipants.removeAll { $0.identity == participant.identity }
            await setParticipants()
        }
    }

    func room(_ room: Room, participant: RemoteParticipant, publication: TrackPublication, didSubscribe track: Track) {
        VCSettings.logger?.debug(logMessage: "Video track has been subscribed.", logPeriod: .onProcess)

        if let videoTrack = track as? VideoTrack {
            Task { @MainActor [weak self] in
                guard let self = self else { return }

                if self.isDismissalInProgress { return }

                self.remoteVideoView.track = videoTrack
                if self.remoteVideoView.superview == nil {
                    self.insertSubview(self.remoteVideoView, belowSubview: self.localVideoView)
                    NSLayoutConstraint.activate(self.remoteFullScreenConstraints)
                }
                await self.updateVideoLayout()
            }
        }
    }

    public func room(_ room: Room, participant: RemoteParticipant, trackPublication: RemoteTrackPublication, didUpdateStreamState streamState: StreamState) {
        VCSettings.logger?.debug(logMessage: "Stream state updated for participant \(participant.identity): \(streamState)", logPeriod: .onProcess)

        let participantMetadata = participant.metadata

        // Check if the updated publication is a video track
        if let videoPublication = trackPublication as? RemoteTrackPublication {
            Task { @MainActor [weak self] in
                guard let self = self else { return }

                switch streamState {
                case .active:
                    if let videoTrack = videoPublication.track as? VideoTrack, participantMetadata == "agent" {
                        self.remoteVideoView.track = videoTrack
                        // The agent toggling their camera flips stream state paused -> active
                        // again; guard so the countdown can't restart mid-call. As on Android.
                        if !hasCallStarted {
                            startCountdown(from: waitTimeInSeconds)
                        } else {
                            // `startCountdown`'s own invalidate is what used to cancel a pending
                            // idle-timeout countdown here - both countdowns share this timer.
                            countdownTimer?.invalidate()
                            countdownTimer = nil
                        }
                        VCSettings.logger?.info(logMessage: "Assigned video track for participant \(participant.identity)", logPeriod: .onProcess)
                        if self.remoteVideoView.superview == nil {
                            self.insertSubview(self.remoteVideoView, belowSubview: self.localVideoView)
                            NSLayoutConstraint.activate(self.remoteFullScreenConstraints)
                        }
                        delegate?.cameraController(self, participantType: .agent, didChangeState: .videoTrackActivated)
                        await self.updateVideoLayout()
                    }
                case .paused:
                    if self.remoteVideoView.track?.sid == videoPublication.track?.sid, participantMetadata == "agent" {
                        self.remoteVideoView.track = nil
                        VCSettings.logger?.info(logMessage: "Removed video track for participant \(participant.identity)", logPeriod: .onProcess)
                        delegate?.cameraController(self, participantType: .agent, didChangeState: .videoTrackPaused)
                        self.removeRemoteVideoViewIfNeeded()
                        await self.updateVideoLayout()
                    }
                @unknown default:
                    VCSettings.logger?.info(logMessage: "Unhandled stream state \(streamState) for participant \(participant.identity)", logPeriod: .onProcess)
                }
            }
        }
    }

    public func room(_ room: Room, participant: RemoteParticipant?, didReceiveData data: Data, forTopic topic: String, encryptionType: EncryptionType) {
        guard let _ = String(data: data, encoding: .utf8) else { return }

        do {
            let decoder = JSONDecoder()
            let signal = try decoder.decode(VideoCallSignal.self, from: data)

            guard signal.targetIdentity == room.localParticipant.identity?.stringValue else { return }

            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }

                switch signal.type {
                case "TERMINATE_SESSION_SIGNAL":
                    self.handleSessionTermination()
                case "CLIENT_MICROPHONE_MUTE_SIGNAL":
                    self.handleRemoteMicrophoneSignal(shouldMute: true)
                case "CLIENT_MICROPHONE_UNMUTE_SIGNAL":
                    self.handleRemoteMicrophoneSignal(shouldMute: false)
                case "CLIENT_CAMERA_SWITCH_BACK_SIGNAL":
                    self.handleRemoteCameraSignal(shouldSwitchToBack: true)
                case "CLIENT_CAMERA_SWITCH_FRONT_SIGNAL":
                    self.handleRemoteCameraSignal(shouldSwitchToBack: false)
                case "CLIENT_FLASH_ON_SIGNAL":
                    self.handleRemoteFlashSignal(shouldTurnOn: true)
                case "CLIENT_FLASH_OFF_SIGNAL":
                    self.handleRemoteFlashSignal(shouldTurnOn: false)
                default:
                    VCSettings.logger?.warning(logMessage: "Unknown signal type received: \(signal.type)", logPeriod: .onProcess)
                }
            }
        } catch {
            VCSettings.logger?.error(logMessage: "Failed to decode signal: \(error)", logPeriod: .onProcess)
        }
    }

    private func handleSessionTermination() {
        Task { @MainActor [weak self] in
            guard let self = self else { return }
            self.postLogs("Video call has been completed.", error: nil)
            self.delegate?.cameraControllerDidEndSessionSuccessfully(self)
            self.dismissController()
        }
    }

    public func room(_ room: Room, participant: Participant, trackPublication: TrackPublication, didUpdateIsMuted isMuted: Bool) {
        guard participant.metadata == "agent", trackPublication.kind == .video else { return }
        VCSettings.logger?.info(logMessage: "Agent camera muted: \(isMuted)", logPeriod: .onProcess)

        Task { @MainActor [weak self] in
            guard let self = self, !self.isDismissalInProgress else { return }
            if isMuted {
                self.showAgentFrozenOverlay()
            } else {
                self.hideAgentFrozenOverlay()
            }
        }
    }
}

// MARK: - CXCallObserverDelegate
extension VideoCallCameraView: CXCallObserverDelegate {
    public func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        guard !isDismissalInProgress else { return }
        notifyPhoneCallState(for: call)
    }
}

        // MARK: - Handle Signal Helpers
private extension VideoCallCameraView {

    /// `source` only labels the log line - `setMicrophoneEnabled(_:)` routes through here too,
    /// to reuse the `CLIENT_MICROPHONE_*_RESPONSE` the agent expects.
    func handleRemoteMicrophoneSignal(shouldMute: Bool, source: String = "Remote") {
        let action = shouldMute ? "mute" : "unmute"
        let responseType = shouldMute ? "CLIENT_MICROPHONE_MUTE_RESPONSE" : "CLIENT_MICROPHONE_UNMUTE_RESPONSE"

        VCSettings.logger?.info(logMessage: "\(source) microphone \(action) signal received", logPeriod: .onProcess)

        if isMuted == shouldMute {
            sendSignalResponse(type: responseType, success: true, message: "Already \(action)d")
            return
        }

        updateLocalMicrophoneState(toMuted: shouldMute)
        sendSignalResponse(type: responseType, success: true)
    }

    func handleRemoteCameraSignal(shouldSwitchToBack: Bool) {
        let camera = shouldSwitchToBack ? "back" : "front"
        let responseType = shouldSwitchToBack ? "CLIENT_CAMERA_SWITCH_BACK_RESPONSE" : "CLIENT_CAMERA_SWITCH_FRONT_RESPONSE"

        VCSettings.logger?.info(logMessage: "Remote camera switch to \(camera) signal received", logPeriod: .onProcess)

        if isSwitchedToRearCamera == shouldSwitchToBack {
            sendSignalResponse(type: responseType, success: true, message: "Already using \(camera) camera")
            return
        }

        Task { @MainActor [weak self] in
            guard let self = self,
                  let publication = self.room.localParticipant.videoTracks.first,
                  let localTrack = publication.track as? LocalVideoTrack,
                  let capturer = localTrack.capturer as? CameraCapturer else {
                VCSettings.logger?.warning(logMessage: "No local video track or capturer available", logPeriod: .onProcess)
                self?.sendSignalResponse(type: responseType, success: false, message: "Camera not available")
                return
            }

            do {
                try await capturer.switchCameraPosition()
                self.isSwitchedToRearCamera = shouldSwitchToBack
                // Repaint here too, not just on a local tap: the agent can
                // drive the camera over the data channel, and Android repaints
                // for remote switches as well.
                self.updateCameraSwitchButtonAppearance()
                VCSettings.logger?.info(logMessage: "Camera switched to \(camera) via remote signal", logPeriod: .onProcess)
                self.sendSignalResponse(type: responseType, success: true)
            } catch {
                VCSettings.logger?.error(logMessage: "Failed to switch camera: \(error)", logPeriod: .onProcess)
                self.sendSignalResponse(type: responseType, success: false, message: error.localizedDescription)
            }
        }
    }

    func handleRemoteFlashSignal(shouldTurnOn: Bool) {
        let state = shouldTurnOn ? "on" : "off"
        let responseType = shouldTurnOn ? "CLIENT_FLASH_ON_RESPONSE" : "CLIENT_FLASH_OFF_RESPONSE"

        VCSettings.logger?.info(logMessage: "Remote flash \(state) signal received", logPeriod: .onProcess)

        Task { @MainActor [weak self] in
            guard let self = self else { return }

            // The torch has to be configured on the very device the capture session is
            // running on. `AVCaptureDevice.default(for: .video)` hands back the physical
            // wide angle camera, while LiveKit captures through the virtual triple/dual
            // camera on most iPhones. Locking that other device interrupts the running
            // session and the local video freezes.
            guard let publication = self.room.localParticipant.videoTracks.first,
                  let localTrack = publication.track as? LocalVideoTrack,
                  let capturer = localTrack.capturer as? CameraCapturer,
                  let device = capturer.device else {
                VCSettings.logger?.warning(logMessage: "No video device available", logPeriod: .onProcess)
                self.sendSignalResponse(type: responseType, success: false, message: "No video device available")
                return
            }

            guard device.hasTorch, device.isTorchModeSupported(shouldTurnOn ? .on : .off) else {
                VCSettings.logger?.warning(logMessage: "Device does not support flash", logPeriod: .onProcess)
                self.sendSignalResponse(type: responseType, success: false, message: "Device does not support flash")
                return
            }

            guard device.position == .back else {
                VCSettings.logger?.warning(logMessage: "No flash unit available on this camera.", logPeriod: .onProcess)
                self.sendSignalResponse(type: responseType, success: false, message: "No flash unit available on this camera.")
                return
            }

            let isCurrentlyOn = device.torchMode == .on
            if isCurrentlyOn == shouldTurnOn {
                self.sendSignalResponse(type: responseType, success: true, message: "Already \(state)")
                return
            }

            // The torch stays unavailable for a moment while the capture session
            // restarts after a camera switch, which is exactly when the agent turns it
            // on. Give it a short window instead of failing straight away.
            if shouldTurnOn {
                for _ in 0 ..< 10 where !device.isTorchAvailable {
                    try? await Task.sleep(nanoseconds: 100_000_000)
                }

                guard device.isTorchAvailable else {
                    VCSettings.logger?.warning(logMessage: "Flash is not available right now", logPeriod: .onProcess)
                    self.sendSignalResponse(type: responseType, success: false, message: "Flash is not available right now")
                    return
                }
            }

            do {
                try device.lockForConfiguration()
                // A device left locked blocks the capturer from reconfiguring and
                // freezes the camera, so release it on every path out of here.
                defer { device.unlockForConfiguration() }

                if shouldTurnOn {
                    // The maximum level is rejected when the device is throttled, so
                    // fall back to the system default level rather than giving up.
                    do {
                        try device.setTorchModeOn(level: AVCaptureDevice.maxAvailableTorchLevel)
                    } catch {
                        VCSettings.logger?.warning(logMessage: "Max torch level unavailable, using default level: \(error)", logPeriod: .onProcess)
                        device.torchMode = .on
                    }
                } else {
                    device.torchMode = .off
                }

                VCSettings.logger?.info(logMessage: "Flash turned \(state)", logPeriod: .onProcess)
                self.sendSignalResponse(type: responseType, success: true)
            } catch {
                VCSettings.logger?.error(logMessage: "Failed to turn \(state) flash: \(error)", logPeriod: .onProcess)
                self.sendSignalResponse(type: responseType, success: false, message: error.localizedDescription)
            }
        }
    }

    // MARK: - VideoCall Signal Response
    func sendSignalResponse(type: String, success: Bool, message: String? = nil) {
        Task { @MainActor [weak self] in
            guard let self = self else { return }

            let response = VideoCallSignalResponse(
                type: type,
                success: success,
                message: message
            )

            do {
                let encoder = JSONEncoder()
                let data = try encoder.encode(response)
                try await self.room.localParticipant.publish(data: data, options: DataPublishOptions(reliable: true))
                VCSettings.logger?.info(logMessage: "Signal response sent: \(type), success: \(success)", logPeriod: .onProcess)
            } catch {
                VCSettings.logger?.error(logMessage: "Failed to send signal response: \(error)", logPeriod: .onProcess)
            }
        }
    }
}
