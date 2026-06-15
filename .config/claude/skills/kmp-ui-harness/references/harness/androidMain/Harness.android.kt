package com.fromwau.echo.shared_client.debug

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalView

/**
 * Android harness: capture the hosting `AndroidComposeView` (for [harnessSemanticsRoots]) and start
 * the localhost control server. Only ever composed in debug builds (the App wrapper gates on
 * Build.DEBUG), so it's stripped from release along with the rest of the harness.
 */
@Composable
actual fun Harness(content: @Composable () -> Unit) {
    val view = LocalView.current
    DisposableEffect(view) {
        harnessView = view
        ControlServer.startOnce()
        onDispose { harnessView = null }
    }
    content()
}
