package com.fromwau.echo.shared_client.debug

import kotlin.test.Test
import kotlin.test.assertTrue

class UiNodeJsonTest {
    @Test
    fun `serializes node tree to json`() {
        val tree = UiNode(
            id = 1, role = "Button", text = "Records", testTag = null,
            bounds = UiBounds(120f, 64f, 88f, 40f), actions = listOf("OnClick"),
            scrollAxes = listOf("vertical"),
            children = listOf(
                UiNode(
                    2, null, "x", null, UiBounds(0f, 0f, 1f, 1f), emptyList(), emptyList(),
                    editableText = "hi", toggle = "On", children = emptyList(),
                ),
            ),
        )
        val json = uiNodesToJson(listOf(tree))
        assertTrue(json.contains("\"owners\""), json)
        assertTrue(json.contains("\"role\":\"Button\""), json)
        assertTrue(json.contains("\"text\":\"Records\""), json)
        assertTrue(json.contains("\"x\":120"), json)
        assertTrue(json.contains("\"OnClick\""), json)
        assertTrue(json.contains("\"scrollAxes\":[\"vertical\"]"), json)
        assertTrue(json.contains("\"editableText\":\"hi\""), json)
        assertTrue(json.contains("\"toggle\":\"On\""), json)
    }
}
