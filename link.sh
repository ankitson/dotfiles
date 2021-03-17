#!/bin/bash

set -x
set -e

#tmux
if [[ -f "~/.tmux.conf" ]]; then
  mv ~/.tmux.conf ~/.tmux.conf.old
fi
ln -sr ./.tmux.conf ~/.tmux.conf

#nvim
mkdir -p ~/.config/nvim/
mkdir -p ~/.local/share/nvim/site/pack/git-plugins/start/
ln -sr ./nvim/init.vim ~/.config/nvim/init.vim
ln -sr ./nvim/autoload ~/.config/nvim/autoload
cp ./vim-plug/plug.vim ./nvim/autoload/

#git
ln -sr ./.gitconfig ~/.gitconfig

#sqlite
ln -sr ./.sqliterc ~/.sqliterc

#bash
if [[ -f "~/.bashrc" ]]; then
  rm ~/.bashrc
fi
ln -sr ./.bashrc ~/.bashrc
ln -sr ./.alias.sh ~/.alias.sh

#ohmyzsh
#rm ~/.zshrc
#ln -sr ./.zshrc ~/.zshrc
#ln -sr ./custom.zsh-theme ~/.oh-my-zsh/themes/custom.zsh-theme
