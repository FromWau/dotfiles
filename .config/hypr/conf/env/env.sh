#!/usr/bin/env bash

test lspci || {
	echo "lspci is not installed"
	exit 1
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

	cat <<EOF >~/.config/hypr/config/env-nvidia.conf
## NVIDIA Specific
### To force GBM as a backend, set the following environment variables:

env = GBM_BACKEND,nvidia-drm
env = __GLX_VENDOR_LIBRARY_NAME,nvidia
### See Archwiki Wayland Page for more details on those variables.

env = LIBVA_DRIVER_NAME,nvidia #Hardware acceleration on NVIDIA GPUs
### See Archwiki Hardware Acceleration Page for details and necessary values before setting this variable.

#__GL_GSYNC_ALLOWED #Controls if G-Sync capable monitors should use Variable Refresh Rate (VRR)
### See Nvidia Documentation for details.

#__GL_VRR_ALLOWED #Controls if Adaptive Sync should be used. Recommended to set as “0” to avoid having problems on some games.

env = WLR_DRM_NO_ATOMIC,1 #use legacy DRM interface instead of atomic mode setting. Might fix flickering issues.
EOF
fi
