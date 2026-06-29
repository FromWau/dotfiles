package com.fromwau.echo.shared_client.debug

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.text.AnnotatedString

/**
 * Platform-neutral harness control logic: layout dump, hit-testing and input via Compose semantics
 * actions. These are the entrypoints each platform's control server calls; every one runs on the
 * UI thread ([harnessRunOnUiThread]) and reads the live tree from [harnessSemanticsRoots], so the
 * same logic drives any target. Coordinates are window-content px matching `/layout` bounds.
 */

/** `/layout` -> JSON of the semantics tree (`{"owners":[...]}`). */
fun harnessLayoutJson(): String = harnessRunOnUiThread {
    uiNodesToJson(harnessSemanticsRoots().map { it.toUiNode() })
}

/** `/tap x,y` -> click the smallest OnClick node containing (x,y). */
fun harnessTap(x: Int, y: Int): Boolean = harnessRunOnUiThread {
    nodeWithActionAt(x, y) { it.config.getOrNull(SemanticsActions.OnClick) != null }
        ?.config?.getOrNull(SemanticsActions.OnClick)?.action?.invoke() != null
}

/** `/longPress x,y` -> OnLongClick the smallest matching node. */
fun harnessLongPress(x: Int, y: Int): Boolean = harnessRunOnUiThread {
    nodeWithActionAt(x, y) { it.config.getOrNull(SemanticsActions.OnLongClick) != null }
        ?.config?.getOrNull(SemanticsActions.OnLongClick)?.action?.invoke() != null
}

/** `/setText x,y,text` -> SetText on the field at (x,y). */
fun harnessSetText(x: Int, y: Int, text: String): Boolean = harnessRunOnUiThread {
    nodeWithActionAt(x, y) { it.config.getOrNull(SemanticsActions.SetText) != null }
        ?.config?.getOrNull(SemanticsActions.SetText)?.action?.invoke(AnnotatedString(text)) != null
}

/**
 * `/tapLabel <label>` -> click the smallest OnClick node whose label (its Text, else its
 * ContentDescription) contains <label>, case-insensitive. Robust where coordinates aren't: it
 * reaches icon-only buttons by their accessibility label and never depends on window size / DPI.
 */
fun harnessTapLabel(label: String): Boolean = harnessRunOnUiThread {
    nodeWithLabel(label) { it.config.getOrNull(SemanticsActions.OnClick) != null }
        ?.config?.getOrNull(SemanticsActions.OnClick)?.action?.invoke() != null
}

/** `/longPressLabel <label>` -> OnLongClick the smallest node whose label contains <label>. */
fun harnessLongPressLabel(label: String): Boolean = harnessRunOnUiThread {
    nodeWithLabel(label) { it.config.getOrNull(SemanticsActions.OnLongClick) != null }
        ?.config?.getOrNull(SemanticsActions.OnLongClick)?.action?.invoke() != null
}

/** `/setTextLabel <label>,<text>` -> SetText on the smallest field whose label contains <label>. */
fun harnessSetTextLabel(label: String, text: String): Boolean = harnessRunOnUiThread {
    nodeWithLabel(label) { it.config.getOrNull(SemanticsActions.SetText) != null }
        ?.config?.getOrNull(SemanticsActions.SetText)?.action?.invoke(AnnotatedString(text)) != null
}

/** `/scroll` -> `[dx,dy]` (largest scrollable) or `[x,y,dx,dy]` (scrollable at point). +dx right, +dy down. */
fun harnessScroll(nums: List<Int>): Boolean = harnessRunOnUiThread {
    when (nums.size) {
        2 -> scrollLargest(nums[0], nums[1])
        4 -> scrollAtPoint(nums[0], nums[1], nums[2], nums[3])
        else -> false
    }
}

// --- internals; callers above already put us on the UI thread ---

private fun allNodes(): List<SemanticsNode> = harnessSemanticsRoots().flatMap { collect(it) }

private fun collect(node: SemanticsNode): List<SemanticsNode> = buildList {
    add(node)
    node.children.forEach { addAll(collect(it)) }
}

/** Smallest (deepest) node containing (x,y) that satisfies [has]. */
private fun nodeWithActionAt(x: Int, y: Int, has: (SemanticsNode) -> Boolean): SemanticsNode? {
    val point = Offset(x.toFloat(), y.toFloat())
    return allNodes()
        .filter { has(it) && it.boundsInWindow.contains(point) }
        .minByOrNull { it.boundsInWindow.width * it.boundsInWindow.height }
}

/**
 * A node's display label: its Text, else its ContentDescription — the same value `/layout` emits as
 * `text`. Shared by the dump ([toUiNode]) and label hit-testing so the two never diverge.
 */
internal fun SemanticsNode.nodeLabel(): String? =
    config.getOrNull(SemanticsProperties.Text)?.joinToString(" ") { it.text }
        ?: config.getOrNull(SemanticsProperties.ContentDescription)?.joinToString(" ")

/** Smallest node satisfying [has] whose label contains [label] (case-insensitive). */
private fun nodeWithLabel(label: String, has: (SemanticsNode) -> Boolean): SemanticsNode? {
    val needle = label.lowercase()
    return allNodes()
        .filter { has(it) && it.nodeLabel()?.lowercase()?.contains(needle) == true }
        .minByOrNull { it.boundsInWindow.width * it.boundsInWindow.height }
}

private fun scrollAtPoint(x: Int, y: Int, dx: Int, dy: Int): Boolean {
    val point = Offset(x.toFloat(), y.toFloat())
    return scrollableNodes(dx, dy)
        .filter { it.boundsInWindow.contains(point) }
        .minByOrNull { it.boundsInWindow.width * it.boundsInWindow.height }
        ?.let { invokeScroll(it, dx, dy) } == true
}

private fun scrollLargest(dx: Int, dy: Int): Boolean =
    scrollableNodes(dx, dy)
        .maxByOrNull { it.boundsInWindow.width * it.boundsInWindow.height }
        ?.let { invokeScroll(it, dx, dy) } == true

/** Scrollable nodes that can move on every requested axis (dx != 0 -> horizontal, dy != 0 -> vertical). */
private fun scrollableNodes(dx: Int, dy: Int): List<SemanticsNode> =
    allNodes().filter {
        it.config.getOrNull(SemanticsActions.ScrollBy) != null &&
            (dx == 0 || it.config.getOrNull(SemanticsProperties.HorizontalScrollAxisRange) != null) &&
            (dy == 0 || it.config.getOrNull(SemanticsProperties.VerticalScrollAxisRange) != null)
    }

private fun invokeScroll(node: SemanticsNode, dx: Int, dy: Int): Boolean =
    node.config.getOrNull(SemanticsActions.ScrollBy)?.action?.invoke(dx.toFloat(), dy.toFloat()) != null
