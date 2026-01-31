#!/bin/bash
# Install tmux plugins via tpm (after .chezmoiexternal has fetched tpm)
if [ -x "$HOME/.tmux/plugins/tpm/bin/install_plugins" ]; then
  "$HOME/.tmux/plugins/tpm/bin/install_plugins"
fi
