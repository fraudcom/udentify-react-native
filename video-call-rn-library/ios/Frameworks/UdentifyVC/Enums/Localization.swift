//
//  Localization.swift
//  UdentifyVC
//
//  Created by Sercan Çobanoğlu on 11.02.2025.
//


import Foundation
import UdentifyCommons

enum Localization{

    // Computed rather than `static let`: a stored constant resolves against
    // LocalizationConfiguration.tableName/.bundle only once (the first access,
    // process-wide) and then caches that value forever, so later calls that
    // configure a different table/bundle would keep seeing the first-resolved
    // string instead of a fresh lookup.
    static var notificationLabelDefault: String { "udentify_vc_notification_label_default".localized() }
    static var notificationLabelCountdown: String { "udentify_vc_notification_label_countdown".localized() }
    static var notificationLabelTokenFetch: String { "udentify_vc_notification_label_token_fetch".localized() }

}
