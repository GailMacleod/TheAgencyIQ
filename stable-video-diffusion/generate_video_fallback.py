#!/usr/bin/env python3
"""
Fallback Video Generation Script
Creates mock 30-second ASMR videos when full dependencies are unavailable
"""

import os
import sys
import argparse
import json
from pathlib import Path

def create_mock_video(output_path, duration=30):
    """Create a mock video file with metadata"""
    try:
        # Create directory if it doesn't exist
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Try to create a proper video using FFmpeg
        import subprocess
        
        try:
            # Create a simple video with moving elements to ensure it's visible
            ffmpeg_cmd = [
                'ffmpeg', '-y',  # -y to overwrite existing files
                '-f', 'lavfi',   # Use lavfi input
                '-i', f'testsrc=size=1920x1080:duration={duration}:rate=30',  # Test pattern with movement
                '-c:v', 'libx264',  # H.264 codec
                '-pix_fmt', 'yuv420p',  # Compatible pixel format
                '-preset', 'ultrafast',  # Fast encoding
                '-crf', '28',  # Lower quality for smaller file
                output_path
            ]
            
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                print(f"FFmpeg video created successfully: {output_path}")
            else:
                raise Exception("FFmpeg failed")
                
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
            print(f"FFmpeg not available or failed: {e}, creating minimal MP4...")
            # Fallback to minimal MP4 file
            with open(output_path, 'wb') as f:
                # Write minimal but more complete MP4 structure
                f.write(b'\x00\x00\x00\x20ftypmp41\x00\x00\x00\x00mp41isom\x00\x00\x00\x08free')
        
        # Create metadata file
        metadata = {
            "duration": duration,
            "resolution": "1920x1080",
            "aspectRatio": "16:9",
            "fileSize": os.path.getsize(output_path),
            "generated": True,
            "fallback": True,
            "note": "Mock video generated due to missing dependencies"
        }
        
        metadata_path = output_path.replace('.mp4', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Mock video created: {output_path}")
        print(f"Metadata saved: {metadata_path}")
        return True
        
    except Exception as e:
        print(f"Error creating mock video: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Fallback Video Generation')
    parser.add_argument('--prompt', required=True, help='Video prompt')
    parser.add_argument('--output', required=True, help='Output video path')
    parser.add_argument('--duration', type=int, default=30, help='Video duration in seconds')
    parser.add_argument('--asmr', action='store_true', help='ASMR style video')
    parser.add_argument('--short', action='store_true', help='Short-form video')
    
    args = parser.parse_args()
    
    print(f"Generating fallback video for prompt: {args.prompt}")
    print(f"Output: {args.output}")
    print(f"Duration: {args.duration} seconds")
    
    if create_mock_video(args.output, args.duration):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()