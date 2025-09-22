////
////  VCCameraController.swift
////  UdentifyVC
////
////  Created by Sercan Çobanoğlu on 30.01.2025.
////

import UIKit
import UdentifyCommons
import LiveKitClient

// MARK: - Delegate Protocol

public protocol VCCameraControllerDelegate: AnyObject {
    func cameraController(_ controller: VCCameraController, didChangeUserState state: UserState)
    func cameraController(_ controller: VCCameraController, participantType: ParticipantType, didChangeState state: ParticipantState)
    func cameraController(_ controller: VCCameraController, didFailWithError error: Error)
    func cameraControllerDidDismiss(_ controller: VCCameraController)
    func cameraControllerDidEndSessionSuccessfully(_ controller: VCCameraController)
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

// MARK: - VCCameraController
public class VCCameraController: UIViewController {
    
    // MARK: - Properties
    public weak var delegate: VCCameraControllerDelegate?
    
    private var activeTasks = [TaskEntry]()
    private var remoteParticipants: [RemoteParticipant] = []
    private var currentSettings: VCSettings
    
    @MainActor private var currentState: UserState {
        didSet {
            if oldValue != currentState {
                delegate?.cameraController(self, didChangeUserState: currentState)
            }
        }
    }
    
    private var serverURL: String
    private var wsURL: String
    private var transactionID: String
    private var username: String
    private var idleTimeout: Int
    
    private var isMuted: Bool = false
    private var isSwitchedToRearCamera: Bool = false
    private var isDismissalInProgress = false
    public var roomName: String?
    
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
        let text = Localization.notificationLabelTokenFetch
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = currentSettings.instructionLabelStyle.lineHeightMultiple  // Adjust this value to change the line spacing

        let attributedText = NSAttributedString(
            string: text,
            attributes: [
                .paragraphStyle: paragraphStyle,
                .font: currentSettings.instructionLabelStyle.font,
                .foregroundColor: currentSettings.instructionLabelStyle.textColor
            ]
        )
        
        label.attributedText = attributedText
        label.textAlignment = currentSettings.instructionLabelStyle.textAlignment
        label.numberOfLines = currentSettings.instructionLabelStyle.numberOfLines
        label.lineBreakMode = currentSettings.instructionLabelStyle.lineBreakMode
        return label
    }()
    
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
        
        var constraints = [
            waitingScreenLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            waitingScreenLabel.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: currentSettings.instructionLabelStyle.leading),
            waitingScreenLabel.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -currentSettings.instructionLabelStyle.trailing)
        ]

        if let verticalPosition = currentSettings.instructionLabelStyle.verticalPosition {
            switch verticalPosition {
            case .center:
                constraints.append(waitingScreenLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor))
            case .top(offset: let offset):
                constraints.append(waitingScreenLabel.topAnchor.constraint(equalTo: view.topAnchor, constant: offset))
            case .bottom(offset: let offset):
                constraints.append(waitingScreenLabel.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -offset))
            case .custom(y: let y):
                constraints.append(waitingScreenLabel.topAnchor.constraint(equalTo: view.topAnchor, constant: y))
            @unknown default:
                constraints.append(waitingScreenLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor))
            }
        } else {
            // Fallback: center vertically if no verticalPosition is provided.
            constraints.append(waitingScreenLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor))
        }

        NSLayoutConstraint.activate(constraints)
        return view
    }()
    
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
    
    // MARK: - Constraints
    private var localPipConstraints: [NSLayoutConstraint] = []
    private var remoteFullScreenConstraints: [NSLayoutConstraint] = []
    
    // MARK: - Initializer
    public init(delegate: VCCameraControllerDelegate?,
                serverURL: String,
                wsURL: String,
                transactionID: String,
                username: String,
                idleTimeout: Int = 100,
                settings: VCSettings,
                logLevel: LogLevel = .info) {
        
        VCSettings.logger = LogHeader(logLevel: logLevel, txid: transactionID, os: .iOS, dateProcessStart: Date(), module: .VIDEO_CALL)
        self.currentState = .initiating
        self.delegate = delegate
        self.serverURL = serverURL
        self.wsURL = wsURL
        self.transactionID = transactionID
        self.username = username
        self.idleTimeout = idleTimeout
        self.currentSettings = settings
        
        LocalizationConfiguration.tableName = settings.tableName
        LocalizationConfiguration.bundle = settings.bundle
        
        super.init(nibName: nil, bundle: nil)
        
        VCSettings.logger?.debug(logMessage: "Instantiating VCCameraController...", logPeriod: .preProcess)
    }
    
    public required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented. Use init(delegate:serverURL:wsURL:transactionID:username:settings:logLevel:) instead.")
    }
    
    // MARK: - Lifecycle
    public override func loadView() {
        super.loadView()
        
        view.addSubview(localVideoView)
        updateMuteButtonAppearance(forMutedState: isMuted)
        updateCameraSwitchButtonAppearance()
        localVideoView.isHidden = true
        
        // Set up constraints for localVideoView
        localPipConstraints = generateChildConstraints(for: localVideoView,
                                                       in: view,
                                                       horizontalSizing: currentSettings.pipViewStyle.horizontalSizing!,
                                                       verticalSizing: currentSettings.pipViewStyle.verticalSizing!)
        remoteFullScreenConstraints = [
            remoteVideoView.topAnchor.constraint(equalTo: view.topAnchor),
            remoteVideoView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            remoteVideoView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            remoteVideoView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ]
        
        NSLayoutConstraint.activate(localPipConstraints)
        view.addSubview(waitingScreenView)
        NSLayoutConstraint.activate([
            waitingScreenView.topAnchor.constraint(equalTo: view.topAnchor),
            waitingScreenView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            waitingScreenView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            waitingScreenView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        
        view.addSubview(muteButton)
        
        muteButton.isHidden = true
        let muteButtonConstraints = generateChildConstraints(
            for: muteButton,
            in: view,
            horizontalSizing: .fixed(
                width: currentSettings.muteButtonStyle.size,
                horizontalPosition: currentSettings.muteButtonStyle.horizontalPosition
            ),
            verticalSizing: .fixed(
                height: currentSettings.muteButtonStyle.size,
                verticalPosition: currentSettings.muteButtonStyle.verticalPosition
            )
        )
        NSLayoutConstraint.activate(muteButtonConstraints)
        
        view.addSubview(cameraSwitchButton)
        
        cameraSwitchButton.isHidden = true
        let cameraSwitchButtonConstraints = generateChildConstraints(
            for: cameraSwitchButton,
            in: view,
            horizontalSizing: .fixed(
                width: currentSettings.cameraSwitchButtonStyle.size,
                horizontalPosition: currentSettings.cameraSwitchButtonStyle.horizontalPosition
            ),
            verticalSizing: .fixed(
                height: currentSettings.cameraSwitchButtonStyle.size,
                verticalPosition: currentSettings.cameraSwitchButtonStyle.verticalPosition
            )
        )
        NSLayoutConstraint.activate(cameraSwitchButtonConstraints)
        
        
    }
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        VCSettings.logger?.debug(logMessage: "VCCameraController is loaded.", logPeriod: .preProcess)
    }
    
    public override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
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
                self.waitingScreenLabel.text = Localization.notificationLabelDefault
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
    
    public override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        VCSettings.logger?.info(logMessage: "VCCameraController will disappear", logPeriod: .postProcess)
        countdownTimer?.invalidate()
        countdownTimer = nil
        
        activeTasks.forEach { $0.task.cancel() }
        activeTasks.removeAll()
        
        remoteParticipants.removeAll()
        
        // can be checked if isMovingFromParent || isBeingDismissed
        VCSettings.logger?.info(logMessage: "VCCameraController is disappearing; disconnecting room...", logPeriod: .preProcess)
        Task { @MainActor in
            await room.disconnect()
        }
    }
    
    // MARK: - Constraint Helpers
    private func generateChildConstraints(for childView: UIView, in container: UIView, horizontalSizing: UdentifyHorizontalSizing, verticalSizing: UdentifyVerticalSizing) -> [NSLayoutConstraint] {
        var constraints = [NSLayoutConstraint]()
        
        switch horizontalSizing {
        case .fixed(let width, let horizontalPosition):
            constraints.append(childView.widthAnchor.constraint(equalToConstant: width))
            switch horizontalPosition {
            case .center:
                constraints.append(childView.centerXAnchor.constraint(equalTo: container.centerXAnchor))
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
                constraints.append(childView.bottomAnchor.constraint(equalTo: container.safeAreaLayoutGuide.bottomAnchor, constant: -offset))
            case .custom(y: let y):
                constraints.append(childView.topAnchor.constraint(equalTo: container.topAnchor, constant: y))
            }
        case .anchors(top: let top, bottom: let bottom):
            constraints.append(childView.topAnchor.constraint(equalTo: container.topAnchor, constant: top))
            constraints.append(childView.bottomAnchor.constraint(equalTo: container.safeAreaLayoutGuide.bottomAnchor, constant: -bottom))
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
            VCSettings.logger?.info(logMessage: "Dismissing the VCCameraController...", logPeriod: .preProcess)
            
            Task { @MainActor in
                await room.disconnect()
            }
            
            if let navigationController = self.navigationController {
                if navigationController.topViewController === self {
                    navigationController.popViewController(animated: true)
                    self.delegate?.cameraControllerDidDismiss(self)
                } else {
                    VCSettings.logger?.info(logMessage: "VCCameraController is not on top; skipping pop and trying to dismiss.", logPeriod: .preProcess)
                    self.dismiss(animated: true) { [weak self] in
                        guard let self = self else { return }
                        self.delegate?.cameraControllerDidDismiss(self)
                    }
                }
            } else if self.presentingViewController != nil {
                self.dismiss(animated: true) { [weak self] in
                    guard let self = self else { return }
                    self.delegate?.cameraControllerDidDismiss(self)
                }
            }
        }
    }
    
    // MARK: - Manage Participants
    @MainActor
    private func setParticipants() async {
        VCSettings.logger?.info(logMessage: "Setting participants...", logPeriod: .preProcess)
        self.updateLocalMicrophoneState(toMuted: true)
        
        if room.remoteParticipants.count > 0 {
            for participant in room.remoteParticipants.values {
                if participant.metadata == "agent" {
                    VCSettings.logger?.debug(logMessage: "Found an agent participant: \(participant.identity)", logPeriod: .preProcess)
                    if let remoteTrack = participant.videoTracks.first?.track as? VideoTrack {
                        VCSettings.logger?.debug(logMessage: "Found remote video track", logPeriod: .preProcess)
                        remoteVideoView.track = remoteTrack
                        if remoteVideoView.superview == nil {
                            view.insertSubview(remoteVideoView, belowSubview: localVideoView)
                            NSLayoutConstraint.activate(remoteFullScreenConstraints)
                        }
                    } else {
                        VCSettings.logger?.warning(logMessage: "No remote video track found", logPeriod: .preProcess)
                    }
                    break
                }
            }
        } else {
            addWaitingScreenIfNeeded()
            waitingScreenLabel.text = Localization.notificationLabelDefault
            do {
                self.localVideoView.isHidden = true
                self.muteButton.isHidden = true
                self.cameraSwitchButton.isHidden = true
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
            view.addSubview(waitingScreenView)
            NSLayoutConstraint.activate([
                waitingScreenView.topAnchor.constraint(equalTo: view.topAnchor),
                waitingScreenView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                waitingScreenView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                waitingScreenView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
            ])
        }
    }
    
    private func removeRemoteVideoViewIfNeeded() {
        guard remoteVideoView.superview != nil else { return }
        NSLayoutConstraint.deactivate(remoteFullScreenConstraints)
        remoteVideoView.removeFromSuperview()
        remoteVideoView.track = nil
    }
    
    @objc private func muteButtonTapped() {
        isMuted.toggle()
        updateLocalMicrophoneState(toMuted: isMuted)
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
            } catch {
                VCSettings.logger?.error(logMessage: "Failed to switch camera via LiveKit: \(error)", logPeriod: .onProcess)
            }
        }
    }
    
    private func updateLocalMicrophoneState(toMuted muted: Bool) {
        Task { [weak self] in
            guard let self = self else { return }
            self.isMuted = muted
            do {
                try await room.localParticipant.setMicrophone(enabled: !isMuted)
                await MainActor.run {
                    self.updateMuteButtonAppearance(forMutedState: isMuted)
                }
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
            view.insertSubview(remoteVideoView, belowSubview: localVideoView)
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
                        self.muteButton.isHidden = false
                        self.cameraSwitchButton.isHidden = false
                        self.localVideoView.isHidden = false
                        try await self.room.localParticipant.setCamera(enabled: true)
                        self.updateLocalMicrophoneState(toMuted: false)
                    } catch {
                        VCSettings.logger?.error(logMessage: "Error enabling camera.", logPeriod: .preProcess)
                        VCSettings.logger?.error(error: error, logPeriod: .preProcess)
                    }
                    if let localTrack = self.room.localParticipant.videoTracks.first?.track as? VideoTrack {
                        self.localVideoView.track = localTrack
                    }
                    self.transitionToOperatorJoinedLayout()
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
        waitingScreenLabel.text = String(format: Localization.notificationLabelCountdown, countdownSeconds)
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

// MARK: - RoomDelegate
extension VCCameraController: RoomDelegate {
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
                waitingScreenLabel.text = Localization.notificationLabelDefault
                do {
                    self.muteButton.isHidden = true
                    self.cameraSwitchButton.isHidden = true
                    self.localVideoView.isHidden = true
                    try await room.localParticipant.setCamera(enabled: false)
                    self.updateLocalMicrophoneState(toMuted: true)
                } catch {
                    VCSettings.logger?.error(logMessage: "Error disabling camera: \(error)", logPeriod: .onProcess)
                    VCSettings.logger?.error(error: error, logPeriod: .onProcess)
                }
                self.dismissController()
            case .connecting:
                
                if self.isDismissalInProgress { return }
                currentState = .connecting
            case .reconnecting:
                
                if self.isDismissalInProgress { return }
                currentState = .reconnecting
            case .connected:
                
                if self.isDismissalInProgress { return }
                currentState = .connected
                await setParticipants()
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
                    self.view.insertSubview(self.remoteVideoView, belowSubview: self.localVideoView)
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
                        startCountdown(from: waitTimeInSeconds)
                        VCSettings.logger?.info(logMessage: "Assigned video track for participant \(participant.identity)", logPeriod: .onProcess)
                        if self.remoteVideoView.superview == nil {
                            self.view.insertSubview(self.remoteVideoView, belowSubview: self.localVideoView)
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
    
    public func room(_ room: Room, participant: RemoteParticipant?, didReceiveData data: Data, forTopic topic: String) {
        if let _ = String(data: data, encoding: .utf8) {
            do {
                let decoder = JSONDecoder()
                let signal = try decoder.decode(VideoCallSignal.self, from: data)
                if signal.type == "TERMINATE_SESSION_SIGNAL" &&
                    signal.targetIdentity == room.localParticipant.identity?.stringValue {
                    DispatchQueue.main.async {
                        self.handleSessionTermination()
                    }
                    return
                }
            } catch {
                // Handle other message types if needed.
            }
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
}
