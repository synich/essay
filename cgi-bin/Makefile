#cgi need
#==
#1. shebang #! is right
#2. first output must be "Content-Type: text/html; charset=UTF-8\n"
#
#sdf.org specify
#--
#1. directory ought be 755
#2. *.cgi least be 700
#3. *.cgi belong to synich:nobody
#
#busybox specify
#--
#1. must in *cgi-bin* directory
#2. file least be 700

all: blog tmrec

blog: blog.lua
	@cat len blog.lua > $^.cgi
	@echo "main()" >> $^.cgi
	@chmod 755 $^.cgi
	@mv $^.cgi blog.cgi

tmrec: tmrec.lua
	@cat len tmrec.lua > $^.cgi
	@echo "main()" >> $^.cgi
	@chmod 755 $^.cgi
	@mv $^.cgi tmrec.cgi

cata: cata.lua
	@cat lude $^ > $@.cgi
	@echo "main()" >> $@.cgi
	@chmod 755 $@.cgi

article: article.lua
	@cat lude $^ > $@.cgi
	@echo "main()" >> $@.cgi
	@chmod 755 $@.cgi

dif:
	@diff $(v) ../../cgi-bin/$(v)

rel:
	@cat $(v) >../../cgi-bin/$(v)

ad:
	@termux-fix-shebang *.cgi

