@echo off
if "%1" == "" (
  set backday=1
) else (
  set backday=%1
)
python3 md2html.py %backday%
