package com.fromwau.echo.shared_client.debug

import androidx.compose.ui.semantics.SemanticsNode

// iOS/native has no control-server transport yet, so the harness is a no-op there (Harness.native
// just renders content). These actuals exist only to satisfy the common expects.

actual fun harnessSemanticsRoots(): List<SemanticsNode> = emptyList()

actual fun <T> harnessRunOnUiThread(block: () -> T): T = block()

actual fun harnessScreenshotPng(): ByteArray? = null
