echo "lookback[default-1] policy[default-1]"
if [ "$1" = "" ]; then
  backday=1
else
  backday=$1
fi
if [ "$2" = "" ]; then
  policy=1
else
  policy=$2
fi

sed=sed
python=python3.9
target=tm$policy.html
mds=mds$policy
if [ $policy = 1 ]; then
  title=Compute
elif [ $policy = 2 ]; then
  title=Liberal
else
  title=Unknown
fi

# cd /d %~dp0
# update md->mds
$python md2s.py $backday $policy

# html head and essay
$sed -ne "1,/^\/\*include_mds_start/p" main.html > $target
cat $mds/*.mds >> $target

# config for tag translation
echo "}var config_txt=\`" >> $target
cat config.txt >> $target
echo "\`;var config=JSON.parse(config_txt);" >> $target

# buss/dep js and html body
cat buss.js >> $target
echo "})(this);" >> $target
cat dep.js >> $target
$sed -ne "/<\/script>/,\$p" main.html >> $target

# substitude title
$sed -i -e "s/\$TITLE/$title/" $target
gd=`date +%C%y/%m/%d`
$sed -i -e "s=\$GEN_DATE=$gd=" $target
