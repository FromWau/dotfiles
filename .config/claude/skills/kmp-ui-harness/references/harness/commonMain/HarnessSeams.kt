package com.fromwau.echo.shared_client.debug

import androidx.compose.ui.semantics.SemanticsNode

/**
 * The three platform seams the harness is built on. Everything else (layout dump, hit-testing,
 * input, scroll) is common and expressed purely in terms of these, so adding a target means
 * implementing only these actuals plus a control-server transport.
 */

/** Root semantics nodes of every live owner (main window + popups/dialogs); empty if no UI yet. */
expect fun harnessSemanticsRoots(): List<SemanticsNode>

/** Run [block] on the platform UI thread and return its result (EDT on desktop, main on Android). */
expect fun <T> harnessRunOnUiThread(block: () -> T): T

/** In-process PNG screenshot of the active UI, or null if it can't be produced. */
expect fun harnessScreenshotPng(): ByteArray?
