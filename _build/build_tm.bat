@echo off
echo lookback[default-1] policy[default-1]
if "%1" == "" (
  set backday=1
) else (
  set backday=%1
)
if "%2" == "" (
  set policy=1
) else (
  set policy=%2
)

set sed=D:\soft\Git\usr\bin\sed.exe
set python=D:\soft\python39\python.exe
set target=tm%policy%.html
set mds=mds%policy%


cd /d %~dp0
rem update md->mds
%python% md2s.py %backday% %policy%

rem html head and essay
%sed% -ne "1,/^\/\*include_mds_start/p" main.html > %target%
cat %mds%/*.mds >> %target%

rem config for tag translation
echo }var config_txt=`>> %target%
cat config%policy%.txt >> %target%
echo `;var config=JSON.parse(config_txt);>> %target%

rem buss/dep js and html body
cat buss.js >> %target%
echo })(this);>> %target%
cat dep.js >> %target%
%sed% -ne "/<\/script>/,$p" main.html >> %target%

for /f %%D in ('date /T') do (
  %sed% -i -e "s=$GEN_DATE=%%D=" %target%
)