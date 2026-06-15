package com.fromwau.echo.shared_client.debug

import androidx.compose.runtime.Composable

/** Debug-only wrapper around the app UI. Real on desktop; no-op elsewhere. */
@Composable
expect fun Harness(content: @Composable () -> Unit)
