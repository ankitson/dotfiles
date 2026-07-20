import os
import subprocess
import argparse

def extract_nv_audio(input_file):
    # Make sure the file exists before trying to process it
    if not os.path.isfile(input_file):
        print(f"Error: Could not find '{input_file}'")
        return

    # Automatically generate output names (e.g., "gameplay_speaker.mp3")
    base_name = os.path.splitext(input_file)[0]
    speaker_out = f"{base_name}_speaker.mp3"
    mic_out = f"{base_name}_mic.mp3"

    # Build the ffmpeg command exactly as if typing it in the terminal
    command = [
        "ffmpeg",
        "-i", input_file,
        "-map", "0:a:0",
        "-q:a", "2", speaker_out,
        "-map", "0:a:1",
        "-q:a", "2", mic_out,
        "-y"  # Automatically overwrite existing files without prompting
    ]

    print(f"Extracting audio from '{input_file}'...")
    
    try:
        # Run ffmpeg. We suppress the massive wall of text ffmpeg usually outputs 
        # to keep the terminal clean, but will catch errors if it fails.
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        print("Success! Created:")
        print(f"  🔊 {speaker_out}")
        print(f"  🎤 {mic_out}")
        
    except FileNotFoundError:
        print("Error: 'ffmpeg' is not recognized. Make sure it is installed and added to your Windows PATH.")
    except subprocess.CalledProcessError:
        print(f"Error: FFmpeg failed to process '{input_file}'. Ensure the file has two audio tracks.")

if __name__ == "__main__":
    # Set up command-line arguments so the script is easily reusable
    parser = argparse.ArgumentParser(description="Extract NVIDIA recording audio tracks to MP3.")
    parser.add_argument("video_file", help="Path to the MP4 file")
    
    args = parser.parse_args()
    extract_nv_audio(args.video_file)
