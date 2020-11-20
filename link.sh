#!/bin/bash

set -x
set -e

#tmux
ln -sr ./.tmux.conf ~/.tmux.conf

#nvim
mkdir -p ~/.config/nvim/
mkdir -p ~/.local/share/nvim/site/pack/git-plugins/start/
ln -sr ./nvim/init.vim ~/.config/nvim/init.vim
ln -sr ./nvim/autoload ~/.config/nvim/autoload
cp ./vim-plug/plug.vim ./nvim/autoload/

#git
ln -sr ./.gitconfig ~/.gitconfig

#ohmyzsh
rm ~/.zshrc
ln -sr ./.zshrc ~/.zshrc
ln -sr ./custom.zsh-theme ~/.oh-my-zsh/themes/custom.zsh-theme
