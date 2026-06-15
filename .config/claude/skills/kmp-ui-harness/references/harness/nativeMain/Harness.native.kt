package com.fromwau.echo.shared_client.debug

import androidx.compose.runtime.Composable

@Composable
actual fun Harness(content: @Composable () -> Unit) {
    content()
}
