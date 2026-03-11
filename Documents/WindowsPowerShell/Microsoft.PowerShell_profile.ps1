function wake-desktop {
  C:\Users\ankit\Documents\dev\bin\WakeMeOnLan.exe /wakeup desktop-linux
}

function ssh-desktop {
    # 1. Send the Wake-on-LAN packet by calling your other function
    Write-Host "🚀 Sending Wake-on-LAN packet to desktop..."
    wake-desktop

    # 2. Wait for the machine to boot up (adjust seconds if needed)
    #Write-Host "⏳ Waiting 7 seconds for the system to boot..."
    #Start-Sleep -Seconds 7

    # 3. Connect via SSH
    Write-Host "🛰️ Connecting via SSH..."
    ssh desktop
}

$addPaths = @(
  "C:\Program Files\Git\mingw64\bin",
  "C:\Users\ankit\Documents\dev\bin",
  "C:\Users\ankit\AppData\Local\nvm",
  "C:\Program Files\mpv\",
  "C:\Users\ankit\.local\bin\"
)
foreach ($p in $addPaths) {
  if (-not ($env:Path -split ';' | Where-Object { $_ -ieq $p })) {
    $env:Path = "$env:Path;$p"
  }
}
