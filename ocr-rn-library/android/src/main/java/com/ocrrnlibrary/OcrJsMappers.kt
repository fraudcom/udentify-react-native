package com.ocrrnlibrary

import io.udentify.android.ocr.activities.Process
import io.udentify.android.ocr.model.IQAFeedback

/**
 * Maps the SDK's [IQAFeedback] enum (PascalCase, e.g. `ChipAbsent`) to the exact camelCase
 * string values `ocr-rn-library/src/constants/IQAFeedback.ts` expects. A naive
 * `.name.lowercase()` (e.g. "chipabsent") never matches the JS side's `"chipNotDetected"` and
 * silently collapses every non-success feedback to an unmatched value.
 */
fun jsIqaFeedbackValue(feedback: IQAFeedback): String = when (feedback) {
    IQAFeedback.Success -> "success"
    IQAFeedback.BlurDetected -> "blurDetected"
    IQAFeedback.GlareDetected -> "glareDetected"
    IQAFeedback.HologramGlare -> "hologramGlare"
    IQAFeedback.CardNotDetected -> "cardNotDetected"
    IQAFeedback.CardClassificationMismatch -> "cardClassificationMismatch"
    IQAFeedback.CardNotIntact -> "cardNotIntact"
    IQAFeedback.FaceNotDetected -> "faceNotDetected"
    IQAFeedback.MultipleDocumentsDetected -> "multipleDocumentsDetected"
    IQAFeedback.ChipAbsent -> "chipNotDetected"
    IQAFeedback.SignatureAbsent -> "signatureNotDetected"
    IQAFeedback.HiddenPhotoAbsent -> "hiddenPhotoNotDetected"
    IQAFeedback.PhotoCheatDetected -> "photoCheatDetected"
    else -> "other"
}

/**
 * Maps the SDK's `Process` enum (`frontSide`/`backSide`/`showImage`) to the
 * `'frontSide' | 'backSide' | 'bothSides'` values `iqa.types.ts` expects. Fixes the same
 * naive-lowercase bug as [jsIqaFeedbackValue] for this sibling field (`.name.lowercase()`
 * produced `"frontside"`, which never matched `"frontSide"`). `showImage` is the SDK's only
 * remaining case and has no separate JS concept, so it maps to `"bothSides"`.
 */
fun jsDocumentSideValue(side: Process?): String = when (side) {
    Process.frontSide -> "frontSide"
    Process.backSide -> "backSide"
    Process.showImage -> "bothSides"
    null -> "unknown"
}
