#!/usr/bin/env bash

test lspci || {
	echo "lspci is not installed"
	exit 1
}

function write_file_content() {
	file=$1
	content=$2
	content_file=$(cat "$file" 2>/dev/null)

	if [ "$content_file" == "$content" ]; then
		echo "$file content is already set"
		exit 1
	fi

	notify-send "Setting up GPU specific environment variables"

	[[ ! -f "$file" ]] && mkdir -p "$(dirname "$file")"
	echo "$content" >"$file"
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

	file=~/.config/hypr/conf/env/env-nvidia.conf
	content=$(
		cat <<EOF
## NVIDIA Specific
### To force GBM as a backend, set the following environment variables:

env = GBM_BACKEND,nvidia-drm
env = __GLX_VENDOR_LIBRARY_NAME,nvidia
### See Archwiki Wayland Page for more details on those variables.

env = LIBVA_DRIVER_NAME,nvidia #Hardware acceleration on NVIDIA GPUs
### See Archwiki Hardware Acceleration Page for details and necessary values before setting this variable.

#__GL_GSYNC_ALLOWED #Controls if G-Sync capable monitors should use Variable Refresh Rate (VRR)
### See Nvidia Documentation for details.

#__GL_VRR_ALLOWED #Controls if Adaptive Sync should be used. Recommended to set as “0” to avoid having problems on some games

env = WLR_DRM_NO_ATOMIC,1 #use legacy DRM interface instead of atomic mode setting. Might fix flickering issues.
EOF
	)

	write_file_content "$file" "$content"
fi
