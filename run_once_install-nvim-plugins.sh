#!/bin/bash
# Install nvim plugins via vim-plug
if command -v nvim &>/dev/null; then
  nvim --headless +PlugInstall +qall 2>/dev/null
fi
