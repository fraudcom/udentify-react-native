//
//  String_Ext.swift
//  UdentifyVC
//
//  Created by Sercan Çobanoğlu on 11.02.2025.
//

import UIKit
import UdentifyCommons


extension String {
    func localized() -> String {
        return udtfy.localized(in: LocalizationConfiguration.tableName, bundle: LocalizationConfiguration.bundle)
    }
}
