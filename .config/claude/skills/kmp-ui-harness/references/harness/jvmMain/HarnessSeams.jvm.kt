package com.fromwau.echo.shared_client.debug

import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.awt.ComposeWindow
import androidx.compose.ui.semantics.SemanticsNode
import java.awt.Window
import javax.swing.SwingUtilities

@OptIn(ExperimentalComposeUiApi::class)
actual fun harnessSemanticsRoots(): List<SemanticsNode> =
    activeComposeWindow()?.semanticsOwners?.map { it.rootSemanticsNode } ?: emptyList()

actual fun <T> harnessRunOnUiThread(block: () -> T): T {
    var result: Result<T>? = null
    SwingUtilities.invokeAndWait { result = runCatching(block) }
    return result!!.getOrThrow()
}

actual fun harnessScreenshotPng(): ByteArray? = activeWindowScreenshotPng()

/** The single visible Compose window, or null if none is showing yet. */
internal fun activeComposeWindow(): ComposeWindow? =
    Window.getWindows().filterIsInstance<ComposeWindow>().firstOrNull { it.isShowing }
