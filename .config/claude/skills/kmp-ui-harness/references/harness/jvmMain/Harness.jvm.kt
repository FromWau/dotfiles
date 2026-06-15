package com.fromwau.echo.shared_client.debug

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect

@Composable
actual fun Harness(content: @Composable () -> Unit) {
    LaunchedEffect(Unit) { ControlServer.startOnce() }
    content()
}
