package com.fromwau.echo.shared_client.debug

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class UiBounds(val x: Float, val y: Float, val width: Float, val height: Float)

/** A node in the dumped UI layout (built from the Compose semantics tree). */
@Serializable
data class UiNode(
    val id: Int,
    val role: String?,
    val text: String?,
    val testTag: String?,
    val bounds: UiBounds,
    val actions: List<String>,
    /** Scroll axes this node can scroll on: "vertical" and/or "horizontal" (empty if not scrollable). */
    val scrollAxes: List<String>,
    /** Current value of an editable field (BasicTextField/TextField), if any. */
    val editableText: String? = null,
    /** Checkbox/switch state: "On" | "Off" | "Indeterminate", if toggleable. */
    val toggle: String? = null,
    /** Selection state for selectable items (tabs, list rows), if applicable. */
    val selected: Boolean? = null,
    /** False only when the node is explicitly marked disabled. */
    val enabled: Boolean = true,
    val children: List<UiNode>,
)

@Serializable
private data class UiDump(val owners: List<UiNode>)

private val harnessJson = Json { encodeDefaults = true }

/** Serialize one tree per semantics owner into the `/layout` JSON payload. */
fun uiNodesToJson(owners: List<UiNode>): String = harnessJson.encodeToString(UiDump(owners))
