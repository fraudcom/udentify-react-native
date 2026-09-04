//
//  File.swift
//  UdentifyVC
//
//  Created by Sercan Çobanoğlu on 6.02.2025.
//

import AVFoundation
import UIKit
import UdentifyCommons

public struct VCSettings {

    static var logger: LogHeader?

    public let bundle: Bundle
    public let tableName: String?
    public let backgroundColor: UIColor
    public let backgroundStyle: UdentifyImageStyle?
    public let overlayImageStyle: UdentifyImageStyle?
    public let muteButtonStyle: VCMuteButtonStyle
    public let cameraSwitchButtonStyle: VCCameraSwitchButtonStyle
    public let pipViewStyle: UdentifyViewStyle
    public let instructionLabelStyle: UdentifyTextStyle


    public init(
        bundle: Bundle = .main,
        tableName: String? = nil,
        backgroundColor: UIColor? = nil,
        backgroundStyle: UdentifyImageStyle? = nil,
        overlayImageStyle: UdentifyImageStyle? = nil,
        muteButtonStyle: VCMuteButtonStyle? = nil,
        cameraSwitchButtonStyle: VCCameraSwitchButtonStyle? = nil,
        pipViewStyle: UdentifyViewStyle? = nil,
        instructionLabelStyle: UdentifyTextStyle? = nil,
        requestTimeout: Double = 30)
    {
        self.bundle = bundle
        self.tableName = tableName
        
        self.backgroundColor = backgroundColor ?? .black
        
        self.backgroundStyle = backgroundStyle
        self.overlayImageStyle = overlayImageStyle
        
        self.muteButtonStyle = muteButtonStyle ?? VCMuteButtonStyle()
        self.cameraSwitchButtonStyle = cameraSwitchButtonStyle ?? VCCameraSwitchButtonStyle()
        
        let defaultHorizontalSizing: UdentifyHorizontalSizing = .fixed(width: 90, horizontalPosition: .right(offset: 16))
        let defaultVerticalSizing: UdentifyVerticalSizing = .fixed(height: 135, verticalPosition: .bottom(offset: 0))

        if let pip = pipViewStyle {
            self.pipViewStyle = UdentifyViewStyle(
                backgroundColor: .clear,
                borderColor: pip.borderColor,
                cornerRadius: pip.cornerRadius,
                borderWidth: pip.borderWidth,
                horizontalSizing: pip.horizontalSizing ?? defaultHorizontalSizing,
                verticalSizing: pip.verticalSizing ?? defaultVerticalSizing
            )
        } else {
            self.pipViewStyle = UdentifyViewStyle(
                backgroundColor: .clear,
                horizontalSizing: defaultHorizontalSizing,
                verticalSizing: defaultVerticalSizing
            )
        }
        

        self.instructionLabelStyle = instructionLabelStyle ?? UdentifyTextStyle(font: UIFont.systemFont(ofSize: 20, weight: .medium), textColor: .white, numberOfLines: 0, leading: 35, trailing: 35)

        if WebService.shared.timeout != requestTimeout {
            WebService.shared = WebService(requestTimeout: requestTimeout)
        }

    }

}
