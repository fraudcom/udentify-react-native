package com.livenessrnlibrary

/**
 * Face recognition method enumeration
 * Defines the type of face recognition operation to perform
 */
enum class FaceRecognitionMethod {
    /**
     * Registration - Used to register a new user
     */
    REGISTER,
    
    /**
     * Authentication - Used to authenticate an existing user
     */
    AUTHENTICATION,

    /**
     * Identification - Used to identify a user against a named list
     */
    IDENTIFICATION
}