import subprocess
import json
import sys
import time

proc = subprocess.Popen(
    ['powershell.exe', '-Command', 'npx @tmegit/figma-developer-mcp --json'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    cwd=r'c:\Users\Asus\Desktop\hermes-webui-figma'
)

time.sleep(3)

# Check if there's any output
import select
print("Checking stdout...", file=sys.stderr)

# Try reading line by line
for i in range(5):
    line = proc.stdout.readline()
    print(f"Line {i}: {repr(line)}", file=sys.stderr)
    if line.strip():
        try:
            data = json.loads(line)
            print(f"JSON: {data}", file=sys.stderr)
        except:
            pass

proc.terminate()
