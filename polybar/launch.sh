#!/bin/bash

config_path="/home/ankitp/.config/polybar"

# Terminate already running bar instances
killall -q polybar

# Wait until the processes have been shut down
while pgrep -x polybar >/dev/null; do sleep 1; done

# Launch helper scripts used by bars
python3 ~/.config/regolith/i3/scripts/autorename.py &

# Launch polybar
if type "xrandr"; then
  for m in $(xrandr --query | grep " connected" | cut -d" " -f1); do
    MONITOR=$m polybar -r -c "${config_path}/top.ini" top &
    MONITOR=$m polybar -r -c "${config_path}/bottom.ini" bottom &
  done
else
    MONITOR=$m polybar -r -c "${config_path}/top.ini" top &
    MONITOR=$m polybar -r -c "${config_path}/bottom.ini" bottom &
fi

