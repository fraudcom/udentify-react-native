//  CountryCodeMapper.swift
//  OCRLibrary
//  Resolves a JS country string to the SDK's own Country value.

import Foundation
import UdentifyCommons

class CountryCodeMapper {

  /// Non-ISO spellings earlier versions of this library accepted. Kept so
  /// integrations already sending them keep working; every ISO 3166-1 alpha-3
  /// code is resolved by `Country(rawValue:)` and must not be listed here.
  private static let legacyAliases: [String: String] = [
    "TR": "TUR", "TURKEY": "TUR",
    "GB": "GBR", "UK": "GBR", "UNITED_KINGDOM": "GBR",
    "CO": "COL", "COLOMBIA": "COL",
    "ES": "ESP", "SPAIN": "ESP",
    "BR": "BRA", "BRAZIL": "BRA",
    "US": "USA", "UNITED_STATES": "USA",
    "PE": "PER", "PERU": "PER",
    "EC": "ECU", "ECUADOR": "ECU",
    "NL": "NLD", "NETHERLANDS": "NLD",
    "DE": "DEU", "GERMANY": "DEU",
    "FR": "FRA", "FRANCE": "FRA",
    "IT": "ITA", "ITALY": "ITA",
  ]

  static func toCountry(_ countryCode: String) -> UdentifyCommons.Country {
    let normalized = countryCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    let resolved = legacyAliases[normalized] ?? normalized

    if let country = Country(rawValue: resolved) {
      return country
    }

    print("CountryCodeMapper - Unsupported country code '\(countryCode)', defaulting to TUR. "
          + "Supported: \(Country.allCases.map(\.rawValue).joined(separator: ", "))")
    return .TUR
  }
}
