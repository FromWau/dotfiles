package com.fromwau.echo.shared_client.debug

import org.jetbrains.skia.EncodedImageFormat
import org.jetbrains.skia.Image
import org.jetbrains.skiko.SkiaLayer
import java.awt.Component
import java.awt.Container

/**
 * In-process screenshot of the active Compose window. Compose Desktop renders through Skiko;
 * [SkiaLayer.screenshot] replays the last rendered frame into a Skia bitmap, which we encode to
 * PNG. No external tool, so it works on every desktop OS/compositor, is immune to the Wayland
 * black-capture that breaks `java.awt.Robot`, and captures the Echo window specifically (not
 * whatever happens to be focused). Returns null if the window or its Skia layer can't be found.
 */
fun activeWindowScreenshotPng(): ByteArray? = harnessRunOnUiThread {
    runCatching {
        val window = activeComposeWindow() ?: return@runCatching null
        val layer = findSkiaLayer(window) ?: return@runCatching null
        val bitmap = layer.screenshot() ?: return@runCatching null
        Image.makeFromBitmap(bitmap).encodeToData(EncodedImageFormat.PNG)?.bytes
    }.getOrNull()
}

/** Depth-first search for the Skiko render surface under [component] (the window content). */
private fun findSkiaLayer(component: Component): SkiaLayer? = when (component) {
    is SkiaLayer -> component
    is Container -> component.components.firstNotNullOfOrNull { findSkiaLayer(it) }
    else -> null
}
