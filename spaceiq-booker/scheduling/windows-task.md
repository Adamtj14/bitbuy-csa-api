# Windows Task Scheduler setup

Run the booker every weekday morning on Windows.

## Option A — PowerShell one-liner (recommended)

Open PowerShell and adjust the paths, then run:

```powershell
$node = "C:\Program Files\nodejs\node.exe"
$proj = "C:\path\to\spaceiq-booker"

$action  = New-ScheduledTaskAction -Execute $node -Argument "src\index.js book" -WorkingDirectory $proj
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At 8:05am
# Run even if the machine was asleep at the scheduled time:
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun

Register-ScheduledTask -TaskName "SpaceIQ Booker" -Action $action -Trigger $trigger -Settings $settings -Description "Books my SpaceIQ seat on recurring weekdays"
```

Set `SPACEIQ_HEADED=0` as a system environment variable for a silent run, or
leave it unset to watch the browser.

## Option B — GUI

1. Open **Task Scheduler** → **Create Task**.
2. **Triggers** → New → Weekly → Mon–Fri → 8:05 AM.
3. **Actions** → New → Program: your `node.exe` path; Arguments: `src\index.js book`;
   Start in: the `spaceiq-booker` folder.
4. **Settings** → check *Run task as soon as possible after a scheduled start is missed*
   and *Wake the computer to run this task*.

## Verifying

```powershell
Start-ScheduledTask -TaskName "SpaceIQ Booker"   # run it now
Get-Content C:\path\to\spaceiq-booker\booker.log -Tail 20
```
