package com.fromwau.echo.shared_client.debug

import com.fromwau.echo.core.logger.Log
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.cio.CIO
import io.ktor.server.engine.embeddedServer
import io.ktor.server.request.receiveText
import io.ktor.server.response.respondBytes
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Debug-only localhost control server, started once by the Android [Harness] actual. Identical
 * transport to the desktop server: a thin HTTP layer over the platform-neutral entrypoints in
 * HarnessControl/HarnessSeams. Requires `android.permission.INTERNET` (debug only).
 */
object ControlServer {
    /**
     * Control-server port. Defaults to 6699, overridable via the `ECHO_HARNESS_PORT` env var for
     * parity with desktop (lets a host script pick the port to `adb forward`).
     */
    val PORT: Int = System.getenv("ECHO_HARNESS_PORT")?.toIntOrNull() ?: 6699
    private val started = AtomicBoolean(false)

    fun startOnce() {
        if (!started.compareAndSet(false, true)) return
        embeddedServer(CIO, host = "127.0.0.1", port = PORT) {
            routing {
                get("/layout") { call.respondText(harnessLayoutJson(), ContentType.Application.Json) }
                post("/tap") {
                    val (x, y) = call.receiveText().parseXy()
                    call.respondText(if (harnessTap(x, y)) "ok" else "miss")
                }
                post("/longPress") {
                    val (x, y) = call.receiveText().parseXy()
                    call.respondText(if (harnessLongPress(x, y)) "ok" else "miss")
                }
                post("/setText") {
                    val parts = call.receiveText().split(",", limit = 3)
                    val hit = harnessSetText(parts[0].trim().toInt(), parts[1].trim().toInt(), parts.getOrElse(2) { "" })
                    call.respondText(if (hit) "ok" else "miss")
                }
                post("/tapLabel") {
                    call.respondText(if (harnessTapLabel(call.receiveText().trim())) "ok" else "miss")
                }
                post("/longPressLabel") {
                    call.respondText(if (harnessLongPressLabel(call.receiveText().trim())) "ok" else "miss")
                }
                post("/setTextLabel") {
                    val parts = call.receiveText().split(",", limit = 2)
                    val hit = harnessSetTextLabel(parts[0].trim(), parts.getOrElse(1) { "" })
                    call.respondText(if (hit) "ok" else "miss")
                }
                post("/scroll") {
                    val nums = call.receiveText().trim().split(",").map { it.trim().toInt() }
                    call.respondText(if (harnessScroll(nums)) "ok" else "miss")
                }
                get("/screenshot") {
                    val png = harnessScreenshotPng()
                    if (png == null) {
                        call.respondText("screenshot failed (no active window)", status = HttpStatusCode.InternalServerError)
                    } else {
                        call.respondBytes(png, ContentType.Image.PNG)
                    }
                }
            }
        }.start(wait = false)
        Log.tag("Harness").i { "UI harness control server on http://127.0.0.1:$PORT" }
    }
}

/** Parse "x,y" into a coordinate pair. */
private fun String.parseXy(): Pair<Int, Int> {
    val parts = trim().split(",")
    return parts[0].trim().toInt() to parts[1].trim().toInt()
}
