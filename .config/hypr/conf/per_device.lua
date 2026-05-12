-- Per-device input overrides. Mirror of conf/per-device.conf.

hl.device({ name = "cx-2.4g-wireless-receiver-keyboard", kb_layout = "us,at" })
hl.device({ name = "cx-2.4g-wireless-receiver",          kb_layout = "us,at" })
hl.device({ name = "at-translated-set-2-keyboard",       kb_layout = "at"    })
hl.device({ name = "logitech-mx-keys",                   kb_layout = "at"    })
hl.device({
    name          = "syna801a:00-06cb:cec6-touchpad",
    sensitivity   = 1.0,
    accel_profile = "adaptive",
})
