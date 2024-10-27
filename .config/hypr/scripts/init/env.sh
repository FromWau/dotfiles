#!/usr/bin/env bash

test lspci || {
	echo "lspci is not installed"
	exit 1
}

function write() {
	~/.config/hypr/scripts/utils/update_file.sh "$1" "$2"
}

lspci | rg VGA | rg -i intel >/dev/null
hasIntelGPU=$?

lspci | rg VGA | rg -i nvidia >/dev/null
hasNvidiaGPU=$?

lspci | rg VGA | rg -i amd >/dev/null
hasAMDGPU=$?

if [ "$hasIntelGPU" -eq 1 ] && [ "$hasNvidiaGPU" -eq 1 ] && [ "$hasAMDGPU" -eq 1 ]; then
	echo "Unknown GPU detected"
	exit 1
fi

if [ $hasIntelGPU -eq 0 ]; then
	echo "Intel GPU detected"
	echo "No additional settings needed"
fi

if [ $hasAMDGPU -eq 0 ]; then
	echo "AMD GPU detected"
	echo "No additional settings needed"
fi

if [ $hasNvidiaGPU -eq 0 ]; then
	echo "Nvidia GPU detected"

	file=env/env-nvidia.conf
	content=$(
		cat <<EOF
## NVIDIA Specific
### https://wiki.hyprland.org/Nvidia/#environment-variables

env = LIBVA_DRIVER_NAME,nvidia
env = XDG_SESSION_TYPE,wayland
env = GBM_BACKEND,nvidia-drm
env = __GLX_VENDOR_LIBRARY_NAME,nvidia
env = NVD_BACKEND,direct

cursor {
    no_hardware_cursors = true
}
EOF
	)

	write "$file" "$content"
fi
