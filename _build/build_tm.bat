@echo off
if "%1" == "" (
  set backday=1
) else (
  set backday=%1
)
if "%2" == "" (
  set target=tm.html
  set mds=mds
  set title=CardMemo
  set policy=default
) else (
  set target=pv.html
  set mds=mdp
  set title=Person
  set policy=%2
)

set sed=D:\soft\Git\usr\bin\sed.exe
set python=D:\soft\python39\python.exe
cd /d %~dp0
rem update md->mds
%python% md2s.py %backday% %policy%

rem html head and essay
%sed% -ne "1,/^\/\*include_mds_start/p" main.html > %target%
cat %mds%/*.mds >> %target%

rem config for tag translation
echo }var config_txt=`>> %target%
cat config.txt >> %target%
echo `;var config=JSON.parse(config_txt);>> %target%

rem buss/dep js and html body
cat buss.js >> %target%
echo })(this);>> %target%
cat dep.js >> %target%
%sed% -ne "/<\/script>/,$p" main.html >> %target%

rem substitude title
%sed% -i -e "s/$TITLE/%title%/" %target%