#Requires AutoHotkey v2.0
#SingleInstance Force
DetectHiddenWindows true

WezGui := "C:\Program Files\WezTerm\wezterm-gui.exe"  ; <-- adjust if needed
global PrevHwnd := 0

IsGoodPrev(hwnd) {
  ; must be a non-zero integer window handle and must still exist
  return (hwnd != 0) && (hwnd != "") && WinExist("ahk_id " hwnd)
}

RememberForeground() {
  global PrevHwnd
  try {
    hwnd := WinGetID("A")
    cls := WinGetClass("ahk_id " hwnd)
    ; ignore desktop/taskbar/shell surfaces
    if (hwnd && cls != "Progman" && cls != "WorkerW" && cls != "Shell_TrayWnd") {
      PrevHwnd := hwnd
    }
  }
}

RestoreForeground() {
  global PrevHwnd
  ; Try restoring previous window; if it fails, just return
  try {
    if (IsGoodPrev(PrevHwnd)) {
      WinActivate("ahk_id " PrevHwnd)
      return
    }
  }

  ; Fallback: try taskbar (often safe); if it fails, do nothing
  try WinActivate("ahk_class Shell_TrayWnd")
}

ShowWezTerm() {
  ; remember what was focused BEFORE showing wezterm
  RememberForeground()

  hwnds := WinGetList("ahk_exe wezterm-gui.exe")
  if (hwnds.Length) {
    WinShow("ahk_id " hwnds[1])
    WinActivate("ahk_id " hwnds[1])
  } else {
    Run('"' WezGui '"')
  }
}

HideWezTerm() {
  for hwnd in WinGetList("ahk_exe wezterm-gui.exe")
    WinHide("ahk_id " hwnd)

  RestoreForeground()
}

ToggleWezTerm(*) {
  if !FileExist(WezGui) {
    MsgBox("Can't find: " WezGui)
    return
  }

  if WinExist("ahk_exe wezterm-gui.exe") {
    if WinActive("ahk_exe wezterm-gui.exe") {
      HideWezTerm()
    } else {
      ShowWezTerm()
    }
  } else {
    Run('"' WezGui '"')
  }
}

; Hotkey: Win + ` (scancode for the grave/backtick key)
^sc029::ToggleWezTerm()
