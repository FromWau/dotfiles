package com.fromwau.echo.shared_client.debug

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.view.PixelCopy
import android.view.View
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsOwner
import java.io.ByteArrayOutputStream
import java.util.concurrent.CountDownLatch

/**
 * The AndroidComposeView captured by the Android [Harness] (via `LocalView`). Its `semanticsOwner`
 * is internal API, so [harnessSemanticsRoots] reaches it by reflection — fragile across Compose
 * versions, acceptable for a debug-only harness. Null until the Harness composes.
 */
@Volatile
internal var harnessView: View? = null

actual fun harnessSemanticsRoots(): List<SemanticsNode> {
    val view = harnessView ?: return emptyList()
    val owner = runCatching {
        view.javaClass.getMethod("getSemanticsOwner").invoke(view) as SemanticsOwner
    }.getOrNull() ?: return emptyList()
    return listOf(owner.rootSemanticsNode)
}

actual fun <T> harnessRunOnUiThread(block: () -> T): T {
    if (Looper.myLooper() == Looper.getMainLooper()) return block()
    var result: Result<T>? = null
    val latch = CountDownLatch(1)
    Handler(Looper.getMainLooper()).post {
        result = runCatching(block)
        latch.countDown()
    }
    latch.await()
    return result!!.getOrThrow()
}

actual fun harnessScreenshotPng(): ByteArray? {
    val view = harnessView ?: return null
    val width = view.width
    val height = view.height
    val window = (view.context as? Activity)?.window
    if (width <= 0 || height <= 0 || window == null) return null
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val location = IntArray(2).also { view.getLocationInWindow(it) }
    val src = Rect(location[0], location[1], location[0] + width, location[1] + height)
    val latch = CountDownLatch(1)
    var ok = false
    PixelCopy.request(
        window,
        src,
        bitmap,
        { result ->
            ok = result == PixelCopy.SUCCESS
            latch.countDown()
        },
        Handler(Looper.getMainLooper()),
    )
    latch.await()
    if (!ok) return null
    return ByteArrayOutputStream().use { out ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        out.toByteArray()
    }
}
