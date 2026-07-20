#!/usr/bin/env pwsh
# Wrapper: invoke extract-audio.py via uv
uv run "$PSScriptRoot\extract-audio.py" @args
