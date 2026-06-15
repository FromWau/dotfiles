package com.fromwau.echo.shared_client.debug

import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull

/** Convert a Compose [SemanticsNode] subtree into the serializable [UiNode] the harness emits. */
fun SemanticsNode.toUiNode(): UiNode {
    val cfg = config
    val b = boundsInWindow
    val role = cfg.getOrNull(SemanticsProperties.Role)?.toString()
    val text = cfg.getOrNull(SemanticsProperties.Text)?.joinToString(" ") { it.text }
        ?: cfg.getOrNull(SemanticsProperties.ContentDescription)?.joinToString(" ")
    val testTag = cfg.getOrNull(SemanticsProperties.TestTag)
    val actions = buildList {
        if (cfg.getOrNull(SemanticsActions.OnClick) != null) add("OnClick")
        if (cfg.getOrNull(SemanticsActions.OnLongClick) != null) add("OnLongClick")
        if (cfg.getOrNull(SemanticsActions.SetText) != null) add("SetText")
        if (cfg.getOrNull(SemanticsActions.ScrollBy) != null) add("ScrollBy")
    }
    val scrollAxes = buildList {
        if (cfg.getOrNull(SemanticsProperties.VerticalScrollAxisRange) != null) add("vertical")
        if (cfg.getOrNull(SemanticsProperties.HorizontalScrollAxisRange) != null) add("horizontal")
    }
    return UiNode(
        id = id,
        role = role,
        text = text,
        testTag = testTag,
        bounds = UiBounds(b.left, b.top, b.width, b.height),
        actions = actions,
        scrollAxes = scrollAxes,
        editableText = cfg.getOrNull(SemanticsProperties.EditableText)?.text,
        toggle = cfg.getOrNull(SemanticsProperties.ToggleableState)?.name,
        selected = cfg.getOrNull(SemanticsProperties.Selected),
        enabled = cfg.getOrNull(SemanticsProperties.Disabled) == null,
        children = children.map { it.toUiNode() },
    )
}
