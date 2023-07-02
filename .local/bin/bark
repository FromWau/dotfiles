#!/usr/bin/python3

import os
os.environ["SUNO_OFFLOAD_CPU"] = "True"
os.environ["SUNO_USE_SMALL_MODELS"] = "True"

import argparse
import subprocess
from bark import SAMPLE_RATE, generate_audio, preload_models
from scipy.io.wavfile import write as write_wav

parser = argparse.ArgumentParser(description='Generate audio from text using Bark')
parser.add_argument('text_prompt', type=str, help='Text prompt for audio generation')
parser.add_argument('-hp', '--history_prompt', type=str, default='v2/en_speaker_9', help='History prompt for audio generation')
parser.add_argument('-sr', '--sample_rate', type=int, default=SAMPLE_RATE, help='Sample rate for the output audio file')
parser.add_argument('-o', '--output_file', type=str, default=None, help='Output file name')

args = parser.parse_args()

# Download and load all models
preload_models()

audio_array = generate_audio(args.text_prompt, history_prompt=args.history_prompt)

if args.output_file:
    write_wav(args.output_file, args.sample_rate, audio_array)
else:
    temp_file = '/tmp/temp-output.wav'
    write_wav(temp_file, args.sample_rate, audio_array)

    subprocess.run(['mpv', temp_file])

    os.remove(temp_file)
