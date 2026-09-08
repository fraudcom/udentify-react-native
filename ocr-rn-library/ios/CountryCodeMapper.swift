//
//  CountryCodeMapper.swift
//  OCRLibrary
//
//  Shared country code mapping for OCR SDK
//

import Foundation
import UdentifyCommons

class CountryCodeMapper {
  
  static func toCountry(_ countryCode: String) -> UdentifyCommons.Country {
    switch countryCode.uppercased() {
    case "TUR", "TR", "TURKEY":
      return .TUR
    case "GBR", "GB", "UK", "UNITED_KINGDOM":
      return .GBR
    case "COL", "CO", "COLOMBIA":
      return .COL
    case "ESP", "ES", "SPAIN":
      return .ESP
    case "BRA", "BR", "BRAZIL":
      return .BRA
    case "USA", "US", "UNITED_STATES":
      return .USA
    case "PER", "PE", "PERU":
      return .PER
    case "ECU", "EC", "ECUADOR":
      return .ECU
    case "NLD", "NL", "NETHERLANDS":
      return .NLD
    case "DEU", "DE", "GERMANY":
      return .DEU
    case "FRA", "FR", "FRANCE":
      return .FRA
    case "ITA", "IT", "ITALY":
      return .ITA
    default:
      print("CountryCodeMapper - Unknown country code: \(countryCode), defaulting to TUR")
      return .TUR
    }
  }
}
